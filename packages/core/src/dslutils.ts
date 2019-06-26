import { Instrument } from "./Instrument";
import { WireSpec } from './BigbandSpec'

export function wire(consumer: Instrument, supplier: Instrument, name: string): WireSpec {
    consumer.uses(supplier, name)
    return {consumer, supplier, name};
}
