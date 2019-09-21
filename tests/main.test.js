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
})
