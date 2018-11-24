import grpc from "grpc";
import fs from "fs";
import config from "../../config.json";

const uri = config.lndUri;

import path from "path";


// Due to updated ECDSA generated tls.cert we need to let gprc know that
// we need to use that cipher suite otherwise there will be a handhsake
// error when we communicate with the lnd rpc server.
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA'

//  Lnd cert is at ~/.lnd/tls.cert on Linux and
//  ~/Library/Application Support/Lnd/tls.cert on Mac
var lndCert = fs.readFileSync(path.resolve(__dirname, "../../creds/tls.cert"));
var sslCreds = grpc.credentials.createSsl(lndCert);
var macaroonCreds = grpc.credentials.createFromMetadataGenerator(function(args, callback) {
    var macaroon = fs.readFileSync(path.resolve(__dirname, "../../creds/admin.macaroon")).toString('hex');
    var metadata = new grpc.Metadata();
    metadata.add('macaroon', macaroon);
    callback(null, metadata);
  });

var creds = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);

var lnrpcDescriptor = grpc.load(path.resolve(__dirname, "./rpc.proto"));

var lnrpc = lnrpcDescriptor.lnrpc;
var lightning = new lnrpc.Lightning(uri, creds);


lightning.getInfo({}, function(err, response) {
    if (err) { throw err; }
    console.log('connected to LND', uri, response);
});

export default lightning;
