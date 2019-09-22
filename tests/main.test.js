require('dotenv').config()

const CHAI = require('chai')
CHAI.should()

const WEB3_API = require('web3')
const WEB3 = new WEB3_API(`http://127.0.0.1:${process.env.GANACHE_PORT}`, null)
const FS = require('fs')

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
    const receipt = await contract.methods.openChannel().send(
      { from: accounts[1], value: amount, gas: '1000000' })
    const cumulativeGasUsed = BigInt(receipt.cumulativeGasUsed)
    const finalUserBalance = BigInt(await WEB3.eth.getBalance(accounts[1]))
    const finalContractBalance = BigInt(await WEB3.eth.getBalance(process.env.CONTRACT_ADDRESS))
    if (finalContractBalance !== previousContractBalance + BigInt(amount)) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current contract balance does not match previous one minus fee')
    }
    if (finalUserBalance !== previousUserBalance - BigInt(amount) - gasPrice * cumulativeGasUsed) {
      // Due to https://github.com/chaijs/chai/issues/1195 ... chai cannot be used for this
      throw new Error('Current user balance does not match previous one minus fee')
    }
    receipt.events.ChannelOpened.returnValues.should.have.property('payer')
    receipt.events.ChannelOpened.returnValues.should.have.property('channelId')
    receipt.events.ChannelOpened.returnValues.should.have.property('depositAmount')
    receipt.events.ChannelOpened.returnValues.payer.should.equal(accounts[1])
    receipt.events.ChannelOpened.returnValues.depositAmount.should.equal(amount)
  })
})
