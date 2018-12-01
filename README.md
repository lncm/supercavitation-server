# Supercavitation Server

## API

```javascript
// TODO add signatures bi-directional 
// TODO errors

// GET /info 
// -> 
{
  text,
  timeLockBlocks,
  reward,
  minAmount,
  depositFee,
  exchangeRate,
  version,
}

// POST /swap/new
// <-
{
  customer: '0xAlice',
  contract: '0xContract',
  amount: '123131233',
}
// -> 
{
  paymentInvoice: '...', // optional; alice might be whitelisted
  depositInvoice: '...', // the preImageHash + other payment info is inferred client side
}

// GET /swap/status
// <-
{
  preImageHash: '...', // always in hex
}
// ->
{
  creationTxId: '',
  completedTxId: '',
}
```

## Post-Hackathon TODOs 

- Create new Documented API
 - Use POST for everything
 - Always pass around a hex version of the preimage(?)
 - Sign stuff
 - Accept contract address
- Implement new API
- Tests
- Fix the subscription System
- Improve the config file
- Write Docs

## Post-Post Hackathon TODOs

- Handle invoice timeouts
- Gracefully handle restarts
- Persistant storage

## LND Start

```
docker stop lndt
docker rm `docker ps --no-trunc -aq`
docker create --net host --name lndt lightninglabs/lnd --bitcoin.active --bitcoin.testnet --bitcoin.node=neutrino --neutrino.connect=faucet.lightning.community --noseedbackup
docker start lndt
docker logs lndt -f
```