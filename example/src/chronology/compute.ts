import * as moment from 'moment';

const eventByYear: any = {
    1968: 'Apollo 8',
    1967: 'Sgt. Pepper',
    1985: 'Talking Heads: Road to Nowhere',
    'NONE': 'Please specify a year'
};

export async function runLambda(context, event) {    
    const t = eventByYear[event.year || 'NONE'] || 'NOTHING';
    const timePassed = event.year ? moment(`${event.year}-01-01`).fromNow(): undefined;
    return {
        statusCode: 200,
        headers: { 
          "content-type": 'application/json', 
        },
        body: JSON.stringify({year: event.year, description: t, howLongAgo: timePassed})
    };
}

