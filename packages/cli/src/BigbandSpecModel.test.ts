import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { BigbandSpec, LambdaInstrument, Section, wire, Bigband } from 'bigband-core';
import { BigbandSpecModel } from './BigbandSpecModel'


describe('BigbandSpecModel', () => {
    const b = new Bigband({
        awsAccount: "a",
        name: "b",
        profileName: "p",
        s3Bucket: "my_bucket",
        s3Prefix: "my_prefix"
    })

    describe('instruments', () => {
        it('returns all instruments', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const spec: BigbandSpec = {
                sections: [{
                    section: new Section(b, "r1", "s1"), 
                    instruments: [f1, f2],
                    wiring: []
                }]
            }

            const model = new BigbandSpecModel(spec)
            expect(model.instruments).to.eql([f1, f2])
        });
        it('returns all instruments from multiple sections', async () => { 
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
            const f4 = new LambdaInstrument("p1", "f4", "src/file_4")
            const spec: BigbandSpec = {
                sections: [
                    {
                        section: new Section(b, "r1", "s1"), 
                        instruments: [f1, f2],
                        wiring: []
                    },
                    {
                        section: new Section(b, "r1", "s2"), 
                        instruments: [f3, f4],
                        wiring: []
                    }
                ]
            }

            const model = new BigbandSpecModel(spec)
            expect(model.instruments).to.eql([f1, f2, f3, f4])
        });
    });
    describe('sections', () => {
        it('returns all sections', () => {
            const s1 = new Section(b, "r1", "s1")
            const s2 = new Section(b, "r1", "s2")
            const spec: BigbandSpec = {
                sections: [
                    {
                        section: s1, 
                        instruments: [],
                        wiring: []
                    },
                    {
                        section: s2, 
                        instruments: [],
                        wiring: []
                    }
                ]
            }

            const model = new BigbandSpecModel(spec)
            expect(model.sections).to.eql([s1, s2])
        })
    })
    describe('assignedInstruments', () => {
        it('returns instrument-section pairs', async () => { 
            const s1 = new Section(b, "r1", "s1")
            const s2 = new Section(b, "r1", "s2")
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
            const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
            const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
            const f4 = new LambdaInstrument("p1", "f4", "src/file_4")
            const spec: BigbandSpec = {
                sections: [
                    {
                        section: s1, 
                        instruments: [f1, f2],
                        wiring: []
                    },
                    {
                        section: s2, 
                        instruments: [f3, f4],
                        wiring: []
                    }
                ]
            }

            const model = new BigbandSpecModel(spec)
            expect(model.assignedInstruments).to.eql([
                {section: s1, instrument: f1},
                {section: s1, instrument: f2},
                {section: s2, instrument: f3},
                {section: s2, instrument: f4},
            ])
        });
    });
});
