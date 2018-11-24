import grpc from 'grpc';
import fs from 'fs';
import path from 'path';
import config from '../../config.json';

const uri = config.lndUri;

// Due to updated ECDSA generated tls.cert we need to let grpc know that
// we need to use that cipher suite otherwise there will be a handshake
// error when we communicate with the lnd rpc server.
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';

//  Lnd cert is at ~/.lnd/tls.cert on Linux and
//  ~/Library/Application Support/Lnd/tls.cert on Mac
const lndCert = fs.readFileSync(path.resolve(__dirname, '../../creds/tls.cert'));
const sslCreds = grpc.credentials.createSsl(lndCert);
const macaroonCreds = grpc.credentials.createFromMetadataGenerator((args, callback) => {
  const macaroon = fs.readFileSync(path.resolve(__dirname, '../../creds/admin.macaroon'))
    .toString('hex');
  const metadata = new grpc.Metadata();
  metadata.add('macaroon', macaroon);
  callback(null, metadata);
});

const creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);

const lnrpcDescriptor = grpc.load(path.resolve(__dirname, './rpc.proto'));

const { lnrpc } = lnrpcDescriptor;
const lightning = new lnrpc.Lightning(uri, creds);


const hashes = {};

const call = lightning.subscribeInvoices();

call.on('data', (invoice) => {
  console.log('data:', invoice);
  const [match] = Object.keys(hashes)
    .filter(hash => hash === invoice.r_hash.toString('base64'));

  if (!match) {
    return;
  }

  if (invoice.settled) {
    hashes[match]();
  }
});

call.on('status', (status) => {
  console.log('status:', status);
});

call.on('end', () => {
  console.log('connection ended');
});

call.on('error', (error) => {
  console.log('error:', error);
});


export const infoGet = () => new Promise((resolve) => {
  lightning.GetInfo({}, (err, res) => {
    if (err) {
      console.log(err);
      return;
    }

    resolve(res);
  });
});

export const invoiceGet = amount => new Promise((resolve) => {
  lightning.AddInvoice({ value: amount }, (err, res) => {
    if (err) {
      console.log(err);
      return;
    }

    resolve(res);
  });
});

export function listenInvoices(hash, fn) {
  hashes[hash] = fn;
}

export const invoiceStatus2 = hash => new Promise((resolve) => {
  lightning.LookupInvoice({ r_hash: hash }, (err, invoice) => {
    if (err) {
      console.log(err);
      return;
    }

    resolve(invoice.settled);
  });
});

export const invoicePreImage = hash => new Promise((resolve) => {
  lightning.LookupInvoice({ r_hash: hash }, (err, invoice) => {
    if (err) {
      console.log(err);
      return;
    }

    resolve(invoice.r_preimage);
  });
});



export default lightning;
