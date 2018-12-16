# Supercavitation Server

## Overview

This is the server component of the Supercavitations Swap service.

## TODOs

- Still TODO
  - Write Docs
  - Convert env vars to params
  - Two Bob Deployments
  - Resolve IP of localhost LND
- Post-Hackathon DONE
  - Verify Message Signatures
  - New API with simpler, RESTful endpoints
  - Always pass around a hex version of the preimage
  - Proper conversion Satoshis -> Wei (using BigNumber)
  - Accept contract address
  - Fixed the invoice subscriptions
  - Add more inside config file
  - Error Handling
  - Refactor
- Post-Post Hackathon TODOs
  - See `TODO` in code...
  - Timeouts Logic
  - Test Skipping Deposit / Deposit Whitelist
  - Deal with LND invoice timeouts
  - Persistant storage
  - Handle restarts
  - Tests