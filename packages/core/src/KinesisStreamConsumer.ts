import {LambdaInstrument} from './LambdaInstrument'
import {KinesisStreamInstrument} from './KinesisStreamInstrument'
import {NameStyle} from './Instrument'

export class KinesisStreamConsumer extends LambdaInstrument {
    constructor(packageName: string, name: string, controllerPath: string, 
            stream: KinesisStreamInstrument, batchSize: number, cloudFormationProperties: any = {}) {
        super(packageName, name, controllerPath, Object.assign({}, {
            Events: {
                Stream: {
                    Type: "Kinesis",
                    Properties: {
                        Stream: { "Fn::GetAtt" : [ stream.fullyQualifiedName(NameStyle.PASCAL_CASE), "Arn" ] },
                        BatchSize: batchSize,
                        StartingPosition: "LATEST"
                    }
                }
            }
        }, cloudFormationProperties));
    }
}
