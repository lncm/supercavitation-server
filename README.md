# Supercavitation Server

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


## LND Start

```
docker stop lndt
docker rm `docker ps --no-trunc -aq`
docker create --net host --name lndt lightninglabs/lnd --bitcoin.active --bitcoin.testnet --bitcoin.node=neutrino --neutrino.connect=faucet.lightning.community --noseedbackup
docker start lndt
docker logs lndt -f
```