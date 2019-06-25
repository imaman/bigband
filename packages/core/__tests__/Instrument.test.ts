import chai = require('chai');
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';


import {Section, DynamoDbInstrument, LambdaInstrument, DynamoDbAttributeType, NameStyle, Bigband} from '../src'

function newLambda(packageName: string[], name: string, controllerPath: string, cloudFormationProperties?) {
    return new LambdaInstrument(packageName, name, controllerPath, cloudFormationProperties);
}


describe('Instruments', () => {
    describe('naming', () => {
        it ('rejects package name that contain dashses', () => {
            expect(() => newLambda(['x-y'], 'abc', '')).to.throw('The hyphen symbol is not allowed in package names. Found: "x-y"');
            expect(() => newLambda(['xy-'], 'abc', '')).to.throw('The hyphen symbol is not allowed in package names. Found: "xy-"');
            expect(() => newLambda(['x', '-', 'y'], 'abc', '')).to.throw('The hyphen symbol is not allowed in package names. Found: "-"');
        });
        it ('rejects package name that contain uppercase letters', () => {
            expect(() => newLambda(['foo', 'Bar'], 'abc', '')).to.throw('Upper-case symbols are not allowed in package names. Found: "Bar"');
            expect(() => newLambda(['Foo', 'bar'], 'abc', '')).to.throw('Upper-case symbols are not allowed in package names. Found: "Foo"');
            expect(() => newLambda(['foo', 'bAr'], 'abc', '')).to.throw('Upper-case symbols are not allowed in package names. Found: "bAr"');
        });
    });

    describe('bigband', () => {
        it('can be initialized from an object', () => {
            const instrument = newLambda(['p1', 'p2', 'p3'], 'abc', '');
            const bigband = new Bigband({
                name: "bigband_1",
                awsAccount: "acc_300",
                profileName: "p_1",
                s3Bucket: "b_1",
                s3Prefix: "s_1"
            });
            const section = new Section(bigband, "eu-central-1", "prod-main");
            expect(instrument.arn(section)).to.equal('arn:aws:lambda:eu-central-1:acc_300:function:bigband_1-prod-main-p1-p2-p3-abc');
        })
    })

    function newBigband(awsAccount, name, s3Bucket, s3Prefix, profileName) {
        return new Bigband({awsAccount, name, s3Bucket, s3Prefix, profileName})
    }

    describe('Lambda', () => {
        it('produces cloudformation', () => {
            const instrument = newLambda(['p1', 'p2', 'p3'], 'abc', '');
            const scope = newBigband("acc_100", "scope_1", "b_1", "s_1", "p_1");
            const section = new Section(scope, "eu-central-1", "prod-main");
            expect(instrument.getPhysicalDefinition(section).get()).to.deep.equal({
                Type: "AWS::Serverless::Function",
                Properties: {
                    FunctionName: "scope_1-prod-main-p1-p2-p3-abc",
                    Handler: "p1-p2-p3-abc_Handler.handle",
                    Runtime: "nodejs8.10",
                    Policies: [],
                    Events: {}
                }
            });
        });
        it('has FQN', () => {
            const instrument = newLambda(['p1', 'p2', 'p3'], 'abc', '');
            expect(instrument.fullyQualifiedName()).to.equal('p1-p2-p3-abc');
        });
        it('has a camel case name (for cloudformation)', () => {
            const instrument = newLambda(['p1', 'p2', 'p3'], 'abc', '');
            expect(instrument.fullyQualifiedName(NameStyle.CAMEL_CASE)).to.equal('p1P2P3Abc');
        });
        it('has ARN', () => {
            const instrument = newLambda(['p1', 'p2', 'p3'], 'abc', '');
            const scope = newBigband("acc_100", "scope_1", "b_1", "s_1", "p_1");
            const section = new Section(scope, "eu-central-1", "prod-main");
            expect(instrument.arn(section)).to.equal('arn:aws:lambda:eu-central-1:acc_100:function:scope_1-prod-main-p1-p2-p3-abc');
        });
        it('contributes to consumers', () => {
            const consumer = newLambda(['p1', 'p2', 'p3'], 'c1', '');
            const supplier = newLambda(['p4', 'p5', 'p6'], 'c2', '');

            const scope = newBigband("acc_100", "scope_1", "b_1", "s_1", "p_2");
            const section = new Section(scope, "eu-central-1", "prod-main");
            supplier.contributeToConsumerDefinition(section, consumer.getDefinition());
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
    describe('Dynamo', () => {
        it('produces yml', () => {
            debugger;
            const instrument = new DynamoDbInstrument(['p1', 'p2', 'p3'], 'table_1', {name: 'id', type: DynamoDbAttributeType.STRING});
            const scope = newBigband("acc_100", "scope_1", "b_1", "s_1", "p_1");
            const section = new Section(scope, "eu-central-1", "prod-main");
            expect(instrument.getPhysicalDefinition(section).get()).to.deep.equal({
                Type: "AWS::DynamoDB::Table",
                Properties: {
                    TableName: "scope_1-prod-main-p1-p2-p3-table_1",
                    AttributeDefinitions: [{
                        AttributeName: "id",
                        AttributeType: "S"
                    }],
                    BillingMode: "PAY_PER_REQUEST",
                    KeySchema: [{
                        AttributeName: "id",
                        KeyType: "HASH"
                    }]
                }
            });
        });
        it('supports sort key', () => {
            const instrument = new DynamoDbInstrument(['p1', 'p2', 'p3'], 'table_1', 
                {name: 'id', type: DynamoDbAttributeType.STRING},
                {name: 'n', type: DynamoDbAttributeType.NUMBER});
            const scope = newBigband("acc_100", "scope_1", "b_1", "s_1", "p_1");
            const section = new Section(scope, "eu-central-1", "prod-main");
            expect(instrument.getPhysicalDefinition(section).get()).to.containSubset({
                Properties: {
                    AttributeDefinitions: [
                        { AttributeName: "id", AttributeType: "S" }, 
                        { AttributeName: "n", AttributeType: "N" }
                    ],
                    KeySchema: [
                        { AttributeName: "id", KeyType: "HASH" },
                        { AttributeName: "n", KeyType: "RANGE" }
                    ]
                }
            });
        });
        it('uses pay-per-request, by default', () => {
            const instrument = new DynamoDbInstrument(['p1', 'p2', 'p3'], 'table_1', 
                {name: 'id', type: DynamoDbAttributeType.STRING});
            const scope = newBigband("acc_100", "scope_1", "b_1", "s_1", "p_1");
            const section = new Section(scope, "eu-central-1", "prod-main");
            expect(instrument.getPhysicalDefinition(section).get()).to.containSubset({
                Properties: {
                    BillingMode: 'PAY_PER_REQUEST'
                }
            });
        });
        it('supports provisioned throughput', () => {
            const instrument = new DynamoDbInstrument(['p1', 'p2', 'p3'], 'table_1', 
                {name: 'id', type: DynamoDbAttributeType.STRING}, 
                undefined,
                {
                  provisioned: {
                      readCapacityUnits: 625,
                      writeCapacityUnits: 576
                  }
                });
            const scope = newBigband("acc_100", "scope_1", "b_1", "s_1", "p_1");
            const section = new Section(scope, "eu-central-1", "prod-main");
            expect(instrument.getPhysicalDefinition(section).get()).to.containSubset({
                Properties: {
                    BillingMode: 'PROVISIONED',
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 625,
                        WriteCapacityUnits: 576
                    }
                }
            });
        });
    });
})

