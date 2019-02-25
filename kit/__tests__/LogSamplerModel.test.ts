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
        it ('returns the data that was stored under the given key', () => {
            const model = new LogSamplerModel(3);

            model.store({key: 'a', data: 300});
            expect(model.fetch('a')).to.equal(300);
        });
        it ('second store overwrites the previosly stored data', () => {
            const model = new LogSamplerModel(3);

            model.store({key: 'a', data: 300});
            model.store({key: 'a', data: 301});
            expect(model.fetch('a')).to.equal(301);
        });
        it ('when size limit is exceeded it evicts the least recently stored item', () => {
            const model = new LogSamplerModel(3);

            model.store({key: 'a', data: 'A'});
            model.store({key: 'b', data: 'B'});
            model.store({key: 'c', data: 'C'});
            model.store({key: 'd', data: 'D'});

            expect(model.fetch('a')).to.be.undefined;
            expect(model.fetch('b')).to.equal('B');
            expect(model.fetch('c')).to.equal('C');
            expect(model.fetch('d')).to.equal('D');
        });
        it('overtwriting an item does not evict', () => {
            const model = new LogSamplerModel(3);

            model.store({key: 'a', data: 'A'});
            model.store({key: 'b', data: 'B'});
            model.store({key: 'c', data: 'C'});
            model.store({key: 'a', data: 'A2'});

            expect(model.fetch('a')).to.equal('A2');
            expect(model.fetch('b')).to.equal('B');
            expect(model.fetch('c')).to.equal('C');
        });
    });

})



