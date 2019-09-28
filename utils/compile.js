require('dotenv').config()

const SOLC = require('solc')
const PATH = require('path')
const FS = require('fs')

const SC_PATH = PATH.resolve(__dirname, process.env.CONTRACT_PATH, 'StateChannel.sol')
const SC_SRC = FS.readFileSync(SC_PATH, 'utf-8')
const SAFE_MATH_PATH = PATH.resolve(__dirname, process.env.CONTRACT_PATH, 'SafeMath.sol')
const SAFE_MATH_SRC = FS.readFileSync(SAFE_MATH_PATH, 'utf-8')
const OWNABLE_PATH = PATH.resolve(__dirname, process.env.CONTRACT_PATH, 'Ownable.sol')
const OWNABLE_SRC = FS.readFileSync(OWNABLE_PATH, 'utf-8')
const ECDSA_PATH = PATH.resolve(__dirname, process.env.CONTRACT_PATH, 'ECDSA.sol')
const ECDSA_SRC = FS.readFileSync(ECDSA_PATH, 'utf-8')

const generateSource = () => {
  const init = OWNABLE_SRC + '\n' + ECDSA_SRC + '\n' + SC_SRC
  let src = ''
  init.split('\n').forEach(
    (x) => {
      if (!x.match(/import/) && !x.match(/pragma/)) {
        src += x + '\n'
      }
    })
  return SAFE_MATH_SRC + '\n' + src
}

const showErrors = (compilation) => {
  const errors = JSON.parse(compilation).errors
  if (errors) {
    console.log(`${errors.length} errors found`)
    for (let i = 0; i < errors.length; i++) {
      console.log(errors[i].formattedMessage)
    }
  } else {
    console.log('Compilation OK')
  }
}

const CONFIG = {
  language: 'Solidity',
  sources: {
    StateChannel: { content: generateSource() }
  },
  settings: {
    outputSelection: {
      '*': { '*': ['*'] }
    }
  }
}

const COMPILATION = SOLC.compile(JSON.stringify(CONFIG))
showErrors(COMPILATION)
const CONTRACTS = JSON.parse(COMPILATION).contracts

module.exports = { contracts: CONTRACTS }
