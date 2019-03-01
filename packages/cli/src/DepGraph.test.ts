import chai = require('chai');
import chaiSubset = require('chai-subset');

chai.use(chaiSubset);
const {expect} = chai;

import 'mocha';

import {DepGraph} from './DepGraph'

describe('DepGraph', () => {
    it('something', () => {
        const graph = new DepGraph();
        graph.addDep('a', 'b');
        graph.addDep('a', 'c');
        graph.addDep('b', 'd');
        graph.addDep('c', 'd');

        const actual = graph.getNode('a').dfs().map(n => n.name) 
        expect(actual).to.eql(['a', 'b', 'd', 'c']);
    });
});
