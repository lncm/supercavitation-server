import grpc from 'grpc';
import fs from 'fs';
import path from 'path';

import { invoiceExpiry, lndUri } from './config';

import { upsert } from './store';

// Due to updated ECDSA generated tls.cert we need to let grpc know that
// we need to use that cipher suite otherwise there will be a handshake
// error when we communicate with the lnd rpc server.
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';

const lndCert = fs.readFileSync(path.resolve(__dirname, '../creds/tls.cert'));
const sslCreds = grpc.credentials.createSsl(lndCert);
const macaroonCreds = grpc.credentials.createFromMetadataGenerator((args, callback) => {
  const macaroon = fs.readFileSync(path.resolve(__dirname, '../creds/admin.macaroon'))
    .toString('hex');
  const metadata = new grpc.Metadata();
  metadata.add('macaroon', macaroon);
  callback(null, metadata);
});
const creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const lnrpcDescriptor = grpc.load(path.resolve(__dirname, './rpc.proto'));
const lightning = new lnrpcDescriptor.lnrpc.Lightning(lndUri, creds);

// keep the `./store` updated with invoice state...
(function subscribeToInvoiceUpdates() {
  const call = lightning.subscribeInvoices();
  call.on('data', (invoice) => {
    // TODO, save the add_index for better re-subscribing
    const preImageHash = invoice.r_hash.toString('hex');
    upsert(preImageHash, {
      settled: invoice.settled,
      amountPaid: invoice.amt_paid_sat,
      createdAt: invoice.creation_date,
      settledAt: invoice.settle_date,
      expiry: invoice.expiry,
      value: invoice.value,
      preImage: invoice.r_preimage.toString('hex'),
    });
  });
  call.on('error', () => {
    console.log('grpc stream connection error, reconnecting');
    setTimeout(subscribeToInvoiceUpdates, 100);
  });
}());

export async function getInfo() {
  return new Promise((resolve, reject) => {
    lightning.GetInfo({}, (err, res) => {
      if (err) { reject(err); }
      resolve(res);
    });
  });
}

export async function createInvoice(props) {
  return new Promise((resolve, reject) => {
    console.log('creating invoice', props);
    lightning.AddInvoice({ ...props, expiry: invoiceExpiry }, (err, res) => {
      if (err) { reject(err); }
      resolve(res);
    });
  });
}

/*
SAMPLE INVOICE DATA

preImageHash: '867658325a087492c2db8cc6e36521ca322efbac1d9ed03feb7a8c7c30dd05d3'

BEFORE PAYMENT

{
  memo: 'Payment to Bob for settlemnt of swap for 121 satoshis',
  receipt: <Buffer >,
  r_preimage: <Buffer ad 60 39 45 1d 42 67 e6 55 f5 5f 01 b1 04 60 b9 24 56 50 c5 11 1d 76 f3 f8 74 97 c6 9b d5 57 97>,
  r_hash: <Buffer 23 c8 9a 4d ba 23 b7 4a 78 81 c7 06 05 39 c6 94 6b 91 8b fb 23 45 62 0c 7f 65 70 50 5a ac cf 60>,
  value: '121',
  settled: false,
  creation_date: '1543855572',
  settle_date: '0',
  payment_request: 'lntb1210n1pwq2hw5pp5y0yf5nd6ywm557ypcurq2wwxj34erzlmydzkyrrlv4c9qk4veasqdz42pshjmt9de6zqar0yppx7c3qvehhygrnv468gmr9d4h8ggr0vcs8xampwqsxvmmjyqcnyvfqwdshgmmndp5hxcqzysxqrr8yae7dw5jj2qpez6c79csee7zr7g4h6x2agr33vr9nz8mjj3vrqgpse3wgvgsqusrg4fqrufjgcndq487x2cqdf9sg5ecvnxnvusllwncq8tensz',
  description_hash: <Buffer >,
  expiry: '3300',
  fallback_addr: '',
  cltv_expiry: '144',
  route_hints: [],
  private: false,
  add_index: '495',
  settle_index: '0',
  amt_paid: '0',
  amt_paid_sat: '0',
  amt_paid_msat: '0'
}

AFTER PAYMENT

{
  memo: 'Deposit to Bob for creation of swap for 121 satoshis',
  receipt: <Buffer >,
  r_preimage: <Buffer f5 51 f7 1f 2d 67 27 e9 2e 64 65 9d 25 7c c0 4c 81 6d 5e 13 46 63 8f 9d b1 98 6b 56 29 fc 6f 2c>,
  r_hash: <Buffer 86 76 58 32 5a 08 74 92 c2 db 8c c6 e3 65 21 ca 32 2e fb ac 1d 9e d0 3f eb 7a 8c 7c 30 dd 05 d3>,
  value: '2',
  settled: true,
  creation_date: '1543855572',
  settle_date: '1543855613',
  payment_request: 'lntb20n1pwq2hw5pp5sem9svj6pp6f9skm3nrwxefpegeza7avrk0dq0lt02x8cvxaqhfsdz5g3jhqmmnd96zqar0yppx7c3qvehhygrrwfjkzarfdahzqmmxypehwctsypnx7u3qxyerzgrnv96x7umgd9escqzysxqrr8ypzatkmd32e3ay37q9jsgnqmj05s8zmjwfauhnqd65ja2fdr83xxjl5jd4jwpww8ukdz20eyua4ec39u8tm2rslup7m0v6wj7ltv5dsgqdr68j2',
  description_hash: <Buffer >,
  expiry: '3300',
  fallback_addr: '',
  cltv_expiry: '144',
  route_hints: [],
  private: false,
  add_index: '494',
  settle_index: '125',
  amt_paid: '2000',
  amt_paid_sat: '2',
  amt_paid_msat: '2000'
}
*/
