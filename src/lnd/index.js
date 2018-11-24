import { infoGet, invoiceGet, invoiceStatus2 } from './grpc';

export async function getInfo() {
  await infoGet();
}

export async function getInvoice(amount) {
  // TODO: if amount ==null create invoice for small amount

  const invoice = await invoiceGet(amount);

  return {
    invoice: invoice.payment_request,
    hash: invoice.r_hash.toString('base64'),
  };
}

export async function invoiceStatus(hash) {
  await invoiceStatus2(hash);
}
