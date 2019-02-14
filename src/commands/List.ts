import {AwsFactory} from '../AwsFactory'
import {loadSpec,BigbandSpec} from '../BigbandFileRunner';



async function main(bigbandFile: string, runtimeDir: string) {
    const spec: BigbandSpec = await loadSpec(bigbandFile, runtimeDir);
    const scopes = spec.rigs.map(r => r.isolationScope);
    const ret = {};
    scopes.forEach(s => ret[s.name] = {});
    spec.rigs.forEach(r => {
        const e = ret[r.isolationScope.name];
        const d = {};
        e[r.name] = d;
        spec.instruments.forEach(curr => d[curr.physicalName(r)] = curr.arnService());
    });

    return ret;
}


export class ListCommand {
    static async run(argv) {
        const temp = await main(argv.bigbandFile, argv.runtimeDir);
        return JSON.stringify(temp, null, 2);
    }
}
