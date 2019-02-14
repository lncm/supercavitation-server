# Supercavitation Server

** TECHNICAL DEMO ONLY DO NOT USE FOR SIGNIFICANT VALUE **

This is the server component of the [Supercavitations Swaps](https://github.com/lncm/supercavitation-swaps) service.

It's a node app that:

* Runs a web service (communicating with UI)
* Generates invoices (communicating with LND)
* Creates swaps (communicating with EVM)

## Usage

### Prerequisites

* An LND node (at `localhost:10009` by default, or see `config.js`)
* A mnemonic that derives to an RSK address with value ('owner')
* A deployed SwapOffering contract (owned by owner, with server URL set)
* Some proxy server configured serve from the URL set in the contract to the server port (8081)

### Install

* Clone this repo
* `npm i`

### Configure

* Condfigure `src/config.js` to your liking
* Populate the `creds` folder:  
  * `admin.macaroon` from LND
  * `tls.cert` from LND
  * `mnemonic` containing RSK seed for 'owner'

### Run

* `npm start` production
* `npm run dev` development with reloading
* `GANACHE=1 npm run dev` for offline development (ganache + mock LND)


## Docker

```bash
git clone -b docker git@github.com:lncm/supercavitation-server.git
cd supercavitation-server

docker build -t supercavitation-server .
```

Copy `admin.macaroon` and `tls.cert` from your testnet lnd node into the `creds/` directory.

Create `creds/mnemonic` and populate it with a seed generated somewhere. 
  
```bash

docker run -it --rm \
    -v $(pwd)/creds/:/src/creds/ \
    -p 8081:8081 \
    --name supercavitation-server \
    -e LND_URI=LINK_TO_YOUR_LND_NODE \
    supercavitation-server
```



## TODOs

### Now

* Write Docs
* Convert env vars to params
* Two Bob Deployments
* Resolve IP of localhost LND

### Later (Icebox)

* See `TODO` in code...
* Timeouts Logic
* Test Skipping Deposit / Deposit Whitelist
* Deal with LND invoice timeouts
* Persistant storage
* Handle restarts
* Tests
