import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { LambdaInstrument, Section, wire, Bigband, SectionSpec } from 'bigband-core';
import { SectionModel } from './SectionModel'


describe('SectionModel', () => {
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

            const model = new SectionModel(spec)
            expect(model.instruments.map(i => i.instrument)).to.eql([f1, f2])
        });
    })
});
