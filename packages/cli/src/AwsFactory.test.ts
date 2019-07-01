import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import { AwsFactory } from './AwsFactory'
import { SectionModel } from './models/SectionModel';
import { Bigband, SectionSpec, Section } from 'bigband-core';


describe('AwsFactory', () => {
    it('does something', () => {
        const bigband = new Bigband({
            awsAccount: "myaccount",
            name: "my-bigband-name",
            profileName: "myprofile",
            s3Bucket: "mybucket",
            s3Prefix: "myprefix"
        })

        const sectionSpec: SectionSpec = {
            section: new Section("myregion", "my-section-name"),
            instruments: [],
            wiring: []
        }

        const awsFactory = AwsFactory.fromSection(new SectionModel(bigband, sectionSpec))
        expect(awsFactory.newLambda()).to.exist
        expect(awsFactory.profileName).to.equal("myprofile")
        expect(awsFactory.region).to.equal("myregion")
        expect(awsFactory.stackName).to.equal("my-bigband-name-my-section-name")
    });
})
