import { KinesisStreamConsumer, KinesisStreamInstrument, LambdaInstrument, DynamoDbAttributeType, Bigband, DynamoDbInstrument, Section, wire } from 'bigband-core/lib/index';


const bigband = new Bigband({name: 'bb-example', awsAccount: '196625562809', profileName: 'imaman', s3Bucket: 'bigband-example', s3Prefix: 'root'});
const prod = new Section('eu-west-2', 'prod');
const staging = new Section('eu-west-2', 'staging');
const importantDates = new LambdaInstrument('chronology', 'improtant-dates', 'src/chronology/compute', {
    Description: "returns important dates for a year",
    MemorySize: 1024,
    Timeout: 15   
});

const placeFinder = new LambdaInstrument('geography', 'place-finder', 'src/geography/placeFinder', {
    Description: 'returns names of places that best match the given query',
    MemorySize: 1024,
    Timeout: 30      
});

const healthChecker = new LambdaInstrument('geography', 'health-checker', 'src/geography/healthChecker', {
    Description: 'is everything working correctly',
    MemorySize: 1024,
    Timeout: 30      
}).invokeEveryMinutes(30);


const statsTable = new DynamoDbInstrument('geography', 'stats', {name: 'query', type: DynamoDbAttributeType.STRING}, {name: 'when', type: DynamoDbAttributeType.NUMBER}, {
    provisioned: {
        readCapacityUnits: 1,
        writeCapacityUnits: 1
    }
});
const distanceTable = new DynamoDbInstrument('geography', 'distance', {name: 'dist', type: DynamoDbAttributeType.NUMBER});

const queryStream = new KinesisStreamInstrument('geography', 'query-stream', 1);

const queryStreamAnalyzer = new KinesisStreamConsumer('geography', 'analyzer', 'src/geography/analyzer', queryStream, 1);


// TODO(imaman): check why adding :BigbandSpec breaks compilation
export function run() {
    return {
        bigband,
        sections: [
            {
                section: prod,
                instruments: [importantDates, placeFinder, queryStream, distanceTable, queryStreamAnalyzer, healthChecker],
                wiring: [
                    wire(placeFinder, "distanceTable", distanceTable),    
                    wire(placeFinder, "queryStream", queryStream),    
                ]
            },
            {
                section: staging,
                instruments: [placeFinder, distanceTable, queryStream],
                wiring: [
                    wire(placeFinder, "distanceTable", distanceTable),    
                    wire(placeFinder, "queryStream", queryStream),    
                ]
            }
        ]
    }
}
