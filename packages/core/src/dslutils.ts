import { Instrument } from "./Instrument";
import { WireSpec } from './BigbandSpec'

/**
 * Declares a named inter-instrument dependency. It indicates that the consumer instument depends on the
 * supplier instrument
 *
 * @param {Instrument} consumer the consumer instrument
 * @param {string} name the name of the dependency. Must be unique per consumer-in-section.
 * @param {Instrument} supplier the supplier instrument
 * @returns {WireSpec}
 */
export function wire(consumer: Instrument,  name: string, supplier: Instrument): WireSpec {
    return {consumer, supplier, name};
}
