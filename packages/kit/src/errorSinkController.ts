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


interface ErrorSinkRequest {
    message: string
    stack: string
    origin: string
    details: any
    remainingTimeInMillis: number
}

export async function runLambda(context, event) {
    const req: ErrorSinkRequest = {
        message: event.message,
        stack: event.stack,
        origin: event.origin,
        details: event.details,
        remainingTimeInMillis: event.remainingTimeInMillis
    }

    const logRecord = {
        message: req.message, 
        stack: req.stack && req.stack.split('\n'),
        origin: req.origin,
        sinkRequestId: context.AWSrequestID,
        details: req.details,
        remainingTimeInMillis: event.remainingTimeInMillis
    };
    console.log('_BIGBAND_ERROR_SINK_\n' + JSON.stringify(logRecord, null, 2));

    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: "{}"
    };
}

