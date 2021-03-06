# Internet access micro-payments state channel

*Solidity smart contract handling a one-directionl micro-payment
state channel allowing wireless internet access service.*

## Ropsten deployment

[0x41b301c0b0abbfeef99803c23a281712e29b6ef1](https://ropsten.etherscan.io/address/0x41b301c0b0abbfeef99803c23a281712e29b6ef1)

## Recommended virtual environment and dependencies

Using a local [nodeenv](https://github.com/ekalinin/nodeenv) in the repository root directory:

```
$ sudo pip install nodeenv
$ nodeenv --node 10.15.1 venv
$ source venv/bin/activate
(venv) $ npm install
```

## Scripts

### Deploy

Using [Ganache CLI](https://github.com/trufflesuite/ganache-cli) and a valid mnemonic
for testing purposes:

```
(venv) $ npx ganache-cli --mnemonic '<12 words BIP39 mnemonic>' -h 0.0.0.0 -g 0 -a 10 -b 15
```
After that, copy sample configuration file `.env.sample` to `.env`
and edit configuration according your mnemonic; keep contract address
`undefined`.

```
(venv) $ cp .env.sample .env
```

After that, deploy the smart contracts running:

```
(venv) $ npm run deploy
```

### Test

```
(venv) $ npm run test
```

### Lint

```
(venv) $ npm run lint
```

### Lint & test

```
(venv) $ npm run lintandtest
```
### Deploy, lint & test

```
(venv) $ npm run deploylintandtest
```

### Continuous integration

This will run an `inotifywait` command watching contracts and tests source
files triggering, deploy, lint and test script on any update.

```
(venv) $ npm run ci
```
