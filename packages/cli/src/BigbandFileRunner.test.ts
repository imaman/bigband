import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { LambdaInstrument, Section, BigbandSpec, Bigband } from 'bigband-core';
import { BigbandFileRunner } from './BigbandFileRunner';
import { BigbandModel } from './models/BigbandModel';
import { DeployMode } from './Packager';
import { S3Ref } from './S3Ref';


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

        function computePushedInstruments(bigbandModel, names) {
            return names.map(curr => bigbandModel.searchInstrument(curr))
                .map(lookupResult => ({
                        physicalName: lookupResult.physicalName,
                        wasPushed: true,
                        model: lookupResult.instrumentModel,
                        s3Ref: new S3Ref("my_bucket", "my_prefix/my_sub_folder")
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
            const bigbandFileRunner = new BigbandFileRunner(bigbandModel, bigbandModel.findSectionModel("s1"), true,
                    DeployMode.IF_CHANGED)            

            const templateBody = bigbandFileRunner.buildCloudFormationTemplate(
                computePushedInstruments(bigbandModel, ["f1"]))

            expect(templateBody).to.eql({
                "AWSTemplateFormatVersion": "2010-09-09",
                "Description": "description goes here",
                "Resources": {
                    "P1F1": {
                        "Properties": {
                            "CodeUri": "s3://my_bucket/my_prefix/my_sub_folder",
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
            const bigbandFileRunner = new BigbandFileRunner(bigbandModel, bigbandModel.findSectionModel("s1"), true,
                    DeployMode.IF_CHANGED)            

            const templateBody = bigbandFileRunner.buildCloudFormationTemplate(computePushedInstruments(bigbandModel, ["this-is-the-name"]))

            expect(templateBody).to.eql({
                "AWSTemplateFormatVersion": "2010-09-09",
                "Description": "description goes here",
                "Resources": {
                    "AbcDefThisIsTheName": {
                        "Properties": {
                            "CodeUri": "s3://my_bucket/my_prefix/my_sub_folder",
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
    })
});
