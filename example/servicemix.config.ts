import {DynamoDbAttributeType,IsolationScope,newLambda,DynamoDbInstrument,Rig} from '@servicemix/runtime/Instrument.js';


const namespace = new IsolationScope('274788167589', 'servicemix-example-app', 'servicemix-example', 'root');
const prodMajor = new Rig(namespace, 'eu-central-1', 'prod-major');
const prodMinor = new Rig(namespace, 'eu-central-1', 'prod-minor');
const importantDates = newLambda('chronology', 'importantDates', 'src/chronology/compute', {
    Description: "returns important dates for a year",
    MemorySize: 1024,
    Timeout: 30      
});

const placeFinder = newLambda('geography', 'placeFinder', 'src/geography/compute', {
    Description: 'returns names of places that best match the given query',
    MemorySize: 1024,
    Timeout: 30      
});

const statsTable = new DynamoDbInstrument('geography', 'Stats', {name: 'query', type: DynamoDbAttributeType.STRING}, {name: 'when', type: DynamoDbAttributeType.NUMBER}, 1, 1);
const distanceTable = new DynamoDbInstrument('geography', 'Distance', {name: 'dist', type: DynamoDbAttributeType.NUMBER}, null, 2, 2);


placeFinder.uses(distanceTable, "distanceTable");

export function run() {
    return {
        rigs: [prodMajor, prodMinor],
        instruments: [placeFinder, importantDates, distanceTable]
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

