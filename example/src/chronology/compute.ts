const eventByYear: any = {
    1968: 'Apollo 8',
    1967: 'Sgt. Pepper',
    1985: 'Road to Nowhere',
    'NONE': 'Please specify a year'
};

export async function runLambda(context, event) {
    const t = eventByYear[event.year || 'NONE'] || 'NOTHING';
    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: JSON.stringify({y: event.year, title: t})
      }        
}

