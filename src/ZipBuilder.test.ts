import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import {ZipBuilder} from './ZipBuilder'
import * as JSZip from 'jszip';
import { DeployableAtom, DeployableFragment } from './instruments/Instrument';

import * as fs from 'fs';

function jszipToArray(jszip: JSZip) {
    const ret: any[] = [];
    jszip.forEach((_, zipObject) => {
        ret.push(zipObject);
    });
    ret.sort((a, b) => a.name.localeCompare(b.name));

    return ret;
}

describe('ZipBuilder', () => {
    describe('toBuffer()', () => {
        it('produces a zip bundle from a single fragment', async () => {
            const zb = new ZipBuilder();
            zb.newFragment()
                .add(new DeployableAtom('a/b/c', 'ABC'))
                .add(new DeployableAtom('a/b/d', 'ABD'));

            debugger;
            const buffer = await zb.toBuffer();
            const zip = await JSZip.loadAsync(buffer);

            const arr = await Promise.all(jszipToArray(zip)
                .filter(curr => !curr.dir)
                .map(curr => curr.async('string')
                    .then(content => ({content, name: curr.name}))));

            expect(arr).to.eql([
                {name: 'a/b/c', content: 'ABC'},
                {name: 'a/b/d', content: 'ABD'},
            ]);
        });

        it ('produces a zip bundle from a multiple fragments', async () => {
            const zb = new ZipBuilder();
            zb.newFragment()
                .add(new DeployableAtom('a/b/c', 'ABC'))
                .add(new DeployableAtom('a/b/d', 'ABD'));

            zb.newFragment()
                .add(new DeployableAtom('p/q/r', 'PQR'))
                .add(new DeployableAtom('p/q/s', 'PQS'));

            zb.newFragment()
                .add(new DeployableAtom('w/x/y', 'WXY'))
                .add(new DeployableAtom('w/x/z', 'WXZ'));

            const buffer = await zb.toBuffer();
            const zip = await JSZip.loadAsync(buffer);

            const arr = await Promise.all(jszipToArray(zip)
                .filter(curr => !curr.dir)
                .map(curr => curr.async('string')
                    .then(content => ({content, name: curr.name}))));

            expect(arr).to.eql([
                {name: 'a/b/c', content: 'ABC'},
                {name: 'a/b/d', content: 'ABD'},
                {name: 'p/q/r', content: 'PQR'},
                {name: 'p/q/s', content: 'PQS'},
                {name: 'w/x/y', content: 'WXY'},
                {name: 'w/x/z', content: 'WXZ'}
            ]);
        });
    });

    describe('scan', () => {
        it('recurses through directories', async () => {
            const zb = new ZipBuilder();
            zb.newFragment().scan('a/b', __dirname);
            const zip = await JSZip.loadAsync(await zb.toBuffer());

            const str = await zip.file('a/b/instruments/Instrument.ts').async('string');
            expect(str).to.contain('export abstract class Instrument {');

            expect(zip.file('a/b/commands/Invoke.ts')).to.be.not.null;
            expect(zip.file('a/b/commands/fdkm39mfdndmf')).to.be.null;
        });
    });

    describe('forEach', () => {
        it('iterates over the all atoms', async () => {
            const zb = new ZipBuilder();
            zb.newFragment()
                .add(new DeployableAtom('a/b/c', 'ABC'))
                .add(new DeployableAtom('a/b/d', 'ABD'));

            zb.newFragment()
                .add(new DeployableAtom('p/q/r', 'PQR'))
                .add(new DeployableAtom('p/q/s', 'PQS'));

            const arr: DeployableAtom[] = [];
            zb.forEach(curr => arr.push(curr));
            expect(arr).to.eql([
                {path: 'a/b/c', content: 'ABC'},
                {path: 'a/b/d', content: 'ABD'},
                {path: 'p/q/r', content: 'PQR'},
                {path: 'p/q/s', content: 'PQS'}
            ]);
        });
    });

    describe('merge', () => {
        it('takes several buffers and produces a single one', async () => {
            const fragA = new DeployableFragment()
                .add(new DeployableAtom('a/b/c', 'ABC'))
                .add(new DeployableAtom('a/b/d', 'ABD'));
            
            const fragB = new DeployableFragment()
                .add(new DeployableAtom('p/q/r', 'PQR'))
                .add(new DeployableAtom('p/q/s', 'PQS'));
                        
            const buffers = await Promise.all([ZipBuilder.fragmentToBuffer(fragA), ZipBuilder.fragmentToBuffer(fragB)]);
            const buf = await ZipBuilder.merge(buffers);

            const zip = await JSZip.loadAsync(buf);
            const arr = await Promise.all(jszipToArray(zip)
                .filter(curr => !curr.dir)
                .map(curr => curr.async('string')
                    .then(content => ({content, name: curr.name}))));

            expect(arr).to.eql([
                {name: 'a/b/c', content: 'ABC'},
                {name: 'a/b/d', content: 'ABD'},
                {name: 'p/q/r', content: 'PQR'},
                {name: 'p/q/s', content: 'PQS'}
            ]);
        });

        it('retains the fingerprint', async () => {
            const fragA = new DeployableFragment()
                .add(new DeployableAtom('a/b/c', 'ABC'))
                .add(new DeployableAtom('a/b/d', 'ABD'));
            
            const fragB = new DeployableFragment()
                .add(new DeployableAtom('p/q/r', 'PQR'))
                .add(new DeployableAtom('p/q/s', 'PQS'));

            const zb = new ZipBuilder();
            zb.importFragment(fragA);
            zb.importFragment(fragB);
            const originalBuffer = await zb.toBuffer();
            const originalFingerprint = ZipBuilder.bufferTo256Fingerprint(originalBuffer);
            const originalPojo = await ZipBuilder.toPojo(originalBuffer);

            const pqs = originalPojo.find(x => x.meta.name === 'p/q/s');
            expect(Boolean(pqs), "an entry with .meta.name === p/q/s").to.be.true;
            expect(pqs.content).to.equal('PQS');

            const buffers = await Promise.all([ZipBuilder.fragmentToBuffer(fragA), ZipBuilder.fragmentToBuffer(fragB)]);

            const mergedBuffer = await ZipBuilder.merge(buffers);
            
            const mergeFingerprint = ZipBuilder.bufferTo256Fingerprint(mergedBuffer);
            const mergedPojo = await ZipBuilder.toPojo(mergedBuffer);

            expect(mergedPojo).to.eql(originalPojo);            
            expect(mergeFingerprint).to.equal(originalFingerprint);
        });
    });    
});
