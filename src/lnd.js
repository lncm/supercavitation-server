import grpc from 'grpc';
import fs from 'fs';
import path from 'path';

import { invoiceExpiry, lndUri } from '../config.json';

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

export async function createInvoice({ value }) {
  return new Promise((resolve, reject) => {
    lightning.AddInvoice({ value, expiry: invoiceExpiry }, (err, res) => {
      if (err) { reject(err); }
      resolve(res);
    });
  });
}
