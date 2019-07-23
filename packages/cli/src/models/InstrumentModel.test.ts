import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { LambdaInstrument, Section, wire, Bigband, SectionSpec, BigbandSpec } from 'bigband-core';
import { SectionModel } from './SectionModel'
import { InstrumentModel } from './InstrumentModel';
import { BigbandModel } from './BigbandModel';


describe('InstrumentModel', () => {
    const b = new Bigband({
        name: "b",
        profileName: "p",
        s3Prefix: "my_prefix",
        s3BucketGuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    })

    describe("validation", () => {
        function createModel(instrument: LambdaInstrument, section: Section) {
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {section, instruments: [instrument], wiring: []}
                ]
            }

            return new BigbandModel(spec, "_")
        }

        describe("the 'bigband' top level package", () => {
            it("is locked for a non system instrument", () => {
                const s = new Section("r1", "s1")
                const instrument = new LambdaInstrument("bigband", "f1", "")
    
                expect(() => createModel(instrument, s)).to.throw(
                    'Instrument "bigband-f1" has a bad name: the fully qualified name of an instrument is not allowed to start with "bigband"')
            })
            it("is locked also when using the array notation", () => {
                const s = new Section("r1", "s1")
                const instrument = new LambdaInstrument(["bigband"], "f1", "")
                // const model = new InstrumentModel(b, s, instrument, [], false)

                expect(() => createModel(instrument, s)).to.throw(
                    'Instrument "bigband-f1" has a bad name: the fully qualified name of an instrument is not allowed to start with "bigband"')
            })    
            it("top level package name which starts with 'bigband' is not locked", () => {
                const s = new Section("r1", "s1")
                const instrument = new LambdaInstrument(["bigband1111"], "f1", "")
                const model = createModel(instrument, s)
                const im = model.getInstrument("r1/s1/bigband1111/f1")
                expect(() => im.validate()).not.to.throw()
            })    
            it("'bigband' is not locked as a non top-level package name", () => {
                const model = createModel(new LambdaInstrument(["abc", "bigband"], "f1", ""),  new Section("r1", "s1"))
                const im = model.getInstrument("r1/s1/abc/bigband/f1")
                expect(() => im.validate()).not.to.throw()
            })    
        })
        describe("name", () => {
            function newInstrumentModel(packageName: string[], name: string) {
                const s = new Section("r1", "s1")
                const m = createModel(new LambdaInstrument(packageName, name, ""), s)
                return m.getInstrument(`r1/s1/${packageName}/${name}`)
            }

            it("allows dash-separated sequences of lower-case letters and digits", () => {
                expect(() => newInstrumentModel(["p1"], "pqr-st").validate()).not.to.throw()
            });

            it("rejects upper-case letters", () => {
                expect(() => newInstrumentModel(["p1"], "pQr")).to.throw('Bad instrument name: "p1-pQr')
            });
        })
    })

    describe('wirings', () => {
        
        function createSectionModel(s: SectionSpec): SectionModel {
            const bigbandSpec: BigbandSpec = {
                bigband: b,
                sections: [s]
            }

            const bm = new BigbandModel(bigbandSpec, "_")
            
            return bm.findSectionModel(s.section.path)
        }

        function createInstrumentModel(s: SectionSpec, pathToInstrument: string) {
            const bigbandSpec: BigbandSpec = {
                bigband: b,
                sections: [s]
            }

            const bm = new BigbandModel(bigbandSpec, "_")
            return bm.getInstrument(pathToInstrument)
        }

        it('returns an empty array if no wirings were defined', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const spec: SectionSpec = {
                section: new Section("r1", "s1"), 
                instruments: [f1],
                wiring: []
            }

            const m = createInstrumentModel(spec, "r1/s1/p1/f1")
            expect(m.wirings).to.eql([])
        });
        it('returns an empty array if no wirings were defined for the given consumer', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const w12 = wire(f1, "w12", f2)
            const spec: SectionSpec = {
                section: new Section("r1", "s1"), 
                instruments: [f1, f2],
                wiring: [w12]
            }

            const m = createInstrumentModel(spec, "r1/s1/p1/f2")
            expect(m.wirings.map(x => x.toString())).to.eql([])
        });
        it('returns all wirings for the given consumer', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
            const w12 = wire(f1, "w12", f2)
            const w13 = wire(f1, "w13", f3)
            const spec: SectionSpec = {
                section: new Section("r1", "s1"), 
                instruments: [f1, f2, f3],
                wiring: [w12, w13]
            }

            const m = createInstrumentModel(spec, "r1/s1/p1/f1")
            expect(m.wirings.map(x => x.toString())).to.eql([
                "r1/s1/p1/f1: w12 -> r1/s1/p1/f2",
                "r1/s1/p1/f1: w13 -> r1/s1/p1/f3"
            ])
        });
        it('returns wirings only for the given consumer', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
            const w12 = wire(f1, "w12", f2)
            const w23 = wire(f2, "w23", f3)
            const spec: SectionSpec = {
                section: new Section("r1", "s1"), 
                instruments: [f1, f2, f3],
                wiring: [w12, w23]
            }

            const m = createInstrumentModel(spec, "r1/s1/p1/f1")
            expect(m.wirings.map(x => x.toString())).to.eql([
                "r1/s1/p1/f1: w12 -> r1/s1/p1/f2"
            ])
        });
    });
});
