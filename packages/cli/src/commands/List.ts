import {BigbandFileRunner} from '../BigbandFileRunner';
import { Role } from '../models/BigbandModel';

async function main(bigbandFile: string, path: string, longListing: boolean) {
    const model = await BigbandFileRunner.loadModel(bigbandFile);
    const data = model.inspect(path)
    if (!longListing) {
        return data.list.map(curr => curr.subPath).join('\n')
    }

    const table: string[][] = data.list.map(curr => [
        Role[curr.role].toLowerCase().substr(0, 1), curr.type || '', curr.subPath])
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
