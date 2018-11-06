import {IsolationScope,newLambda,Rig} from '@servicemix/runtime/Instrument.js';


const namespace = new IsolationScope('274788167589', 'servicemix-example-app', 'servicemix-example', 'root');
const rig = new Rig(namespace, 'eu-central-1', 'prod-major');
const importantDates = newLambda('chronology', 'importantDates', 'src/chronology/compute', {
    Description: "returns important dates for a year",
    MemorySize: 1024,
    Timeout: 30      
});

export function run() {
    return {
        rigs: [rig],
        instruments: [importantDates]
    }
}


// export const config = {
//     namespace: {
//         s3Bucket: 'servicemix-example',
//         s3Prefix: 'root',
//         name: 'servicemix-example-app'
//     },
//     package: {
//         region: "eu-central-1",
//         name: 'chronology',
//         functions: {
//             "importantDates": {
//                 controller: "src/chronology/compute",
//                 properties: {
//                 }
//             }
//         }
//     },
// }

