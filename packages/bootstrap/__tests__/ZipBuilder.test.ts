import * as chai from 'chai';
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import {ZipBuilder} from '../src/ZipBuilder'
import * as JSZip from 'jszip';
import { DeployableAtom, DeployableFragment } from 'bigband-core';

import * as path from 'path';

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
            zb.newFragment().scan('a/b', path.resolve(__dirname, '../../cli/src'));
            const zip = await JSZip.loadAsync(await zb.toBuffer());

            const str = await zip.file('a/b/commands/Logs.ts').async('text');
            expect(str).to.contain('let describeLogStreamsResp: DescribeLogStreamsResponse');

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

        // 2019-02-17T17:00:46.459Z [main] silly: Comparing fingerprints for chronology-importantDates:
        //     DhfmFU/JVuW/E5mTHRV9Ko7YI4Cz/9xaMOLKtTAlTdA=
        //     MgRwaKqyz7Cmz0GW+fDxMjPp7vg2WiKALu7yycgaWzs=

        xit('can scan a node_modules directory and merge it', async () => {
            const zb = new ZipBuilder();
            const fragA = zb.newFragment();
            fragA.scan('node_modules/moment', path.resolve(__dirname, '../../example/node_modules/moment'));
            
            const originalBuffer = await zb.toBuffer();
            const originalPojo = await ZipBuilder.toPojo(originalBuffer);

            const buffers = await Promise.all([ZipBuilder.fragmentToBuffer(fragA)]);
            const mergedBuffer = await ZipBuilder.merge(buffers);
            
            const mergedPojo = await ZipBuilder.toPojo(mergedBuffer);
            comparePojos(originalPojo, mergedPojo);
        });
        it('roundtrips without losing a bit', async () => {
            const zb = new ZipBuilder();
            const fragA = zb.newFragment();
            fragA.scan('node_modules/moment', path.resolve(__dirname, '../../example/node_modules/moment'));
            
            const originalBuffer = await zb.toBuffer();
            const mergedBuffer = await ZipBuilder.merge([originalBuffer]);

            // The two strings can be long. running expect().equal() on them is highly CPU intensive
            // (as it computes a diff on two large strings). Therefore, we stick with good-old equality (===).
            expect(originalBuffer.toString("base64") === mergedBuffer.toString("base64")).to.be.true;
            
            const originalPojo = await ZipBuilder.toPojo(originalBuffer);
            const mergedPojo = await ZipBuilder.toPojo(mergedBuffer);
            comparePojos(originalPojo, mergedPojo);
        });
    });    
});

function comparePojos(a, b) {
    const orderedNamesA = a.map(x => x.meta.name);
    const namesA = new Set(orderedNamesA);
    
    const orderedNamesB = b.map(x => x.meta.name);
    const namesB = new Set(orderedNamesB);

    const missingInB = [...namesA.values()].filter(curr => !namesB.has(curr));
    if (missingInB.length) {
        throw new Error(`missingInB=${missingInB}.join(', ')`);
    }

    const missingInA = [...namesB.values()].filter(curr => !namesA.has(curr));
    if (missingInA.length) {
        throw new Error(`missingInA=${missingInB}.join(', ')`);
    }

    expect(orderedNamesA).to.eql(orderedNamesB);

    namesA.forEach(name => {
        const ea = a.find(x => x.meta.name === name);
        const eb = b.find(x => x.meta.name === name);

        expect(ea).to.eql(eb);
    });
}
