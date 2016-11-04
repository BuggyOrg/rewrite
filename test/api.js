
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

    var newGraph = API.rewrite([rule])(graph)

    expect(Utils.compareGraphs(graph, newGraph)).to.be.true

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

    var newGraph = API.rewrite([rule1, rule2])(graph)

    expect(Utils.compareGraphs(graph, newGraph)).to.be.true

  }),

    it('replace generic port types by concrete type', () => {

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
        (node, graph) => {
          var hasGenericPort = false
          Node.ports(node).forEach((port) => {
            if(port.type === 'generic') {
              hasGenericPort = true
            }
          })
          if(hasGenericPort) {
            return node
          } else {
            return false
          }
        },
        (node, graph) => {
          Node.ports(node).forEach((port) => {
            if (port.type === 'generic') {

              var newPort = port
              newPort.type = 'number'

              var newNode = node
                console.log(newPort)

              newNode.ports = _.map(node.ports, (port2) => {
                console.log(port2)
                if (Utils.portEquals(port, port2)) {
                  console.log('replacing')
                  return newPort
                } else {
                  return port2
                }
              })

              graph = Graph.replaceNode(node,newNode, graph)

            }
          })
        })

      var newGraph = API.rewrite([rule])(graph)

      expect(
        _.every(Graph.nodes(graph), (node) => {
          return !_.some(Node.ports(node), (port) => {
            return false
          })
        })
      ).to.be.true

      console.log(JSON.stringify(newGraph, null, 2))

    })

})
