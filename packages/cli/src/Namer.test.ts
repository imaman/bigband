import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { LambdaInstrument, Section, Bigband, BigbandSpec } from 'bigband-core';
import { Namer } from './Namer'
import { BigbandModel } from './models/BigbandModel';


describe('Namer', () => {
    const b = new Bigband({
        awsAccount: "a",
        name: "b",
        profileName: "p",
        s3Bucket: "my_bucket",
        s3Prefix: "my_prefix"
    })

    it('computes a ResolvedName for a given instrument', () => {
        const f1 = new LambdaInstrument(["p1", "p2"], "f1", "src/file_1")
        const spec: BigbandSpec = {
            sections: [
                {section: new Section(b, "r1", "s1"),  instruments: [f1], wiring: []}
            ]
        }

        const bm = new BigbandModel(spec, "_")
        const sm = bm.findSectionModel("s1")
        const namer = new Namer(bm, sm)

        const resolvedName = namer.resolve(f1)

        expect(resolvedName.fullyQualifiedName).to.eql("p1-p2-f1")
        expect(resolvedName.physicalName).to.eql("b-s1-p1-p2-f1")
        expect(resolvedName.arn).to.eql("arn:aws:lambda:r1:a:function:b-s1-p1-p2-f1")
    });
});
