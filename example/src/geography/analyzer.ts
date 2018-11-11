export async function runLambda(context, event, mapping) {
    const body = {
        analyzerInput: event
    }

    console.log('body=', JSON.stringify(body, null, 2));

    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: JSON.stringify(body)
    }
}

