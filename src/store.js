// TODO replace with a persistent store
// we're using async now for future integration
// ...with some hacky 'oplog' listener; use some native store instead

const store = {};
const listeners = {};
let listenerCounter = 0;

export async function read(preImageHash) {
  return store[preImageHash];
}

export async function upsert(preImageHash, update) {
  console.log({ preImageHash, update });
  store[preImageHash] = { ...store[preImageHash], ...update };
  Object.values((listeners[preImageHash] || {})).forEach(fn => fn(update));
  return read(preImageHash);
}

export function listen(preImageHash, fn) {
  listenerCounter += 1;
  listeners[preImageHash] = { ...listeners[preImageHash], [listenerCounter]: fn };
  return listenerCounter;
}

export function stopListening(preImageHash, id) {
  delete listeners[preImageHash][id];
}

// TODO timeout option
export async function waitFor(preImageHash, key) {
  // return immediately if the requested key is already defined
  const data = await read(preImageHash);
  if (data && (!key && data[key])) { return data; }
  return new Promise((resolve) => {
    const id = listen(preImageHash, (update) => {
      // only triggers if the passed key changes
      if (!key || update[key]) {
        stopListening(preImageHash, id);
        resolve(read(preImageHash));
      }
    });
  });
}
