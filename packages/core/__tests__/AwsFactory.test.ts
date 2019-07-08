import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';


import {AwsFactory} from '../src/AwsFactory'

describe('AwsFactory', () => {
    it('does something', () => {
        const awsFactory = new AwsFactory("my-bigband-name-my-section-name", "myregion", "myprofile") 
        expect(awsFactory.newLambda()).to.exist
        expect(awsFactory.profileName).to.equal("myprofile")
        expect(awsFactory.region).to.equal("myregion")
        expect(awsFactory.stackName).to.equal("my-bigband-name-my-section-name")
    });
})
