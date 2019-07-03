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
        awsAccount: "a",
        name: "b",
        profileName: "p",
        s3Bucket: "my_bucket",
        s3Prefix: "my_prefix"
    })

    describe("validation", () => {
        describe("the 'bigband' top level package", () => {
            it("is locked for a non system instrument", () => {
                const s = new Section("r1", "s1")
                const instrument = new LambdaInstrument("bigband", "f1", "")
                const model = new InstrumentModel(b, s, instrument, [], false)
    
                expect(() => model.validate()).to.throw(
                    'Instrument "bigband-f1" has a bad name: the fully qualified name of an instrument is not allowed to start with "bigband"')
            })
            it("is locked for a non system instrument also when using the array notation", () => {
                const s = new Section("r1", "s1")
                const instrument = new LambdaInstrument(["bigband"], "f1", "")
                const model = new InstrumentModel(b, s, instrument, [], false)
    
                expect(() => model.validate()).to.throw(
                    'Instrument "bigband-f1" has a bad name: the fully qualified name of an instrument is not allowed to start with "bigband"')
            })    
            it("is not locked for system instruments", () => {
                const s = new Section("r1", "s1")
                const instrument = new LambdaInstrument(["bigband"], "f1", "")
                const model = new InstrumentModel(b, s, instrument, [], true)
    
                expect(() => model.validate()).not.to.throw()
            })    
            it("top level package name which starts with 'bigband' is not locked", () => {
                const s = new Section("r1", "s1")
                const instrument = new LambdaInstrument(["bigband1111"], "f1", "")
                const model = new InstrumentModel(b, s, instrument, [], false)
    
                expect(() => model.validate()).not.to.throw()
            })    
            it("'bigband' is not locked as a non top-level package name", () => {
                const s = new Section("r1", "s1")
                const instrument = new LambdaInstrument(["abc", "bigband"], "f1", "")
                const model = new InstrumentModel(b, s, instrument, [], false)
    
                expect(() => model.validate()).not.to.throw()
            })    
        })
        describe("name", () => {
            const s = new Section("r1", "s1")
            function newInstrumentModel(packageName: string[], name: string) {
                return new InstrumentModel(b, s, new LambdaInstrument(packageName, name, ""), [], false)
            }

            it("allows dash-separated sequences of lower-case letters and digits", () => {
                const model = newInstrumentModel(["p1"], "pqr-st")
                expect(() => model.validate()).not.to.throw()
            });

            it("rejects upper-case letters", () => {
                const model = newInstrumentModel(["p1"], "pQr")
                expect(() => model.validate()).to.throw('Bad instrument name: "p1-pQr')
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

        it('returns an empty array if no wirings were defined', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const spec: SectionSpec = {
                section: new Section("r1", "s1"), 
                instruments: [f1],
                wiring: []
            }

            const sectionModel = createSectionModel(spec)
            expect(sectionModel.instruments[0].wirings).to.eql([])
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

            const sectionModel = createSectionModel(spec)
            expect(sectionModel.instruments[1].wirings).to.eql([])
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

            const sectionModel = createSectionModel(spec)
            expect(sectionModel.instruments[0].wirings).to.eql([w12, w13])
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

            const sectionModel = createSectionModel(spec)
            expect(sectionModel.instruments[0].wirings).to.eql([w12])
        });
    });
});
