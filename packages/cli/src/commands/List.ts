import {loadSpec,BigbandSpec} from '../BigbandFileRunner';



async function main(bigbandFile: string) {
    const spec: BigbandSpec = await loadSpec(bigbandFile);
    const scopes = spec.sections.map(s => s.section.bigband);
    const ret = {};
    scopes.forEach(s => ret[s.name] = {});
    spec.sections.forEach(s => {
        const e = ret[s.section.bigband.name];
        const d = {};
        e[s.section.name] = d;
        s.instruments.forEach(curr => d[curr.physicalName(s.section)] = curr.arnService());
    });

    return ret;
}


export class ListCommand {
    static async run(argv) {
        const temp = await main(argv.bigbandFile);
        return JSON.stringify(temp, null, 2);
    }
}
