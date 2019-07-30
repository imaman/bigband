import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { BigbandSpec, Role, LambdaInstrument, Section, wire, Bigband } from 'bigband-core';
import { BigbandModel } from './BigbandModel'
import { CloudProvider } from '../CloudProvider';


describe('BigbandModel', () => {
    const bigbandInit = {
        awsAccount: "a",
        name: "b",
        profileName: CloudProvider.UNIT_TESTING_PROFILE_NAME,
        s3Prefix: "my_prefix",
        s3BucketGuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    }
    const b = new Bigband(bigbandInit)

    describe("vailidation", () => {
        describe("name", () => {
            function newBigbandModel(name: string) {
                const init = {
                    awsAccount: "a",
                    name,
                    profileName: "p",
                    s3Prefix: "my_prefix",
                    s3BucketGuid: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
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
                        instruments: [f1, f2, f3],
                        wiring: [wire(f1, "a", f2), wire(f1, "a", f3)]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Name collision(s) in wiring of "b-s1-p1-f1": ["a"]')
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
                        wiring: [wire(f1, "a", f2), wire(f2, "a", f3)]
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
                            wiring: [wire(f1, "a", f2)]
                        },
                        {
                            section: new Section("r1", "s2"), 
                            instruments: [f1, f2],
                            wiring: [wire(f1, "a", f2)]
                        }]
                }

                expect(() => new BigbandModel(spec, "somedir")).not.to.throw()
            })

            it('fails if a wire references a consumer not listed under instruments', () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p2", "f2", "src/file_2")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [{
                        section: new Section("r1", "s1"), 
                        instruments: [f1],
                        wiring: [wire(f1, "a", f2)]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Section r1/s1 does not contain an instrument at sub path ("p2/f2")')
            })
            it('fails if a wire references a dangling supplier', () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [{
                        section: new Section("r1", "s1"), 
                        instruments: [f2],
                        wiring: [wire(f1, "a", f2)]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Section r1/s1 does not contain an instrument at sub path ("p1/f1")')
            })
            it('fails if a wire references a dangling section', () => {
                const f1 = new LambdaInstrument("p1", "f1", "src/file_1")
                const f2 = new LambdaInstrument("p1", "f2", "src/file_2")

                const s2 = new Section("r1", "s2")
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [{
                        section: new Section("r1", "s1"), 
                        instruments: [f1, f2],
                        wiring: [wire(f1, "a", f2, s2)]
                    }]
                }

                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Bad wire. Supplier section "r1/s2" is not a member of the bigband')
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
                    'Instrument path collision. two (or more) instruments share the same path: "r1/s1/p1/f2"')
            });
        })

        describe("instrument names", () => {
            it("checks for instrument name collision", () => {
                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [
                        { section: new Section("r1", "s1"),  instruments: [], wiring: []},
                        { section: new Section("r1", "s2"),  instruments: [], wiring: []},
                        { section: new Section("r1", "s1"),  instruments: [], wiring: []},
                        { section: new Section("r1", "s3"),  instruments: [], wiring: []},
                    ]
                }
                expect(() => new BigbandModel(spec, "somedir")).to.throw(
                    'Section path collision. two (or more) sections share the same path: "r1/s1"')
            });
        })
    })
    describe("navigate", () => {
        it("it returns all instruments at the given path", async () => {
            const s1 = new Section("r1", "s1")
            const f1 = new LambdaInstrument(["p1", "p2"], "f1", "")
            const f2 = new LambdaInstrument(["p1", "p2"], "f2", "")
            const f3 = new LambdaInstrument(["p1"], "f3", "")
            const f4 = new LambdaInstrument(["p1", "p2", "p3"], "f4", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [{section: s1, instruments: [f1, f2, f3, f4], wiring: []}
            ]}

            const model = new BigbandModel(spec, "somedir")
            const actual = await model.inspect("r1/s1/p1")
            expect(actual).to.eql({
                list: [
                    {path: "r1/s1/p1/f3", role: Role.INSTRUMENT, type: 'lambda'},
                    {path: "r1/s1/p1/p2", role: Role.PATH}
                ]
            })
        })
        it("it returns regions when no path is given", async () => {
            const s1 = new Section("r1", "s1")
            const f1 = new LambdaInstrument(["p1", "p2"], "f1", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [{section: s1, instruments: [f1], wiring: []}
            ]}

            const model = new BigbandModel(spec, "somedir")
            const actual = await model.inspect("")
            expect(actual).to.eql({
                list: [
                    { path: "r1", role: Role.REGION }
                ]
            })
        })
        it("it shows sections when given the region as a path", async () => {
            const s1 = new Section("region_a", "s1")
            const s2 = new Section("region_b", "s2")
            const s3 = new Section("region_a", "s3")
            const f1 = new LambdaInstrument(["p1", "p2"], "f1", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {section: s1, instruments: [f1], wiring: []},
                    {section: s2, instruments: [f1], wiring: []},
                    {section: s3, instruments: [f1], wiring: []}
            ]}

            const model = new BigbandModel(spec, "somedir")
            const actual = await model.inspect("region_a")
            expect(actual).to.eql({
                list: [
                    { path: "region_a/s1", role: Role.SECTION },
                    { path: "region_a/s3", role: Role.SECTION }
                ]
            })
        })
        it("it shows an instrument when given the full path to it", async () => {
            const s1 = new Section("reg-a", "sec-a")
            const f1 = new LambdaInstrument(["p1", "p2"], "f1", "")
            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {section: s1, instruments: [f1], wiring: []},
            ]}

            const model = new BigbandModel(spec, "somedir")
            const actual = await model.inspect("reg-a/sec-a/p1/p2/f1")

            expect(actual).to.containSubset({
                "list": [
                    {
                        "role": Role.LOCAL_COMMAND,
                        "path": "reg-a/sec-a/p1/p2/f1/def"
                    },
                    {
                        "role": Role.COMMAND,
                        "path": "reg-a/sec-a/p1/p2/f1/desc"
                    },
                    {
                        "role": Role.COMMAND,
                        "path": "reg-a/sec-a/p1/p2/f1/exec"
                    },
                    {
                        "role": Role.COMMAND,
                        "path": "reg-a/sec-a/p1/p2/f1/logs"
                    }
                ]}                     
                    // { path: "reg-a/sec-a/p1/p2/f1", role: Role.INSTRUMENT, type: 'lambda' }
            )
        })
    })
});
