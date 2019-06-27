import {loadSpec} from '../BigbandFileRunner';
import { BigbandModel } from '../models/BigbandModel';

async function main(bigbandFile: string) {

    // TODO(imaman): determine which parts of this can be moved in the model class.
    const model: BigbandModel = await loadSpec(bigbandFile);
    const bigbands = model.sections.map(curr => curr.section.bigband);
    const ret = {};
    bigbands.forEach(s => ret[s.name] = {});
    model.sections.forEach(sectionModel => {
        const e = ret[sectionModel.section.bigband.name];
        const d = {};
        e[sectionModel.section.name] = d;
        sectionModel.instruments.forEach(curr => d[curr.instrument.physicalName(sectionModel.section)] = curr.instrument.arnService());
    });

    return ret;
}


export class ListCommand {
    static async run(argv) {
        const temp = await main(argv.bigbandFile);
        return JSON.stringify(temp, null, 2);
    }
}
