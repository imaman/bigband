import {BigbandFileRunner} from '../BigbandFileRunner';
import { Role } from 'bigband-core';


async function main(bigbandFile: string, path: string, longListing: boolean) {
    const model = await BigbandFileRunner.loadModel(bigbandFile);
    const inspectResult = model.inspect(path)

    if (inspectResult.data) {
        return JSON.stringify(inspectResult.data, null, 2)
    }
    if (!longListing) {
        return inspectResult.list.map(curr => curr.path).join('\n')
    }

    const table: string[][] = inspectResult.list.map(curr => [
        Role[curr.role].toLowerCase().substr(0, 1), curr.type || '', curr.path])
    const widths = new Array<number>(table[0].length).fill(0)
    table.forEach(line => {
        line.forEach((item, i) => {
            widths[i] = Math.max(widths[i], item.length)
        })
    })

    return table.map(line => line.map((item, i) => item.padEnd(widths[i], ' ')).join(' ')).join('\n')
}


export class ListCommand {
    static async run(argv) {
        return await main(argv.bigbandFile, argv.path, argv.l);
    }
}
