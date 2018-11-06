import chai = require('chai');
import chaiSubset = require('chai-subset');
import * as JSZip from 'jszip';

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';


import {IsolationScope, Rig, Definition, Deployable, newLambda, DeployableFragment} from './Instrument'


describe('Instruments', () => {

    describe('Definition', () => {
        it('should generate yml', () => {
            let d = new Definition({ a: ['a1', 'a2', 'a3'], b: 2, c: "THIS IS C" });
            expect(d.toYml().trim()).to.equal([
                'a:',
                '    - a1',
                '    - a2',
                '    - a3',
                'b: 2',
                "c: 'THIS IS C'"].join('\n'));
        });
    });

    describe('Lambda', () => {
        it('produces yml', () => {
            const instrument = newLambda('p1-p2-p3', 'abc', '');
            const scope = new IsolationScope("acc_100", "scope_1", "b_1", "s_1");
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
            const scope = new IsolationScope("acc_100", "scope_1", "b_1", "s_1");
            const rig = new Rig(scope, "eu-central-1", "prod-main");
            expect(instrument.arn(rig)).to.equal('arn:aws:lambda:eu-central-1:acc_100:function:scope_1-prod-main-p1-p2-p3-abc');
        });
        it('contributes to consumers', () => {
            const consumer = newLambda('p1-p2-p3', 'c1', '');
            const supplier = newLambda('p4-p5-p6', 'c2', '');

            const scope = new IsolationScope("acc_100", "scope_1", "b_1", "s_1");
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
        it('contributes to deployable', async () => {
            const f = newLambda('p1-p2-p3', 'c1', "x/y/MyController.js");

            const frag = f.createFragment();
            const d = new Deployable();
            d.add(frag);

            const jsZip = new JSZip();
            d.storeIn(jsZip);

            const content = await jsZip.file('p1-p2-p3-c1_Handler.js').async('string');
            expect(content).to.include("const c = require('x/y/MyController.js');");
        });
    });
})

