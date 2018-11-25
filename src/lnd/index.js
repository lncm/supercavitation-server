import { infoGet, invoiceGet, invoiceStatus2 } from './grpc';

export async function getInfo() {
  await infoGet();
}

export async function getInvoice(memo, amount = 100) {
  const invoice = await invoiceGet(memo, amount);

  return {
    invoice: invoice.payment_request,
    hash: invoice.r_hash.toString('base64'),
  };
}

export async function invoiceStatus(hash) {
  await invoiceStatus2(hash);
}
