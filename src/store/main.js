const orders = [];

// const order = {
//   rskAddress: '',
//   amount: '',
//   smallHash: '',
//   fullHash: '',
// };

export function store(order) {
  orders.push(order);
}

export function getBySmallHash(smallHash) {
  const [order] = orders.filter(o => o.smallHash === smallHash);
  if (order !== undefined) {
    return order;
  }

  return undefined;
}
