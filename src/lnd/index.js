import { infoGet, invoiceGet } from './grpc';

export async function getInfo() {
  const info = await infoGet();
  console.log(info);
  return info;
}

export async function getInvoice() {
  const invoice = await invoiceGet();
  console.log(invoice, invoice.payment_request);
  return invoice;
}

export default {
  getInfo,
  getInvoice,
};
