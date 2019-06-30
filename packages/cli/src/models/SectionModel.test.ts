import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { LambdaInstrument, Section, Bigband, SectionSpec } from 'bigband-core';
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
                section: new Section("r1", "s1"), 
                instruments: [f1, f2],
                wiring: []
            }

            const model = new SectionModel(b, spec)
            expect(model.instruments.map(i => i.instrument)).to.eql([f1, f2])
        });
    })
    describe("validation", () => {
        describe("name", () => {
            it("can be made of a combination of lowercase letters and the dash sign", () => {
                const spec: SectionSpec = {
                    section: new Section("r1", "abc-def-xyz"), 
                    instruments: [],
                    wiring: []
                }
    
                const model = new SectionModel(b, spec)
                expect(() => model.validate()).not.to.throw()
            });
            it("can contain just lowercase letters", () => {
                const spec: SectionSpec = {
                    section: new Section("r1", "abc"), 
                    instruments: [],
                    wiring: []
                }
    
                const model = new SectionModel(b, spec)
                expect(() => model.validate()).not.to.throw()
            });
            it("upper case letters are not allowed", () => {
                const spec: SectionSpec = {
                    section: new Section("r1", "Abc"), 
                    instruments: [],
                    wiring: []
                }
    
                const model = new SectionModel(b, spec)
                expect(() => model.validate()).to.throw('Bad section name: "Abc"')
            });
            it("upper case letters are not allowed also after dashses", () => {
                const spec: SectionSpec = {
                    section: new Section("r1", "abc-Def"), 
                    instruments: [],
                    wiring: []
                }
    
                const model = new SectionModel(b, spec)
                expect(() => model.validate()).to.throw('Bad section name: "abc-Def"')
            });
            it("multiple consecutive dash-signs are not allowed", () => {
                const spec: SectionSpec = {
                    section: new Section("r1", "abc--def"), 
                    instruments: [],
                    wiring: []
                }
    
                const model = new SectionModel(b, spec)
                expect(() => model.validate()).to.throw('Bad section name: "abc--def"')
            });
            it("dash-sign is not allowed at the very beginning", () => {
                const spec: SectionSpec = {
                    section: new Section("r1", "-abc"), 
                    instruments: [],
                    wiring: []
                }
    
                const model = new SectionModel(b, spec)
                expect(() => model.validate()).to.throw('Bad section name: "-abc"')
            });
            it("dash-sign is not allowed at the very end", () => {
                const spec: SectionSpec = {
                    section: new Section("r1", "abc-"), 
                    instruments: [],
                    wiring: []
                }
    
                const model = new SectionModel(b, spec)
                expect(() => model.validate()).to.throw('Bad section name: "abc-"')
            });
        })
    })
});
