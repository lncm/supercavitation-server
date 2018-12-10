import crypto from 'crypto';

import { upsert } from './store';

const fakeInvoice = {
  memo: 'This is a fake invoice, never send money to it!',
  // receipt: <Buffer >,
  // r_preimage: 'f551f71f2d6727e92e64659d257cc04c816d5e1346638f9db1986b5629fc6f2c',
  // r_hash: '867658325a087492c2db8cc6e36521ca322efbac1d9ed03feb7a8c7c30dd05d3',
  value: '2',
  settled: true,
  creation_date: '1543855572',
  settle_date: '1543855613',
  payment_request: 'lntb20n1pwq2hw5pp5sem9svj6pp6f9skm3nrwxefpegeza7avrk0dq0lt02x8cvxaqhfsdz5g3jhqmmnd96zqar0yppx7c3qvehhygrrwfjkzarfdahzqmmxypehwctsypnx7u3qxyerzgrnv96x7umgd9escqzysxqrr8ypzatkmd32e3ay37q9jsgnqmj05s8zmjwfauhnqd65ja2fdr83xxjl5jd4jwpww8ukdz20eyua4ec39u8tm2rslup7m0v6wj7ltv5dsgqdr68j2',
  // description_hash: <Buffer >,
  expiry: '3300',
  fallback_addr: '',
  cltv_expiry: '144',
  route_hints: [],
  private: false,
  add_index: '494',
  settle_index: '125',
  amt_paid: '2000',
  amt_paid_sat: '2',
  amt_paid_msat: '2000',
};

export async function createInvoice({ memo }) {
  const preImage = crypto.randomBytes(32).toString('hex');
  const preImageHash = crypto.createHash('sha256').update(Buffer.from(preImage, 'hex')).digest().toString('hex');
  const thisInvoice = { ...fakeInvoice, preImage, r_preimage: preImage, r_hash: preImageHash };
  // if this invoice is a deposit, wait for x, otherwise, wait longer (to simulate sequential payments)
  const waitTime = memo.indexOf('Deposit') === 0 ? 1000 : 6000;
  (async () => {
    // each time invoice is issued, we simply wait a bit, then pay it
    upsert(preImageHash, { ...thisInvoice, settled: false });
    // ... and 'paid'
    await new Promise(r => setTimeout(r, waitTime));
    upsert(preImageHash, { settled: true });
  })();
  // respond to the client...
  return thisInvoice;
}
