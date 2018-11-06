import {lookup} from './model';

export async function runLambda(context, event) {    
    const q = event.query;
    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: JSON.stringify({query: q, answers: lookup(q)})
    };
}

