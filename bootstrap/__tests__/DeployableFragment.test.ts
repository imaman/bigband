import chai = require('chai');
import chaiSubset = require('chai-subset');
import * as path from 'path';

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';


import {DeployableFragment, DeployableAtom} from '../src/DeployableFragment'

describe('deployablefragment', () => {
    describe('scan', () => {
        
        it('scans the core/src folder', () => {
            const frag = new DeployableFragment();
            frag.scan('x/y', path.join(__dirname, '../../core/src'));

            const arr: DeployableAtom[] = [];
            frag.forEach(a => arr.push(a));

            expect(arr.map(a => a.path)).to.include('x/y/commands/Invoke.ts');
        });

        it('scans this folder', () => {
            const frag = new DeployableFragment();
            frag.scan('x/y', path.join(__dirname, '..'));

            const arr: DeployableAtom[] = [];
            frag.forEach(a => arr.push(a));

            const a = arr.find(a => a.path === 'x/y/__tests__/DeployableFragment.test.ts') as DeployableAtom;
            expect(a.content).to.include("describe('deployablefragment', () => {");
        });
    });
});