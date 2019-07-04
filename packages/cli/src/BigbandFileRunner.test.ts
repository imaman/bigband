import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { LambdaInstrument, Section, BigbandSpec, Bigband, wire } from 'bigband-core';
import { BigbandFileRunner } from './BigbandFileRunner';
import { BigbandModel } from './models/BigbandModel';
import { DeployMode } from './Packager';
import { S3Ref } from './S3Ref';
import { InstrumentModel } from './models/InstrumentModel';


describe('BigbandFileRunner', () => {
    const bigbandInit = {
        awsAccount: "a",
        name: "b",
        profileName: "p",
        s3Bucket: "my_bucket",
        s3Prefix: "my_prefix"
    }
    const b = new Bigband(bigbandInit)

    describe("cloudformation template generation", () => {

        function computePushedInstruments(bigbandModel: BigbandModel, names) {
            return names.map(curr => bigbandModel.getInstrument(curr))
                .map((im: InstrumentModel) => ({
                        physicalName: im.physicalName,
                        wasPushed: true,
                        model: im,
                        s3Ref: new S3Ref("my_bucket", `my_prefix/${im.physicalName}.zip`)
                    }))
        }
        it("places the definition inside template", () => {
            const f1 = new LambdaInstrument("p1", "f1", "src/file_1")

            const spec: BigbandSpec = {
                bigband: b,
                sections: [{
                    section: new Section("r1", "s1"), 
                    instruments: [f1],
                    wiring: []
                }]
            }

            const bigbandModel = new BigbandModel(spec, "somedir")
            const bigbandFileRunner = new BigbandFileRunner(bigbandModel, bigbandModel.findSectionModel("r1/s1"), true,
                    DeployMode.IF_CHANGED)            

            const templateBody = bigbandFileRunner.buildCloudFormationTemplate(
                computePushedInstruments(bigbandModel, ["r1/s1/p1/f1"]))

            expect(templateBody).to.eql({
                "AWSTemplateFormatVersion": "2010-09-09",
                "Description": "description goes here",
                "Resources": {
                    "P1F1": {
                        "Properties": {
                            "CodeUri": "s3://my_bucket/my_prefix/b-s1-p1-f1.zip",
                            "Events": {},
                            "FunctionName": "b-s1-p1-f1",
                            "Handler": "p1-f1_Handler.handle",
                            "Policies": [],
                            "Runtime": "nodejs8.10",
                        },
                        "Type": "AWS::Serverless::Function",
                    }
                },
                "Transform": "AWS::Serverless-2016-10-31"
            })
        })
        it("generates a logicl ID by pascal-casing the fully-qualified name", () => {
            const f1 = new LambdaInstrument(["abc", "def"], "this-is-the-name", "src/file_1")

            const spec: BigbandSpec = {
                bigband: b,
                sections: [{
                    section: new Section("r1", "s1"), 
                    instruments: [f1],
                    wiring: []
                }]
            }

            const bigbandModel = new BigbandModel(spec, "somedir")
            const bigbandFileRunner = new BigbandFileRunner(bigbandModel, bigbandModel.findSectionModel("r1/s1"), true,
                    DeployMode.IF_CHANGED)            

            const templateBody = bigbandFileRunner.buildCloudFormationTemplate(computePushedInstruments(bigbandModel, 
                ["r1/s1/abc/def/this-is-the-name"]))

            expect(templateBody).to.eql({
                "AWSTemplateFormatVersion": "2010-09-09",
                "Description": "description goes here",
                "Resources": {
                    "AbcDefThisIsTheName": {
                        "Properties": {
                            "CodeUri": "s3://my_bucket/my_prefix/b-s1-abc-def-this-is-the-name.zip",
                            "Events": {},
                            "FunctionName": "b-s1-abc-def-this-is-the-name",
                            "Handler": "abc-def-this-is-the-name_Handler.handle",
                            "Policies": [],
                            "Runtime": "nodejs8.10",
                        },
                        "Type": "AWS::Serverless::Function",
                    }
                },
                "Transform": "AWS::Serverless-2016-10-31"
            })
        })
        describe("wiring", () => {
            it("allows wiring within the same section", () => {
                const f1 = new LambdaInstrument(["p1"], "f1", "src/file_1")
                const f2 = new LambdaInstrument(["p2"], "f2", "src/file_1")

                const spec: BigbandSpec = {
                    bigband: b,
                    sections: [{
                        section: new Section("r1", "s1"), 
                        instruments: [f1, f2],
                        wiring: [wire(f1, "w1", f2)]
                    }]
                }

                const bigbandModel = new BigbandModel(spec, "somedir")
                const bigbandFileRunner = new BigbandFileRunner(bigbandModel, bigbandModel.findSectionModel("r1/s1"), true,
                        DeployMode.IF_CHANGED)            

                const templateBody = bigbandFileRunner.buildCloudFormationTemplate(
                    computePushedInstruments(bigbandModel, ["r1/s1/p1/f1", "r1/s1/p2/f2"]))


                console.log(JSON.stringify(templateBody, null, 2))
                expect(templateBody).to.eql({
                    "AWSTemplateFormatVersion": "2010-09-09",
                    "Transform": "AWS::Serverless-2016-10-31",
                    "Description": "description goes here",
                    "Resources": {
                        "P1F1": {
                            "Type": "AWS::Serverless::Function",
                            "Properties": {
                                "Runtime": "nodejs8.10",
                                "Policies": [
                                {
                                    "Version": "2012-10-17",
                                    "Statement": [{
                                        "Effect": "Allow",
                                        "Action": ["lambda:InvokeFunction" ],
                                        "Resource": "arn:aws:lambda:r1:a:function:b-s1-p2-f2"
                                    }]
                                }
                                ],
                                "Events": {},
                                "Handler": "p1-f1_Handler.handle",
                                "FunctionName": "b-s1-p1-f1",
                                "CodeUri": "s3://my_bucket/my_prefix/b-s1-p1-f1.zip"
                            }
                        },
                        "P2F2": {
                            "Type": "AWS::Serverless::Function",
                            "Properties": {
                                "Runtime": "nodejs8.10",
                                "Policies": [],
                                "Events": {},
                                "Handler": "p2-f2_Handler.handle",
                                "FunctionName": "b-s1-p2-f2",
                                "CodeUri": "s3://my_bucket/my_prefix/b-s1-p2-f2.zip"
                            }
                        }
                    }
                })
            })
        })
        it("allows cross-section wiring", () => {
            const f1 = new LambdaInstrument(["p1"], "f1", "src/file_1")
            const f2 = new LambdaInstrument(["p2"], "f2", "src/file_1")

            const s1 = new Section("r1", "s1")
            const s2 = new Section("r2", "s2")

            const spec: BigbandSpec = {
                bigband: b,
                sections: [
                    {
                        section: s1,
                        instruments: [f1],
                        wiring: [wire(f1, "w1", f2, s2)]
                    },
                    {
                        section: s2,
                        instruments: [f2],
                        wiring: []
                    }
                ]
            }

            const bigbandModel = new BigbandModel(spec, "somedir")
            const bigbandFileRunner = new BigbandFileRunner(bigbandModel, bigbandModel.findSectionModel("r1/s1"), true,
                    DeployMode.IF_CHANGED)            

            const templateBody = bigbandFileRunner.buildCloudFormationTemplate(
                computePushedInstruments(bigbandModel, ["r1/s1/p1/f1"]))

            expect(templateBody).to.eql({
                "AWSTemplateFormatVersion": "2010-09-09",
                "Transform": "AWS::Serverless-2016-10-31",
                "Description": "description goes here",
                "Resources": {
                    "P1F1": {
                        "Type": "AWS::Serverless::Function",
                        "Properties": {
                            "Runtime": "nodejs8.10",
                            "Policies": [
                            {
                                "Version": "2012-10-17",
                                "Statement": [{
                                    "Effect": "Allow",
                                    "Action": ["lambda:InvokeFunction" ],
                                    "Resource": "arn:aws:lambda:r2:a:function:b-s2-p2-f2"
                                }]
                            }
                            ],
                            "Events": {},
                            "Handler": "p1-f1_Handler.handle",
                            "FunctionName": "b-s1-p1-f1",
                            "CodeUri": "s3://my_bucket/my_prefix/b-s1-p1-f1.zip"
                        }
                    }
                }
            })
        })
    })
});
