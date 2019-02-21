import {Greeter} from './Greeter';

export const run = (name: string) => `run is saying: ${new Greeter().greet(name)}`;

