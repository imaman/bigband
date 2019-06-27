import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { BigbandSpec, LambdaInstrument, Section, wire, Bigband } from 'bigband-core';
import { BigbandModel, LookupResult } from './BigbandModel'


describe('BigbandModel', () => {
    const b = new Bigband({
        awsAccount: "a",
        name: "b",
        profileName: "p",
        s3Bucket: "my_bucket",
        s3Prefix: "my_prefix"
    })

    describe("vailidation", () => {
        describe("wiring", () => {
            it("checks for wiring name collision", () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const f3 = new LambdaInstrument("p1", "f3", "src/file_3")
                const spec: BigbandSpec = {
                    sections: [{
                        section: new Section(b, "r1", "s1"), 
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
                    sections: [{
                        section: new Section(b, "r1", "s1"), 
                        instruments: [f1, f2],
                        wiring: [wire(f1, f2, "a"), wire(f2, f3, "a")]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).not.to.throw()
            })
            it("allows the same wiring name to be used in the same instuments in two different section", () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const spec: BigbandSpec = {
                    sections: [
                        {
                            section: new Section(b, "r1", "s1"), 
                            instruments: [f1, f2],
                            wiring: [wire(f1, f2, "a")]
                        },
                        {
                            section: new Section(b, "r1", "s2"), 
                            instruments: [f1, f2],
                            wiring: [wire(f1, f2, "a")]
                        }]
                }

                expect(() => new BigbandModel(spec, "somedir")).not.to.throw()
            })
        })

        describe("section names", () => {
            it("checks for section name collision", () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const f3 = new LambdaInstrument("p1", "f2", "src/file_2")
                const spec: BigbandSpec = {
                    sections: [
                        { section: new Section(b, "r1", "s1"),  instruments: [f1, f2, f3], wiring: []}
                    ]
                }
                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Instrument name collision. The following names were used by two (or more) instruments: ["b-s1-p1-f2"]')
            });
        })

        describe("instrument names", () => {
            it("checks for instrument name collision", () => {
                const spec: BigbandSpec = {
                    sections: [
                        { section: new Section(b, "r1", "s1"),  instruments: [], wiring: []},
                        { section: new Section(b, "r1", "s2"),  instruments: [], wiring: []},
                        { section: new Section(b, "r1", "s3"),  instruments: [], wiring: []},
                        { section: new Section(b, "r1", "s2"),  instruments: [], wiring: []},
                        { section: new Section(b, "r1", "s1"),  instruments: [], wiring: []},
                    ]
                }
                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Section name collision. The following names were used by two (or more) sections: ["s1","s2"]')
            });
        })
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

            const model = new BigbandModel(spec, "somedir")
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

            const model = new BigbandModel(spec, "somedir")
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

            const model = new BigbandModel(spec, "somedir")
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

            const model = new BigbandModel(spec, "somedir")
            expect(model.assignedInstruments).to.eql([
                {section: s1, instrument: f1},
                {section: s1, instrument: f2},
                {section: s2, instrument: f3},
                {section: s2, instrument: f4},
            ])
        });
    });
    describe("searchInstrument", () => {
        it("finds an instrument if there is an exact physical name match", () => {
            const s1 = new Section(b, "r1", "s1")
            const s2 = new Section(b, "r1", "s2")
            const f1 = new LambdaInstrument("p1", "f1", "")
            const f2 = new LambdaInstrument("p1", "f2", "")
            const f3 = new LambdaInstrument("p1", "f3", "")
            const f4 = new LambdaInstrument("p1", "f4", "")
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

            const model = new BigbandModel(spec, "somedir")
            expect(model.searchInstrument("b-s1-p1-f1")).to.eql({
                name: 'b-s1-p1-f1',
                instrument: f1,
                section: s1
            })
        })
        it("finds an instrument if there is a unique substring match", () => {
            const s1 = new Section(b, "r1", "s1")
            const s2 = new Section(b, "r1", "s2")
            const f1 = new LambdaInstrument("p1", "f11aa", "")
            const f2 = new LambdaInstrument("p1", "f22bb", "")
            const spec: BigbandSpec = {
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
            expect(model.searchInstrument("2-p1-f22")).to.eql({
                name: 'b-s2-p1-f22bb',
                instrument: f2,
                section: s2
            })
        })
        it("throws if the there is are multiple substring matches", () => {
            const s1 = new Section(b, "r1", "s1")
            const s2 = new Section(b, "r1", "s2")
            const f1 = new LambdaInstrument("p1", "f11aa", "")
            const f2 = new LambdaInstrument("p1", "f22bb", "")
            const spec: BigbandSpec = {
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
            const s1 = new Section(b, "r1", "s1")
            const s2 = new Section(b, "r1", "s2")
            const f1 = new LambdaInstrument("p1", "f11aa", "")
            const f2 = new LambdaInstrument("p1", "f22bb", "")
            const spec: BigbandSpec = {
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
            const s1 = new Section(b, "r1", "s1")
            const f1 = new LambdaInstrument("p1", "abc", "")
            const f2 = new LambdaInstrument("abc", "xyz", "")
            const spec: BigbandSpec = {
                sections: [{
                    section: s1, 
                    instruments: [f1, f2],
                    wiring: []
                }]
            }

            const model = new BigbandModel(spec, "somedir")
            expect(model.searchInstrument("abc")).to.eql({
                name: 'b-s1-p1-abc',
                instrument: f1,
                section: s1
            })
        })
    })
});
