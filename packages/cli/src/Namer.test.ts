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

    describe("resolve", () => {
        it('computes a ResolvedName for a given instrument', () => {
            const f1 = new LambdaInstrument(["p1", "p2"], "f1", "src/file_1")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {section: new Section("r1", "s1"),  instruments: [f1], wiring: []}
                ]
            }
            
            const bm = new BigbandModel(spec, "_")
            const namer = new Namer(b, bm.findSectionModel("s1").section)
            
            const resolvedName = namer.resolve(f1)
            
            expect(resolvedName.fullyQualifiedName).to.eql("p1-p2-f1")
            expect(resolvedName.physicalName).to.eql("b-s1-p1-p2-f1")
            expect(resolvedName.arn).to.eql("arn:aws:lambda:r1:a:function:b-s1-p1-p2-f1")
        });
    })


    describe("physical definition", () => {
        it("computes it", () => {
            const f1 = new LambdaInstrument(["p1", "p2"], "f1", "src/file_1")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {section: new Section("r1", "s1"),  instruments: [f1], wiring: []}
                ]
            }
            
            const bm = new BigbandModel(spec, "_")
            const namer = new Namer(b, bm.findSectionModel("s1").section)
            
            const def = namer.getPhysicalDefinition(f1)
            
            expect(def.get()).to.eql({
                Type: "AWS::Serverless::Function",
                Properties: {
                    Events: {},
                    FunctionName: "b-s1-p1-p2-f1",
                    Handler: "p1-p2-f1_Handler.handle",
                    Policies: [],
                    Runtime: "nodejs8.10"
                }
            })
        })
    })

    describe("toPascalCase", () => {
        it("concatenates tokens, capitalizing the first letter", () => {
            expect(Namer.toPascalCase(["buffered", "input", "stream"])).to.equal("BufferedInputStream")
        })
        it("rejects inputs with capital letters", () => {
            expect(() => Namer.toPascalCase(["buffered", "inPut", "stream"]))
                    .to.throw("One of the tokens contains a capital letter")
        })
        it("rejects inputs with multiple consecutive dash signs", () => {
            expect(() => Namer.toPascalCase(["buffered--input", "stream-"]))
                    .to.throw('One of the tokens ("buffered--input") contains multiple consecutive dash signs')
        })
        it("it treats dash-separated tokens as individual tokens", () => {
            expect(Namer.toPascalCase(["buffered-input-stream"])).to.equal("BufferedInputStream")
        })
    })

});
