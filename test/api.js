
/* global describe, it */

import * as Graph from '@buggyorg/graphtools'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import * as API from '../src/api'

import _ from 'lodash'
import chai from 'chai'

const expect = chai.expect
chai.use(sinonChai)

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
        { port: 'p2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addEdge({ from: 'a@p1', to: 'b@p2' }),
    Graph.addEdge({ from: 'a@p2', to: 'b@p1' }),
    Graph.addEdge({ from: 'b@out', to: '@out' })
  )(Graph.compound({ports: [{port: 'out', kind: 'output', type: 'generic'}]}))
}

function createFacGraph () {
  return Graph.flow(
    Graph.addNode({
      name: 'Const',
      atomic: true,
      componentId: 'math/const',
      ports: [
        { port: 'out', kind: 'output', type: 'number' }
      ]
    }),
    Graph.addNode({
      name: 'Add',
      atomic: true,
      componentId: 'math/add',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Multiply',
      atomic: true,
      componentId: 'math/multiply',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Recursion',
      atomic: true,
      isRecursive: true,
      componentId: 'math/factorial',
      ports: [
        { port: 'in', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Output',
      atomic: true,
      ports: [
        { port: 'in', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addEdge({ from: '@out', to: 'Add@in1' }),
    Graph.addEdge({ from: '@out', to: 'Multiply@in1' }),
    Graph.addEdge({ from: 'Const@out', to: 'Add@in2' }),
    Graph.addEdge({ from: 'Add@out', to: 'Recursion@in' }),
    Graph.addEdge({ from: 'Recursion@out', to: 'Multiply@in2' }),
    Graph.addEdge({ from: 'Multiply@out', to: 'Output@in' }),
    Graph.addEdge({ from: 'Recursion', to: '', layer: 'recursion' })
  )(Graph.compound({
    name: 'Input',
    atomic: false,
    isRecursive: true,
    isRecursiveRoot: true,
    componentId: 'math/factorial',
    ports: [
      { port: 'out', kind: 'input', type: 'generic' },
      { port: 'in', kind: 'output', type: 'generic' }
    ]
  }))
}

describe('API tests', () => {
  it('can create and compare graphs', () => {
    const graph1 = createTestGraph()
    const graph2 = createTestGraph()
    const graph3 = createFacGraph()
    expect(Graph.isomorph(graph1, graph1)).to.be.true
    expect(Graph.isomorph(graph1, graph2)).to.be.true
    expect(Graph.isomorph(graph1, graph3)).to.be.false
  })
  it('stops rewriting if nothing changed', () => {
    const nopeMatcher = sinon.stub().returns(false)
    const rule = API.applyNode(nopeMatcher, () => undefined)
    const cmpd = Graph.flow(
      Graph.addNode({name: 'a', ports: [{port: 'out', kind: 'output', type: 'generic'}]}),
      Graph.addEdge({from: 'a@out', to: '@in'})
    )(Graph.compound({ports: [{port: 'in', kind: 'output', type: 'generic'}]}))
    API.rewrite([rule])(cmpd)
    expect(nopeMatcher).to.have.been.calledTwice // node a and the root node
  })
  it('can empty rules without changing the graph', () => {
    const rule1 = API.applyNode(
      (node, graph) => false,
      (match, graph) => null)
    const rule2 = API.applyPort(
      (node, graph) => false,
      (match, graph) => null)
    const graph1 = createTestGraph()
    const graph2 = API.rewrite([rule1, rule2])(graph1)
    expect(Graph.isomorph(graph1, graph2)).to.be.true
  })
  it('throws errors when there return values are forgotten', () => {
    const rule1 = API.applyEdge(
      (edge, graph) => undefined,
      (match, graph) => true)
    const rule2 = API.applyEdge(
      (edge, graph) => true,
      (match, graph) => undefined)
    const graph = createTestGraph()
    expect(() => API.rewrite([rule1])(graph)).to.throw
    expect(() => API.rewrite([rule2])(graph)).to.throw
  })
  it('can replace port types (using applyNode)', () => {
    const rule = API.applyNode(
      (node, graph) => {
        const ports = Graph.Node.ports(node)
        const genericPort = _.find(ports, (p) => API.isGenericPort(p))
        if (!genericPort) return false
        return {
          node: node,
          port: genericPort
        }
      },
      (match, graph) => {
        const newPort = _.assign(_.cloneDeep(match.port), {
          type: 'number'
        })
        return API.replacePort(match.node, match.port, newPort, graph)
      })
    const graph1 = createTestGraph()
    const graph2 = API.rewrite([rule])(graph1)
    expect(Graph.isomorph(graph1, graph2)).to.be.false
    expect(
      _.every(Graph.nodes(graph2), (node) =>
      _.every(Graph.Node.ports(node), (port) => !API.isGenericPort(port)))
    ).to.be.true
  })
  it('can replace port types (using applyPort)', () => {
    const rule = API.applyPort(
      (port, graph) => API.isGenericPort(port)
        ? port
        : false,
      (port, graph) => {
        var node = Graph.node(Graph.Port.node(port), graph)
        var newPort = _.assign(_.cloneDeep(port), {
          type: 'number'
        })
        return API.replacePort(node, port, newPort, graph)
      })

    const graph1 = createTestGraph()
    const graph2 = API.rewrite([rule])(graph1)

    expect(Graph.isomorph(graph1, graph2)).to.be.false

    expect(
      _.every(Graph.nodes(graph2), (node) =>
      _.every(Graph.Node.ports(node), (port) => !API.isGenericPort(port)))
    ).to.be.true
  })
  it('can replace port types (using applyEdge)', () => {
    const rule = API.applyEdge(
      (edge, graph) => {
        if (API.isGenericPort(edge.sourcePort) && API.isGenericPort(edge.targetPort) === false) {
          return edge
        } else {
          return false
        }
      },
      (edge, graph) => {
        var newPort = _.assign(_.cloneDeep(edge.sourcePort), {
          type: edge.targetPort.type
        })
        return API.replacePort(edge.source, edge.sourcePort, newPort, graph)
      })

    const graph1 = createTestGraph()
    const graph2 = API.rewrite([rule])(graph1)

    expect(Graph.isomorph(graph1, graph2)).to.be.false

    expect(
      _.every(Graph.edges(graph2), (edge) => {
        return !API.isGenericPort(edge.from.port)
      })
    ).to.be.true
  })
  it('can handle edges in all layers', () => {
    const rule = API.applyEdge(
      (edge, graph) => {
        if (API.isGenericPort(edge.sourcePort) && API.isGenericPort(edge.targetPort) === false) {
          return edge
        } else {
          return false
        }
      },
      (edge, graph) => {
        const newPort = _.assign(_.cloneDeep(edge.sourcePort), {
          type: edge.targetPort.type
        })
        return API.replacePort(edge.source, edge.sourcePort, newPort, graph)
      })

    const graph1 = createFacGraph()
    API.rewrite([rule])(graph1)
  })

  it('can replace components', () => {
    const rule = API.applyComponent((comp, graph) =>
      comp.componentId === 'A'
      ? comp
      : false,
    (comp, graph) => Graph.updateComponent(comp, {isA: true}, graph))

    const graph = Graph.addComponent({componentId: 'A', ports: [{port: 'X', kind: 'input', type: 'X'}], version: '0.0.0'}, Graph.empty())
    const rewGraph = API.rewrite([rule])(graph)
    expect(Graph.component('A', rewGraph).isA).to.be.true
  })
})
