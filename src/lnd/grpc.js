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


export const infoGet = () => new Promise((resolve) => {
  lightning.GetInfo({}, (err, res) => {
    if (err) {
      throw err;
    }

    resolve(res);
  });
});

export const invoiceGet = amount => new Promise((resolve) => {
  lightning.AddInvoice({ value: amount }, (err, res) => {
    if (err) {
      throw err;
    }

    resolve(res);
  });
});

export const invoicePoll = hash => new Promise((resolve) => {
  lightning.LookupInvoice({ r_hash_str: hash }, (err, res) => {
    if (err) {
      throw err;
    }

    // TODO: check if paid

    console.log(res);

    resolve(res);
  });
});


export default lightning;
