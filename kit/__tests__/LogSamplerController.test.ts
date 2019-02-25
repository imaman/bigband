import chai = require('chai');
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import {LogSamplerController} from '../src/logSamplerController'

describe('LogSamplerController', () => {
    it ('stores and fetches', async () => {
        const controller = new LogSamplerController({}, '');
        await controller.runLambda({logSamplerStoreRequest: {key: 'K_1', data: {a: 1, b: 2}}}, {});
        const ret = await controller.runLambda({logSamplerFetchRequest: {key: 'K_1'}}, {});
        expect(ret).to.eql({output: {a: 1, b: 2}});
    });
})
