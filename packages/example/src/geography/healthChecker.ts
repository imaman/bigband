
export async function runLambda(context, event, mapping) {
    console.log('healthchecker awakens');

    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: {ok: true}
    };
}

