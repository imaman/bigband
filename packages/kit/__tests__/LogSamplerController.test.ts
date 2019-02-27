import chai = require('chai');
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import {LogSamplerController} from '../src/logSamplerController'

describe('LogSamplerController', () => {
    it('stores and fetches', async () => {
        const controller = new LogSamplerController({}, '');
        await controller.runLambda({logSamplerStoreRequest: {key: 'K_1', data: {a: 1, b: 2}}}, {});
        const resp = await controller.runLambda({logSamplerFetchRequest: {key: 'K_1'}}, {});
        expect(resp).to.eql({output: {a: 1, b: 2}});
    });
    it('overwrites', async () => {
        const controller = new LogSamplerController({}, '');
        await controller.runLambda({logSamplerStoreRequest: {key: 'K_1', data: {a: 1, b: 2}}}, {});
        await controller.runLambda({logSamplerStoreRequest: {key: 'K_2', data: {a: 2, b: 4}}}, {});
        await controller.runLambda({logSamplerStoreRequest: {key: 'K_1', data: {a: 4, b: 8}}}, {});
        const resp = await controller.runLambda({logSamplerFetchRequest: {key: 'K_1'}}, {});
        expect(resp).to.eql({output: {a: 4, b: 8}});
    });
    it('maintains data for multiple keys at once', async () => {
        const controller = new LogSamplerController({}, '');
        await controller.runLambda({logSamplerStoreRequest: {key: 'K_1', data: {a: 1, b: 2}}}, {});
        await controller.runLambda({logSamplerStoreRequest: {key: 'K_2', data: {a: 2, b: 4}}}, {});
        await controller.runLambda({logSamplerStoreRequest: {key: 'K_3', data: {a: 4, b: 8}}}, {});

        let resp = await controller.runLambda({logSamplerFetchRequest: {key: 'K_1'}}, {});
        expect(resp).to.eql({output: {a: 1, b: 2}});

        resp = await controller.runLambda({logSamplerFetchRequest: {key: 'K_2'}}, {});
        expect(resp).to.eql({output: {a: 2, b: 4}});

        resp = await controller.runLambda({logSamplerFetchRequest: {key: 'K_3'}}, {});
        expect(resp).to.eql({output: {a: 4, b: 8}});
    });
    it('handles non existing keys', async () => {
        const controller = new LogSamplerController({}, '');

        let resp = await controller.runLambda({logSamplerFetchRequest: {key: 'K_1'}}, {});
        expect(resp).to.eql({output: undefined});
    });
})
