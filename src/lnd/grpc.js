import grpc from 'grpc';
import fs from 'fs';
import path from 'path';
import config from '../../config.json';


const uri = config.lndUri;


// Due to updated ECDSA generated tls.cert we need to let gprc know that
// we need to use that cipher suite otherwise there will be a handhsake
// error when we communicate with the lnd rpc server.
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA';

//  Lnd cert is at ~/.lnd/tls.cert on Linux and
//  ~/Library/Application Support/Lnd/tls.cert on Mac
const lndCert = fs.readFileSync(path.resolve(__dirname, '../../creds/tls.cert'));
const sslCreds = grpc.credentials.createSsl(lndCert);
const macaroonCreds = grpc.credentials.createFromMetadataGenerator((args, callback) => {
  const macaroon = fs.readFileSync(path.resolve(__dirname, '../../creds/admin.macaroon')).toString('hex');
  const metadata = new grpc.Metadata();
  metadata.add('macaroon', macaroon);
  callback(null, metadata);
});

const creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);

const lnrpcDescriptor = grpc.load(path.resolve(__dirname, './rpc.proto'));

const { lnrpc } = lnrpcDescriptor;
const lightning = new lnrpc.Lightning(uri, creds);


lightning.getInfo({}, (err, response) => {
  if (err) { throw err; }
  console.log('connected to LND', uri, response);
});

export default lightning;
