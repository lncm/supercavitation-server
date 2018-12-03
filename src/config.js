// n.b. we explicityly use strings here to avoid potential Integer overflow elsewhere

// these should equal the gas cost of executing creation/settle methods
const creationGas = '75432';
const settlementGas = '139804';

/*
NETWORK
*/
// web service port
export const port = 8081;
// lightning node location
export const lndUri = 'lndtest.lncm.io:443';
// etheruem node
export const evmUri = 'https://public-node.testnet.rsk.co';

/*
KEYSTORE
*/
// path used to derive `process.env.MNEMONIC`
export const derevationPath = "m/44'/37310'/0'/0/";


/*
EVM
*/
// used in all contract executions
export const gasPrice = 1;
export const gas = 6721975;

/*
BOB'S SERVICE
*/
// number of blocks to lock the funds
export const timeLockBlocks = 100;
// lightining invoice Expiry
export const invoiceExpiry = (timeLockBlocks + 10) * 30; // average 30 second block times, plus some buffer
// minimum amount per swap (satoshis)
export const minAmountSatoshis = '1000';
// exchange rate from satoshis to wei - must be an integer
export const exchangeRate = '9800000000'; // this is a 2% fee (98:100), set to 10000000000 for 1:1
// wei sent to alice upon swap creation
export const supercavitationWei = settlementGas; // exactly equal to the gas amount required to redeem
// wei used to incentivise anyone to close the settlement
export const rewardWei = (Number(settlementGas) + 13337).toString(); // should be at least the cost of making the redemption
// anti-spam deposit fee, should be at least the wei required to create the swap
export const depositFeeSatoshis = (Number(creationGas) + 1000).toString(); // increase this if bob is getting spammed!
// server name to client
export const name = 'Bob';
// the message sent to client
export const text = 'Hello, I am Bob. Please enjoy my swap service.';
