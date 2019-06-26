import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { BigbandSpec, LambdaInstrument, Section, wire, Bigband, SectionSpec } from 'bigband-core';
import { SectionSpecModel } from './SectionSpecModel'


describe('SectionSpecModel', () => {
    const b = new Bigband({
        awsAccount: "a",
        name: "b",
        profileName: "p",
        s3Bucket: "my_bucket",
        s3Prefix: "my_prefix"
    })

    describe('instruments', () => {
        it('returns all instruments', () => {
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const spec: SectionSpec = {
                section: new Section(b, "r1", "s1"), 
                instruments: [f1, f2],
                wiring: []
            }

            const model = new SectionSpecModel(spec)
            expect(model.instruments).to.eql([f1, f2])
        });
    })

    describe('getWiringsOf', () => {
        it('returns an empty array if no wirings were defined', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const spec: SectionSpec = {
                section: new Section(b, "r1", "s1"), 
                instruments: [f1, f2],
                wiring: []
            }

            const model = new SectionSpecModel(spec)
            expect(model.getWiringsOf(f1)).to.eql([])
        });
        it('returns an empty array if no wirings were defined for the given consumer', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const w12 = wire(f1, f2, "w12")
            const spec: SectionSpec = {
                section: new Section(b, "r1", "s1"), 
                instruments: [f1, f2],
                wiring: [w12]
            }

            const model = new SectionSpecModel(spec)
            expect(model.getWiringsOf(f2)).to.eql([])
        });
        it('returns all wirings for the given consumer', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
            const w12 = wire(f1, f2, "w12")
            const w13 = wire(f1, f3, "w13")
            const spec: SectionSpec = {
                section: new Section(b, "r1", "s1"), 
                instruments: [f1, f2, f3],
                wiring: [w12, w13]
            }

            const model = new SectionSpecModel(spec)
            expect(model.getWiringsOf(f1)).to.eql([w12, w13])
        });
        it('returns wirings only for the given consumer', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
            const w12 = wire(f1, f2, "w12")
            const w23 = wire(f2, f3, "w23")
            const spec: SectionSpec = {
                section: new Section(b, "r1", "s1"), 
                instruments: [f1, f2, f3],
                wiring: [w12, w23]
            }

            const model = new SectionSpecModel(spec)
            expect(model.getWiringsOf(f1)).to.eql([w12])
        });
    });
});
