import chai = require('chai');
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';


import {LogSamplerModel} from '../src/LogSamplerModel'


describe('LogSamplerModel', () => {
    describe('a', () => {
        it ('holds at most N items', () => {
            const model = new LogSamplerModel(3);
            expect(model.size).to.equal(0);

            model.store({key: 'a', data: 'A'});
            model.store({key: 'd', data: 'B'});
            model.store({key: 'c', data: 'C'});
            model.store({key: 'd', data: 'D'});

            expect(model.size).to.equal(3);
        });
        it ('returns null when looking up an non-existing key', () => {
            const model = new LogSamplerModel(3);

            expect(model.fetch('a')).to.be.undefined;
        });
    });

})



