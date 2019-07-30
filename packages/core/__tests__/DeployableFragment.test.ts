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
            frag.scan('x/y', path.join(__dirname, '../../cli/src'));

            const arr: DeployableAtom[] = [];
            frag.forEach(a => arr.push(a));

            expect(arr.map(a => a.path)).to.include('x/y/commands/Exec.ts');
        });

        it('scans this folder', () => {
            const frag = new DeployableFragment();
            frag.scan('x/y', path.join(__dirname, '..'));

            const arr: DeployableAtom[] = [];
            frag.forEach(a => arr.push(a));

            const a = arr.find(a => a.path === 'x/y/__tests__/DeployableFragment.test.ts') as DeployableAtom;
            expect(a.content).to.include("describe('deployablefragment', () => {");
        });

        it('uses the given filter', () => {

            function scan(approver: (p: string) => boolean) {
                const frag = new DeployableFragment();
                frag.scan('x/y', path.join(__dirname, '../../cli'), approver)
    
                return frag.all.map(a => a.path)
            }

            const pathsA = scan(() => true)
            expect(pathsA).to.include('x/y/node_modules/uuid/README.md')
            expect(pathsA).to.include('x/y/node_modules/uuid/package.json')
            expect(pathsA).to.include('x/y/node_modules/winston/README.md')
            expect(pathsA).to.include('x/y/node_modules/winston/package.json')

            const pathsB = scan(p => !p.endsWith("winston"))
            expect(pathsB).to.include('x/y/node_modules/uuid/README.md')
            expect(pathsB).to.include('x/y/node_modules/uuid/package.json')
            expect(pathsB).not.to.include('x/y/node_modules/winston/README.md')
            expect(pathsB).not.to.include('x/y/node_modules/winston/package.json')
        })
    });
});