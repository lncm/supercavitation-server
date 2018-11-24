import lightning from './grpc';

const infoGet = () => new Promise((resolve) => {
  lightning.getInfo({}, (err, res) => resolve(res));
});

export async function methodOne() {
  const info = await infoGet();
  console.log(info);
  return info;
}

export async function methodTwo() {
  const info = await infoGet();
  console.log(info);
  return info;
}
