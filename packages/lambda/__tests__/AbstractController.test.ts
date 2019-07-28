import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';


import {AbstractController} from '../src/AbstractController'

describe('AbstractController', () => {
    it('does something', () => {
        expect(5).to.eql(6)
    });
})

