import {BigbandFileRunner} from '../BigbandFileRunner';

async function main(bigbandFile: string, path: string, usePath: boolean) {
    const model = await BigbandFileRunner.loadModel(bigbandFile);
    if (usePath) {
        const data = model.navigate(path)
        return data.list.map(curr => curr.subPath).join('\n')
    } else {
        return JSON.stringify(model.computeList(), null, 2)
    }
}


export class ListCommand {
    static async run(argv) {
        return await main(argv.bigbandFile, argv.path, argv.path !== undefined);
    }
}
