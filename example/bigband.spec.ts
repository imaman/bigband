import {DynamoDbAttributeType,IsolationScope,newLambda,DynamoDbInstrument,KinesisStreamInstrument,KinesisStreamConsumer,Rig} from '@servicemix/runtime/Instrument.js';


const namespace = new IsolationScope('274788167589', 'bb-example', 'bb-example-e-w-2', 'root', 'testim');
const prodMajor = new Rig(namespace, 'eu-west-2', 'prod-major');
const importantDates = newLambda('chronology', 'importantDates', 'src/chronology/compute', {
    Description: "returns important dates for a year",
    MemorySize: 1024,
    Timeout: 15   
});

const placeFinder = newLambda('geography', 'placeFinder', 'src/geography/compute', {
    Description: 'returns names of places that best match the given query',
    MemorySize: 1024,
    Timeout: 30      
});


const statsTable = new DynamoDbInstrument('geography', 'Stats', {name: 'query', type: DynamoDbAttributeType.STRING}, {name: 'when', type: DynamoDbAttributeType.NUMBER}, {
    provisioned: {
        readCapacityUnits: 1,
        writeCapacityUnits: 1
    }
});
const distanceTable = new DynamoDbInstrument('geography', 'Distance', {name: 'dist', type: DynamoDbAttributeType.NUMBER}, null);

const queryStream = new KinesisStreamInstrument('geography', 'QueryStream', 2);

const queryStreamAnalyzer = new KinesisStreamConsumer('geography', 'analyzer', 'src/geography/analyzer', queryStream);


placeFinder.uses(distanceTable, "distanceTable");
placeFinder.uses(queryStream, 'queryStream');

export function run() {
    return {
        rigs: [prodMajor],
        instruments: [importantDates, placeFinder, queryStream, distanceTable, queryStreamAnalyzer]
    }
}
