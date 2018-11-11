import chai = require('chai');
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';


import {IsolationScope, Rig, Definition, newLambda, DeployableFragment} from './Instrument'


describe('Instruments', () => {
    describe('Lambda', () => {
        it('produces yml', () => {
            const instrument = newLambda('p1-p2-p3', 'abc', '');
            const scope = new IsolationScope("acc_100", "scope_1", "b_1", "s_1", "p_1");
            const rig = new Rig(scope, "eu-central-1", "prod-main");
            expect(instrument.getPhysicalDefinition(rig).get()).to.deep.equal({
                "p1-p2-p3-abc": {
                    Type: "AWS::Serverless::Function",
                    Properties: {
                        FunctionName: "scope_1-prod-main-p1-p2-p3-abc",
                        Handler: "p1-p2-p3-abc_Handler.handle",
                        Runtime: "nodejs8.10",
                        Policies: [],
                        CodeUri: "s3://b_1/s_1/scope_1-prod-main-p1-p2-p3-abc.zip"            
                    }
                }
            });
        });
        it('has FQN', () => {
            const instrument = newLambda('p1-p2-p3', 'abc', '');
            expect(instrument.fullyQualifiedName()).to.equal('p1-p2-p3-abc');
        });
        it('has ARN', () => {
            const instrument = newLambda('p1-p2-p3', 'abc', '');
            const scope = new IsolationScope("acc_100", "scope_1", "b_1", "s_1", "p_1");
            const rig = new Rig(scope, "eu-central-1", "prod-main");
            expect(instrument.arn(rig)).to.equal('arn:aws:lambda:eu-central-1:acc_100:function:scope_1-prod-main-p1-p2-p3-abc');
        });
        it('contributes to consumers', () => {
            const consumer = newLambda('p1-p2-p3', 'c1', '');
            const supplier = newLambda('p4-p5-p6', 'c2', '');

            const scope = new IsolationScope("acc_100", "scope_1", "b_1", "s_1", "p_2");
            const rig = new Rig(scope, "eu-central-1", "prod-main");
            supplier.contributeToConsumerDefinition(rig, consumer.getDefinition());
            expect(consumer.getDefinition().get()).to.containSubset({Properties: {
                Policies: [{
                    Statement: [{
                        Action: ['lambda:InvokeFunction'],
                        Effect: 'Allow',
                        Resource: 'arn:aws:lambda:eu-central-1:acc_100:function:scope_1-prod-main-p4-p5-p6-c2'
                    }]
                }]
            }});
        });
    });
})

