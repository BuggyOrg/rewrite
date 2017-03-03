import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'

const {Port, Edge} = Graph

/**
 * Determines wether the given object is a generic Port
 * @param x the object
 * @return {Boolean} true iff x is a generic Port
 */
export function isGenericPort (port) {
  return Port.isPort(port) && Port.type(port) === 'generic'
}

/**
 * Applies a match function to candidate objects and updates at the first match
 * @param {Graph} graph the graph that should be rewritten
 * @param {List} set candidate objects for rewriting
 * @param {Func} matcher match function that takes a candidate and a graph and returns a match object if the candidate should be rewritten
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Graph} updated graph
 */
export function apply (graph, set, matcher, generator) {
  if (!graph) throw new Error('no graph')
  if (!set) throw new Error('no candidates')
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  for (const candidate of set) {
    const match = matcher(candidate, graph)
    if (match === false) {
      continue
    } else if (!match) {
      throw new Error('Match function returned undefined (missing return value?)')
    } else {
      const newGraph = generator(match, graph)
      if (newGraph === undefined) {
        throw new Error('Generator function returned undefined (missing return value?)')
      } else if (Graph.isomorph(graph, newGraph)) {
        continue
      }
      graph = newGraph
    }
  }
  return graph
}

/**
 * Applies a match function to candidate nodes and updates at the first match
 * @param {Func} matcher match function that takes a candidate and a graph and returns a match object if the candidate should be rewritten
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Graph} updated graph
 */
export function applyNode (matcher, generator) {
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  return (graph) => {
    const nodes = Graph.nodesDeep(graph)
    return apply(
      graph,
      nodes,
      matcher,
      generator)
  }
}

/**
 * Applies a match function to candidate ports and updates at the first match
 * @param {Func} matcher match function that takes a candidate and a graph and returns a match object if the candidate should be rewritten
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Graph} updated graph
 */
export function applyPort (matcher, generator) {
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  return (graph) => {
    if (!graph) throw new Error('no graph')
    const nodes = Graph.nodesDeep(graph)
    const ports = _.map(nodes, (node) => Graph.Node.ports(node, graph) || [])
    const portsFlat = _.flatten(ports)
    return apply(
      graph,
      portsFlat,
      matcher,
      generator)
  }
}

/**
 * Applies a match function to candidate edges and updates at the first match
 * @param {Func} matcher match function that takes a candidate and a graph and returns a match object if the candidate should be rewritten
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Graph} updated graph
 */
export function applyEdge (matcher, generator) {
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  return (graph) => {
    if (!graph) throw new Error('no graph')
    const edges = _.map(Graph.edges(graph), (edge) => {
      if (!graph) throw new Error('no edge')
      if (Edge.isBetweenPorts(edge)) {
        const src = Graph.node(edge.from.node, graph)
        if (!src) throw new Error('no src')
        const dst = Graph.node(edge.to.node, graph)
        if (!dst) throw new Error('no dst')
        return {
          source: src,
          target: dst,
          sourcePort: Graph.Node.port(edge.from.port, src),
          targetPort: Graph.Node.port(edge.to.port, dst),
          layer: edge.layer
        }
      } else {
        return {
          source: Graph.node(edge.from, graph),
          target: Graph.node(edge.to, graph),
          layer: edge.layer
        }
      }
    })
    if (!edges) throw new Error('no edges')
    return apply(
      graph,
      edges,
      matcher,
      generator)
  }
}

/**
 * Applies a match function to candidate components and updates at the first match
 * @param {Func} matcher match function that takes a candidate and a graph and returns a match object if the candidate should be rewritten
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Graph} updated graph
 */
export function applyComponent (matcher, generator) {
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  return (graph) => {
    for (const comp of Graph.components(graph)) {
      const match = matcher(comp, graph)
      if (match === false) {
        continue
      } else if (!match) {
        throw new Error('Match function returned undefined (missing return value?)')
      } else {
        return generator(match, graph)
      }
    }
    return graph
  }
}

/**
 * Iteratively applies the given rules until no matches are found or max iteration is reached
 * @param {Kust} rules a list of rewrite rules that should be applied
 * @param {int} iterations max number of iterations until rewriting terminates
 * @return {Graph} rewritten graph
 */
export function rewrite (rules = [], iterations = Infinity) {
  return (graph) => {
    let currentGraph = graph
    // iterate as long as any rule is applied
    for (var i = 1; i < iterations; i++) {
      let ruleApplied = false
      for (const rule of rules) {
        let modifiedGraph = rule(currentGraph)
        if (!Graph.isomorph(currentGraph, modifiedGraph)) {
          // some rule applied
          currentGraph = modifiedGraph
          ruleApplied = true
          break
        }
      }
      if (!ruleApplied) {
        break
      }
    }
    return currentGraph
  }
}

/**
 * Replaces a port of a node in a graph
 * @param {Node} node the node which contains the port
 * @param {Port} oldPort port object to be replaced
 * @param {Port} newPort port object to replace with
 * @return {Graph} updated graph with oldPort replaced by newPort
 */
export function replacePort (node, oldPort, newPort, graph) {
  if (!node) throw new Error('no node')
  if (!oldPort) throw new Error('no oldPort')
  if (!newPort) throw new Error('no newPort')
  if (!graph) throw new Error('no graph')
  const newNode = _.cloneDeep(node)
  newNode.ports = _.map(Graph.Node.ports(node), (port) =>
      (Port.portName(port) === Port.portName(oldPort))
      ? newPort
      : port)
  return Graph.replaceNode(node, newNode, graph)
}
