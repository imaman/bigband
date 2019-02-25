import {AbstractController} from 'bigband-core';
import {LogSamplerModel} from './LogSamplerModel';

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


class LogSamplerController extends AbstractController<any, any> {
    private readonly model = new LogSamplerModel(1000);

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
 

