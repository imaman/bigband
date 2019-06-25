import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import {grantPermission} from './BigbandFileRunner'
import { LambdaInstrument } from 'bigband-core';


describe('BigbandFileRunner', () => {
    describe('grantPermission', () => {
        it('adds a statement to the definition', async () => {
            const ins = new LambdaInstrument("p1", "n1", "src/somefile")
            grantPermission(ins, "MY_ACTION", "MY_ARN")
            const obj = ins.getDefinition().get()
            expect(obj.Properties.Policies).to.eql([{
                Statement: [{
                    Action: ["MY_ACTION"],
                    Effect: "Allow",
                    Resource: "MY_ARN"
                }],
                Version: "2012-10-17"
            }])
        });
        it('allows adding multiple statements', async () => {
            const ins = new LambdaInstrument("p1", "n1", "src/somefile")
            grantPermission(ins, "MY_ACTION_1", "MY_ARN_1")
            grantPermission(ins, "MY_ACTION_2", "MY_ARN_2")
            const obj = ins.getDefinition().get()
            expect(obj.Properties.Policies).to.eql([
                {
                    Statement: [{
                        Action: ["MY_ACTION_1"],
                        Effect: "Allow",
                        Resource: "MY_ARN_1"
                    }],
                    Version: "2012-10-17"
                }, 
                {
                    Statement: [{
                        Action: ["MY_ACTION_2"],
                        Effect: "Allow",
                        Resource: "MY_ARN_2"
                    }],
                    Version: "2012-10-17"
                }
            ])
        });
    });
});
