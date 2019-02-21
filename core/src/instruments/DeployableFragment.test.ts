import chai = require('chai');
import chaiSubset = require('chai-subset');
import * as path from 'path';

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';


import {DeployableFragment, DeployableAtom} from './Instrument'

describe('deployablefragment', () => {
    describe('scan', () => {
        it('scans this file', () => {
            const frag = new DeployableFragment();
            frag.scan('x/y', path.join(__dirname, '..'));

            const arr: DeployableAtom[] = [];
            frag.forEach(a => arr.push(a));

            expect(arr.map(a => a.path)).to.include('x/y/commands/Invoke.ts');
            const a = arr.find(a => a.path === 'x/y/instruments/DeployableFragment.test.ts') as DeployableAtom;

            expect(a.content).to.include("describe('deployablefragment', () => {");
        });
    });
});