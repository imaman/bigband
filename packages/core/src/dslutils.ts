import { Instrument } from "./Instrument";
import { WireSpec, SectionSpec } from './BigbandSpec'
import { Section } from "./Section";

/**
 * Declares a named inter-instrument dependency. It indicates that the consumer instument depends on the
 * supplier instrument. This method is used in the wiring field of [[SectionSpec]] objects. The section defined by the
 * containing [[SectionSpec]] is referred here as "the associated section".
 *
 * @param {Instrument} consumer the consumer instrument. The consumer must be present on the associated section. 
 * @param {string} name the name of the dependency. Must be unique per consumer-in-section.
 * @param {Instrument} supplier the supplier instrument
 * @param {Section} supplierSection the section of the supplier. if omitted, defaults to the associated section.
 * @returns {WireSpec}
 */
export function wire(consumer: Instrument, name: string, supplier: Instrument, supplierSection?: Section): WireSpec {
    return {consumer, name, supplier, supplierSection};
}

