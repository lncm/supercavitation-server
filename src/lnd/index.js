import { infoGet, invoiceGet } from './grpc';

export async function getInfo() {
  const info = await infoGet();
  console.log(info);
  return info;
}

export async function getInvoice(amount) {
  const invoice = await invoiceGet(amount);

  return {
    invoice: invoice.payment_request,
    hash: invoice.r_hash,
  };
}
