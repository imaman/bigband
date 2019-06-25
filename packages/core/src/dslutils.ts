import { Instrument } from "./Instrument";

export function wire(consumer: Instrument, supplier: Instrument, name: string) {
    consumer.uses(supplier, name)
}

