import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';
import { NameValidator } from '../NameValidator';


describe('NameValidator', () => {
    it("allows dash-separated sequences of lower-case letters and digits", () => {
        expect(NameValidator.isOk("abc-def58-xyz")).to.be.true
        expect(NameValidator.isOk("abc")).to.be.true
        expect(NameValidator.isOk("Abc")).to.be.false
        expect(NameValidator.isOk("abc-Def")).to.be.false
        expect(NameValidator.isOk("58def")).to.be.false
        expect(NameValidator.isOk("abc-58def")).to.be.false
        expect(NameValidator.isOk("abc--def")).to.be.false
        expect(NameValidator.isOk("-abc")).to.be.false
        expect(NameValidator.isOk("abc-")).to.be.false
    });
})
