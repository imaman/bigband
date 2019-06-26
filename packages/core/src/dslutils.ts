import { Instrument } from "./Instrument";
import { WireSpec } from './BigbandSpec'

/**
 * Declares a named inter-instrument dependency. It indicates that the consumer instument depends on the
 * supplier instrument
 *
 * @param {Instrument} consumer the consumer instrument
 * @param {Instrument} supplier the supplier instrument
 * @param {string} name the name of the dependency. Must be unique per consumer-in-section.
 * @returns {WireSpec}
 */
export function wire(consumer: Instrument, supplier: Instrument, name: string): WireSpec {
    return {consumer, supplier, name};
}
