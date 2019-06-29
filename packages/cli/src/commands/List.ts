import {BigbandFileRunner} from '../BigbandFileRunner';

async function main(bigbandFile: string) {
    const model = await BigbandFileRunner.loadSpec(bigbandFile);
    return model.computeList()
}


export class ListCommand {
    static async run(argv) {
        const temp = await main(argv.bigbandFile);
        return JSON.stringify(temp, null, 2);
    }
}
