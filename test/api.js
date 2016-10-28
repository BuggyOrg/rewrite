
import * as Graph from '@buggyorg/graphtools'
import * as API from '../src/api'
import * as Utils from '../src/utils'
import _ from 'lodash'
import chai from 'chai'

const expect = chai.expect

const Node = Graph.Node
const Port = Graph.Port
const Edge = Graph.Edge

describe('API tests', () => {

  it('can create and compare graphs', () => {

    var graph = Graph.flow(
      Graph.addNode({name: 'a', ports: [
        {port: 'p1', kind: 'output', type: 'number'},
        {port: 'p2', kind: 'output', type: 'generic'}]}),
      Graph.addNode({name: 'b', ports: [
        {port: 'p1', kind: 'input', type: 'number'},
        {port: 'p2', kind: 'input', type: 'generic'}]}),
      Graph.addEdge({from: 'a@p1', to: 'b@p2'}),
      Graph.addEdge({from: 'a@p2', to: 'b@p1'})
    )()

    var rule = API.applyRule(
      (node) => false,
      (match) => null)

    expect(Utils.compareGraphs(graph, rule(graph))).to.be.true

  }),

  it('applying empty rules changes nothing', () => {

    var graph = Graph.flow(
      Graph.addNode({name: 'a', ports: [
        {port: 'p1', kind: 'output', type: 'number'},
        {port: 'p2', kind: 'output', type: 'generic'}]}),
      Graph.addNode({name: 'b', ports: [
        {port: 'p1', kind: 'input', type: 'number'},
        {port: 'p2', kind: 'input', type: 'generic'}]}),
      Graph.addEdge({from: 'a@p1', to: 'b@p2'}),
      Graph.addEdge({from: 'a@p2', to: 'b@p1'})
    )()

    var rule1 = API.applyRule(
      (node) => false,
      (match) => null)

    var rule2 = API.applyRule(
      (node) => false,
      (match) => null)

    var rewrite = API.rewrite([rule1, rule2], 20)

    expect(Utils.compareGraphs(graph, rewrite(graph))).to.be.true

  })

})
