import util from 'util';

import lightning from './grpc';

const infoGet = () => new Promise((resolve) => {
    lightning.getInfo({}, (err, res) => resolve(res));
});

export async function info() {
    const info = await getInfo();
    console.log(info);
    return info;
}

