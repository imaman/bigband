import {AbstractController} from 'bigband-core';
import * as Denque from 'denque';

// import * as AWS from 'aws-sdk';

// export async function sendErrorToSink(err, mapping, context, details) {
//     try {
//         const lambda = new AWS.Lambda({region: mapping.errorSinkFunction.region});
//         const req: ErrorSinkRequest = {
//             message: err.message,
//             stack: err.stack,
//             origin: context.functionName,
//             details: Object.assign({originRequestId: context.AWSrequestID}, details),
//             remainingTimeInMillis: context.getRemainingTimeInMillis()
//         }

//         const lambdaParams = {
//             FunctionName: mapping.errorSinkFunction.name,
//             InvocationType: 'Event', 
//             Payload: JSON.stringify(req),
//         };

//         await lambda.invoke(lambdaParams).promise();
//         return Promise.resolve();
//     } catch (e) {
//         // Intentionally absorb
//     }
// }


export interface LogSamplerStoreRequest {
    data: any,
    key: string
}

export interface LogSamplerFetchRequest {
    key: string
}

class Model {
    private readonly map = new Map<string, LogSamplerStoreRequest>();
    private readonly fifo = new Denque();
    constructor(private readonly limit: number) {}

    store(request: LogSamplerStoreRequest) {
        if (!request.key) {
            throw new Error('key cannot be falsy');
        }
        while (this.fifo.length > this.limit) {
            const dropMe = this.fifo.shift();
            this.map.delete(dropMe.key);
        }

        this.fifo.push(request);
        this.map.set(request.key, request);
    }

    fetch(key: string) {
        return this.map.get(key);
    }
}

class LogSamplerController extends AbstractController<any, any> {
    private readonly model = new Model(1000);

    executeScheduledEvent(): void {
        // NOP
    }

    private store(request: LogSamplerStoreRequest) {
        this.model.store(request);
    }

    private fetch(request: LogSamplerFetchRequest) {
        return this.model.fetch(request.key);
    }

    async executeInputEvent(input: any): Promise<any> {
        if (input.logSamplerStoreRequest) {
            this.store(input.logSamplerStoreRequest);
            return {}
        }

        if (input.logSamplerFetchRequest) {
            return this.fetch(input.logSamplerStoreRequest);
        }
    }

}

let c: LogSamplerController;

export async function runLambda(context, event, mapping, buildFingerprint) {
    c = c || new LogSamplerController(mapping, buildFingerprint);
    return c.runLambda(event, context);
}
 

