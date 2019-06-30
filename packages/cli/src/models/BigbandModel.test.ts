import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { BigbandSpec, LambdaInstrument, Section, wire, Bigband } from 'bigband-core';
import { BigbandModel, LookupResult } from './BigbandModel'


describe('BigbandModel', () => {
    const bigbandInit = {
        awsAccount: "a",
        name: "b",
        profileName: "p",
        s3Bucket: "my_bucket",
        s3Prefix: "my_prefix"
    }
    const b = new Bigband(bigbandInit)

    describe("vailidation", () => {
        describe("name", () => {
            function newBigbandModel(name: string) {
                const init = {
                    awsAccount: "a",
                    name,
                    profileName: "p",
                    s3Bucket: "my_bucket",
                    s3Prefix: "my_prefix"
                }
                return new BigbandModel({bigband: new Bigband(init), sections: []}, "_")
            }

            it("allows dash-separated sequences of lower-case letters and digits", () => {
                expect(() => newBigbandModel("pqr-st")).not.to.throw()
            });

            it("rejects upper-case letters", () => {
                expect(() => newBigbandModel("pqr-sT")).to.throw('Bad bigband name: "pqr-sT"')
            });
        })

        describe("wiring", () => {
            it("checks for wiring name collision", () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [{
                        section: new Section("r1", "s1"), 
                        instruments: [f1, f2],
                        wiring: [wire(f1, f2, "a"), wire(f1, f3, "a")]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).to.throw('Name collision(s) in wiring of "b-s1-p1-f1": ["a"]')
            })
            it("allows the same wiring name to be used in two different instruments", () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [{
                        section: new Section("r1", "s1"), 
                        instruments: [f1, f2, f3],
                        wiring: [wire(f1, f2, "a"), wire(f2, f3, "a")]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).not.to.throw()
            })
            it("allows the same wiring name to be used in the same instuments in two different section", () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [
                        {
                            section: new Section("r1", "s1"), 
                            instruments: [f1, f2],
                            wiring: [wire(f1, f2, "a")]
                        },
                        {
                            section: new Section("r1", "s2"), 
                            instruments: [f1, f2],
                            wiring: [wire(f1, f2, "a")]
                        }]
                }

                expect(() => new BigbandModel(spec, "somedir")).not.to.throw()
            })

            it('fails if a wiring references a consumer not listed under instruments', () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [{
                        section: new Section("r1", "s1"), 
                        instruments: [f1],
                        wiring: [wire(f1, f2, "a")]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Instrument "p1-f2" cannot be used as a supplier because it is not a member of the "s1" section')
            })
            it('fails if a wiring references a supplier not listed under instruments', () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [{
                        section: new Section("r1", "s1"), 
                        instruments: [f2],
                        wiring: [wire(f1, f2, "a")]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Instrument "p1-f2" cannot be used as a consumer because it is not a member of the "s1" section')
            })
        })

        describe("section names", () => {
            it("checks for section name collision", () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const f3 = new LambdaInstrument("p1", "f2", "src/file_2")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [
                        { section: new Section("r1", "s1"),  instruments: [f1, f2, f3], wiring: []}
                    ]
                }
                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Instrument name collision. The following names were used by two (or more) instruments: ["b-s1-p1-f2"]')
            });
        })

        describe("instrument names", () => {
            it("checks for instrument name collision", () => {
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [
                        { section: new Section("r1", "s1"),  instruments: [], wiring: []},
                        { section: new Section("r1", "s2"),  instruments: [], wiring: []},
                        { section: new Section("r1", "s3"),  instruments: [], wiring: []},
                        { section: new Section("r1", "s2"),  instruments: [], wiring: []},
                        { section: new Section("r1", "s1"),  instruments: [], wiring: []},
                    ]
                }
                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Section name collision. The following names were used by two (or more) sections: ["s1","s2"]')
            });
        })
    })

    describe("searchInstrument", () => {
        it("finds an instrument if there is an exact physical name match", () => {
            const s1 = new Section("r1", "s1")
            const s2 = new Section("r1", "s2")
            const f1 = new LambdaInstrument("p1", "f1", "")
            const f2 = new LambdaInstrument("p1", "f2", "")
            const f3 = new LambdaInstrument("p1", "f3", "")
            const f4 = new LambdaInstrument("p1", "f4", "")
            const spec: BigbandSpec = {
                bigband: b,
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

            const model = new BigbandModel(spec, "somedir")
            expect(model.searchInstrument("b-s1-p1-f1")).to.containSubset({
                physicalName: 'b-s1-p1-f1',
                instrument: f1,
                section: s1
            })
        })
        it("finds an instrument if there is a unique substring match", () => {
            const s1 = new Section("r1", "s1")
            const s2 = new Section("r1", "s2")
            const f1 = new LambdaInstrument("p1", "f11aa", "")
            const f2 = new LambdaInstrument("p1", "f22bb", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {
                        section: s1, 
                        instruments: [f1, f2],
                        wiring: []
                    },
                    {
                        section: s2, 
                        instruments: [f1, f2],
                        wiring: []
                    }
                ]
            }

            const model = new BigbandModel(spec, "somedir")
            expect(model.searchInstrument("2-p1-f22")).to.containSubset({
                physicalName: 'b-s2-p1-f22bb',
                instrument: f2,
                section: s2
            })
        })
        it("throws if the there is are multiple substring matches", () => {
            const s1 = new Section("r1", "s1")
            const s2 = new Section("r1", "s2")
            const f1 = new LambdaInstrument("p1", "f11aa", "")
            const f2 = new LambdaInstrument("p1", "f22bb", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {
                        section: s1, 
                        instruments: [f1, f2],
                        wiring: []
                    },
                    {
                        section: s2, 
                        instruments: [f1, f2],
                        wiring: []
                    }
                ]
            }

            const model = new BigbandModel(spec, "somedir")
            expect(() => model.searchInstrument("1-f")).to.throw(
                'Multiple matches on "1-f": ["b-s1-p1-f11aa","b-s1-p1-f22bb","b-s2-p1-f11aa","b-s2-p1-f22bb"]')
        })
        it("throws if the there are zero substring matches", () => {
            const s1 = new Section("r1", "s1")
            const s2 = new Section("r1", "s2")
            const f1 = new LambdaInstrument("p1", "f11aa", "")
            const f2 = new LambdaInstrument("p1", "f22bb", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {
                        section: s1, 
                        instruments: [f1, f2],
                        wiring: []
                    },
                    {
                        section: s2, 
                        instruments: [f1, f2],
                        wiring: []
                    }
                ]
            }

            const model = new BigbandModel(spec, "somedir")
            expect(() => model.searchInstrument("f33")).to.throw(
                'Instrument "f33" not found in ["b-s1-p1-f11aa","b-s1-p1-f22bb","b-s2-p1-f11aa","b-s2-p1-f22bb"]')
        })
        it("an exact simple name match, trumps substring matches with other instruments", () => {
            const s1 = new Section("r1", "s1")
            const f1 = new LambdaInstrument("p1", "abc", "")
            const f2 = new LambdaInstrument("abc", "xyz", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [{
                    section: s1, 
                    instruments: [f1, f2],
                    wiring: []
                }]
            }

            const model = new BigbandModel(spec, "somedir")
            expect(model.searchInstrument("abc")).to.containSubset({
                physicalName: 'b-s1-p1-abc',
                instrument: f1,
                section: s1
            })
        })
    })
    describe("searchInstrument", () => {
        it("finds an instrument if there is an exact physical name match", () => {
            const s1 = new Section("r1", "s1")
            const s2 = new Section("r1", "s2")
            const f1 = new LambdaInstrument("p1", "f1", "")
            const f2 = new LambdaInstrument("p1", "f2", "")
            const f3 = new LambdaInstrument("p1", "f3", "")
            const f4 = new LambdaInstrument("p1", "f4", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {section: s1, instruments: [f1, f2], wiring: []},
                    {section: s2, instruments: [f3, f4], wiring: []}
            ]}

            const model = new BigbandModel(spec, "somedir")
            expect(model.computeList()).to.eql({
                b: {
                    s1: {
                        "b-s1-p1-f1": "lambda",
                        "b-s1-p1-f2": "lambda"
                    },
                    s2: {
                        "b-s2-p1-f3": "lambda",
                        "b-s2-p1-f4": "lambda"                        
                    }
                }
            })
        })
    })
});
