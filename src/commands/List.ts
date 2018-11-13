import {AwsFactory} from '../AwsFactory'
import {loadSpec} from '../MixFileRunner';



async function main(mixFile: string, runtimeDir: string) {
    return loadSpec(mixFile, runtimeDir);
}


export class ListCommand {
    static async run(argv) {
        const temp = await main(argv.mixFile, argv.runtimeDir);
        return JSON.stringify(temp, null, 2);
    }
}
