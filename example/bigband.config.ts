import { KinesisStreamConsumer, KinesisStreamInstrument, LambdaInstrument, DynamoDbAttributeType, IsolationScope, DynamoDbInstrument, Rig } from './core_lib_symlink';


const namespace = new IsolationScope('274788167589', 'bb-example', 'bb-example-e-w-2', 'root', 'testim');
const prodMajor = new Rig(namespace, 'eu-west-2', 'prod-major');
const importantDates = new LambdaInstrument('chronology', 'importantDates', 'src/chronology/compute', {
    Description: "returns important dates for a year",
    MemorySize: 1024,
    Timeout: 15   
});

const placeFinder = new LambdaInstrument('geography', 'placeFinder', 'src/geography/compute', {
    Description: 'returns names of places that best match the given query',
    MemorySize: 1024,
    Timeout: 30      
});

const healthChecker = new LambdaInstrument('geography', 'healthChecker', 'src/geography/healthChecker', {
    Description: 'is everything working correctly',
    MemorySize: 1024,
    Timeout: 30      
}).invokeEveryMinutes(30);


const statsTable = new DynamoDbInstrument('geography', 'Stats', {name: 'query', type: DynamoDbAttributeType.STRING}, {name: 'when', type: DynamoDbAttributeType.NUMBER}, {
    provisioned: {
        readCapacityUnits: 1,
        writeCapacityUnits: 1
    }
});
const distanceTable = new DynamoDbInstrument('geography', 'Distance', {name: 'dist', type: DynamoDbAttributeType.NUMBER});

const queryStream = new KinesisStreamInstrument('geography', 'QueryStream', 1);

const queryStreamAnalyzer = new KinesisStreamConsumer('geography', 'analyzer', 'src/geography/analyzer', queryStream, 1);


placeFinder.uses(distanceTable, "distanceTable");
placeFinder.uses(queryStream, 'queryStream');

export function run() {
    return {
        rigs: [prodMajor],
        instruments: [importantDates, placeFinder, queryStream, distanceTable, queryStreamAnalyzer, healthChecker]
    }
}
