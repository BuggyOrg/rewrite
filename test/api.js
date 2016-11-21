
/* global describe, it */

import * as Graph from '@buggyorg/graphtools'
import * as API from '../src/api'

import _ from 'lodash'
import chai from 'chai'

const expect = chai.expect

function createTestGraph () {
  return Graph.flow(
    Graph.addNode({
      name: 'a',
      ports: [
        { port: 'p1', kind: 'output', type: 'number' },
        { port: 'p2', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'b',
      ports: [
        { port: 'p1', kind: 'input', type: 'number' },
        { port: 'p2', kind: 'input', type: 'generic' }
      ]
    }),
    Graph.addEdge({ from: 'a@p1', to: 'b@p2' }),
    Graph.addEdge({ from: 'a@p2', to: 'b@p1' })
  )()
}

describe('API tests', () => {
  it('can create and compare graphs', () => {
    var graph1 = createTestGraph()
    var graph2 = createTestGraph()
    expect(API.graphEquals(graph1, graph2)).to.be.true
  })
  it('applying empty rules does not change the graph', () => {
    var rule1 = API.applyNode(
      (node) => false,
      (match) => null)
    var rule2 = API.applyPort(
      (node) => false,
      (match) => null)
    var graph1 = createTestGraph()
    var graph2 = API.rewrite([rule1, rule2])(graph1)
    expect(API.graphEquals(graph1, graph2)).to.be.true
  })
  it('replace generic port types by concrete type (using applyNode)', () => {
    var rule = API.applyNode(
      (node, graph) => {
        var ports = Graph.Node.ports(node)
        var genericPort = _.find(ports, (p) => p.type === 'generic')
        if (genericPort) {
          return {
            node: node,
            port: genericPort
          }
        } else {
          return false
        }
      },
      (match, graph) => {
        var node = _.cloneDeep(match.node)
        node.ports = _.map(node.ports, (p) => {
          if (p.port !== match.port.port) {
            return p
          } else {
            return _.assign(p, {
              type: 'number'
            })
          }
        })

        graph = Graph.replaceNode(match.node, node, graph)
        return graph
      })

    var graph1 = createTestGraph()
    var graph2 = API.rewrite([rule])(graph1)

    expect(API.graphEquals(graph1, graph2)).to.be.false

    expect(
      _.every(Graph.nodes(graph2), (node) => {
        return _.every(Graph.Node.ports(node), (port) => {
          return port.type !== 'generic'
        })
      })
    ).to.be.true
  })
  it('replace generic port types by concrete type (using applyPort)', () => {
    var rule = API.applyPort(
      (node, port, graph) => {
        if (port.type === 'generic') {
          return {
            node: node,
            port: port
          }
        } else {
          return false
        }
      },
      (match, graph) => {
        var newPort = _.assign(_.cloneDeep(match.port), {
          type: 'number'
        })
        graph = API.replacePort(match.node, match.port, newPort, graph)
        return graph
      })

    var graph1 = createTestGraph()
    var graph2 = API.rewrite([rule])(graph1)

    expect(API.graphEquals(graph1, graph2)).to.be.false

    expect(
      _.every(Graph.nodes(graph2), (node) => {
        return _.every(Graph.Node.ports(node), (port) => {
          return port.type !== 'generic'
        })
      })
    ).to.be.true
  })
  it('replace generic port types by concrete type (using applyPort)', () => {
    var rule = API.applyEdge(
      (node, src, dst, graph) => {
        if (src.type === 'generic' && dst.type !== 'generic') {
          return {
            node: node,
            src: src,
            dst: dst
          }
        } else {
          return false
        }
      },
      (match, graph) => {
        console.log(JSON.stringify(match))
        return graph
      })

    var graph1 = createTestGraph()
    var graph2 = API.rewrite([rule])(graph1)

    expect(API.graphEquals(graph1, graph2)).to.be.false

    expect(
      _.every(Graph.nodes(graph2), (node) => {
        return _.every(Graph.Node.ports(node), (port) => {
          return port.type !== 'generic'
        })
      })
    ).to.be.true
  })
})
