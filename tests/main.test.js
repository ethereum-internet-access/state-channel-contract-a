require('dotenv').config()

const CHAI = require('chai')
CHAI.should()

const WEB3_API = require('web3')
const WEB3 = new WEB3_API(`http://127.0.0.1:${process.env.GANACHE_PORT}`, null)
const FS = require('fs')

const TIME_TRAVEL = (time) => {
  return new Promise((resolve, reject) => {
    WEB3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [time],
      id: new Date().getTime()
    }, (err, result) => {
      if (err) { return reject(err) }
      return resolve(result)
    })
  })
}

let CURRENT_CHANNEL_ID
let FIRST_USER_EPHEMERAL

describe('State channel contract tests', function () {
  it('Smart contract symbol should equal StateChannel', async () => {
    const abi = JSON.parse(FS.readFileSync('./contracts/abi.json', 'utf-8'))
    const contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ADDRESS)
    const accounts = await WEB3.eth.getAccounts()
    accounts[0].should.be.a('string')
    const symbol = await contract.methods.name().call()
    symbol.should.be.a('string')
    symbol.should.equal('StateChannel')
  })

  it('Should allow a user to open a channel', async () => {
    const abi = JSON.parse(FS.readFileSync('./contracts/abi.json', 'utf-8'))
    const contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ADDRESS)
    const accounts = await WEB3.eth.getAccounts()
    const previousUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    const previousContractBalance = BigInt(await WEB3.eth.getBalance(process.env.CONTRACT_ADDRESS))
    const gasPrice = BigInt(await WEB3.eth.getGasPrice())
    const amount = '3000000000000000'
    FIRST_USER_EPHEMERAL = WEB3.eth.accounts.create()
    const receipt = await contract.methods.openChannel(FIRST_USER_EPHEMERAL.address).send(
      { from: accounts[1], value: amount, gas: '1000000' })
    const cumulativeGasUsed = BigInt(receipt.cumulativeGasUsed)
    const finalUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    const finalContractBalance = BigInt(await WEB3.eth.getBalance(process.env.CONTRACT_ADDRESS))
    if (finalContractBalance !== previousContractBalance + BigInt(amount)) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current contract balance does not match previous one plus amount')
    }
    if (finalUserBalance !== previousUserBalance - BigInt(amount) - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current user balance does not match previous one minus amount and fee')
    }
    receipt.events.ChannelOpened.returnValues.should.have.property('payer')
    receipt.events.ChannelOpened.returnValues.should.have.property('channelId')
    CURRENT_CHANNEL_ID = receipt.events.ChannelOpened.returnValues.channelId
    receipt.events.ChannelOpened.returnValues.should.have.property('depositAmount')
    receipt.events.ChannelOpened.returnValues.payer.should.equal(accounts[1])
    receipt.events.ChannelOpened.returnValues.depositAmount.should.equal(amount)
  })

  it('Should allow a user to generate a signature and owner close the channel', async () => {
    const abi = JSON.parse(FS.readFileSync('./contracts/abi.json', 'utf-8'))
    const contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ADDRESS)
    const accounts = await WEB3.eth.getAccounts()
    const amount = '2000000000000000'
    const hash = WEB3.utils.soliditySha3(
      { t: 'address', v: process.env.CONTRACT_ADDRESS },
      { t: 'uint256', v: amount },
      { t: 'uint256', v: CURRENT_CHANNEL_ID })
    const signature = await WEB3.eth.accounts.sign(hash, FIRST_USER_EPHEMERAL.privateKey)
    const previousUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    const previousContractBalance = BigInt(await WEB3.eth.getBalance(process.env.CONTRACT_ADDRESS))
    const previousOwnerBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    const gasPrice = BigInt(await WEB3.eth.getGasPrice())
    const receipt = await contract.methods.closeChannel(amount, CURRENT_CHANNEL_ID, signature.signature).send(
      { from: accounts[0], gas: '1000000' })
    receipt.events.ChannelClosed.returnValues.should.have.property('channelId')
    const finalUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    const finalContractBalance = BigInt(await WEB3.eth.getBalance(process.env.CONTRACT_ADDRESS))
    const finalOwnerBalance = BigInt(await WEB3.eth.getBalance(accounts[0]))
    const gasCost = BigInt(receipt.cumulativeGasUsed) * gasPrice
    if (finalOwnerBalance !== previousOwnerBalance + BigInt(amount) - gasCost) {
      throw new Error('Final owner balance does not match previous one plus signed amount')
    }
    // Next to assertions should be improved: they only work properly when just the fisrt channel has been opened after contract deployment
    // if (finalUserBalance !== previousUserBalance + previousContractBalance - BigInt(amount)) {
    //   throw new Error('Current user balance does not match previous one plus return')
    // }
    // if (finalContractBalance !== BigInt(0)) {
    //   throw new Error('Contract balance is not null and it should be')
    // }
  })

  it('Should allow a user to claim funds when channel remains open after expiration time', async () => {
    const abi = JSON.parse(FS.readFileSync('./contracts/abi.json', 'utf-8'))
    const contract = new WEB3.eth.Contract(abi, process.env.CONTRACT_ADDRESS)
    const accounts = await WEB3.eth.getAccounts()
    const previousUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    const previousContractBalance = BigInt(await WEB3.eth.getBalance(process.env.CONTRACT_ADDRESS))
    // const pricePerSecond = await contract.methods.pricePerSecond().send(
    //   { from: accounts[1], value: 0, gas: '1000000' })
    // const expirationMargin = 301
    const gasPrice = BigInt(await WEB3.eth.getGasPrice())
    const amount = '3000000000000000'
    FIRST_USER_EPHEMERAL = WEB3.eth.accounts.create()
    const receiptOpen = await contract.methods.openChannel(FIRST_USER_EPHEMERAL.address).send(
      { from: accounts[1], value: amount, gas: '1000000' })
    let cumulativeGasUsed = BigInt(receiptOpen.cumulativeGasUsed)
    CURRENT_CHANNEL_ID = receiptOpen.events.ChannelOpened.returnValues.channelId
    // await TIME_TRAVEL(3000000000000000 / pricePerSecond + expirationMargin)
    await TIME_TRAVEL(3 * 3600 + 301)
    const receiptClaim = await contract.methods.claimTimeout(CURRENT_CHANNEL_ID).send(
      { from: accounts[1], value: 0, gas: '1000000' })
    cumulativeGasUsed += BigInt(receiptClaim.cumulativeGasUsed)
    const finalUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    const finalContractBalance = BigInt(await WEB3.eth.getBalance(process.env.CONTRACT_ADDRESS))
    if (finalContractBalance !== previousContractBalance) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current contract balance does not match previous one')
    }
    if (finalUserBalance !== previousUserBalance - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current user balance does not match previous one minus fee')
    }
    receiptClaim.events.ChannelExpired.returnValues.should.have.property('payer')
    receiptClaim.events.ChannelExpired.returnValues.should.have.property('channelId')
    receiptClaim.events.ChannelExpired.returnValues.should.have.property('refundedAmount')
    receiptClaim.events.ChannelExpired.returnValues.payer.should.equal(accounts[1])
    receiptClaim.events.ChannelExpired.returnValues.refundedAmount.should.equal(amount)
  })
})