import {BigbandFileRunner} from '../BigbandFileRunner';


async function main(bigbandFile: string, path: string) {
    const model = await BigbandFileRunner.loadModel(bigbandFile);
    const inspectResult = await model.inspect(path)

    if (inspectResult.list.length >= 2) {
        throw new Error('Multiple matches at path ' + path)
    }

    const item = inspectResult.list[0]
    if (!item) {
        throw new Error('Nothing to run at ' + path)
    }

    if (!item.action) {
        throw new Error('No action to run at ' + path)
    }
    
    const data = await item.action("")
    return JSON.stringify(data , null, 2)
}


export class RunCommand {
    static async run(argv) {
        return await main(argv.bigbandFile, argv.path);
    }
}
