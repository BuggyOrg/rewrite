import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'

const Blacklist = ['id', 'path', 'node']

/**
 * Determines wether the given object is a Port
 * @param x the object
 * @return {Boolean} true iff x is a Port
 */
export function isPort (x) {
  return x && x.port && x.kind && x.type
}

/**
 * Determines wether the given object is an Edge
 * @param x the object
 * @return {Boolean} true iff x is an Edge
 */
export function isEdge (x) {
  return x && x.from && x.to
}

/**
 * Determines wether the given object is an Edge between two Ports
 * @param x the object
 * @return {Boolean} true iff x is an Edge between two Ports
 */
export function isPortEdge (x) {
  return x && x.from.node && x.from.port && x.to.node && x.to.port
}

/**
 * Determines wether the given object is an Edge between two Nodes
 * @param x the object
 * @return {Boolean} true iff x is an Edge between two Nodes
 */
export function isNodeEdge (x) {
  return x && x.from && x.to
}

/**
 * Determines wether two given port objects are equal
 * @param {Port} port1 first port
 * @param {Port} port2 second port
 * @return {Boolean} true iff port1 and port2 are equal
 */
export function portEquals (port1, port2) {
  if (!isPort(port1)) {
    return false
  }
  if (!isPort(port2)) {
    return false
  }
  return port1.port === port2.port && port1.kind === port2.kind
}

/**
 * Determines wether the given object is a generic Port
 * @param x the object
 * @return {Boolean} true iff x is a generic Port
 */
export function isGenericPort (port) {
  return isPort(port) && port.type === 'generic'
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
      }
      return newGraph
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
  return (graph) => {
    const nodes = Graph.nodesDeep(graph)
    const ports = _.map(nodes, (node) => Graph.Node.ports(node, graph))
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
  return (graph) => {
    const edges = _.map(Graph.edges(graph), (edge) => {
      if (isPortEdge(edge)) {
        const src = Graph.node(edge.from.node, graph)
        const dst = Graph.node(edge.to.node, graph)
        return {
          source: src,
          target: dst,
          sourcePort: Graph.Node.port(edge.from.port, src),
          targetPort: Graph.Node.port(edge.to.port, dst)
        }
      } else {
        return {
          source: Graph.node(edge.from, graph),
          target: Graph.node(edge.to, graph)
        }
      }
    })
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
export function rewrite (rules, iterations = Infinity) {
  return (graph) => {
    let currentGraph = graph
    // iterate as long as any rule is applied
    for (var i = 1; i < iterations; i++) {
      let ruleApplied = false
      for (const rule of rules) {
        let modifiedGraph = rule(currentGraph)
        if (!graphEquals(currentGraph, modifiedGraph)) {
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

function compareCustomizer (value, key) {
  return _.contains(Blacklist, key)
    ? null
    : undefined
}

/**
 * Determines wether two given graph objects are equal
 * @param {Graph} graph1 first graph
 * @param {Graph} graph2 second graph
 * @return {Boolean} true iff graph1 and graph2 are equal
 */
export function graphEquals (graph1, graph2) {
  const g1 = _.cloneDeepWith(graph1, compareCustomizer)
  const g2 = _.cloneDeepWith(graph2, compareCustomizer)
  const s1 = JSON.stringify(Graph.toJSON(g1))
  const s2 = JSON.stringify(Graph.toJSON(g2))
  return s1 === s2
}

/**
 * Replaces a port of a node in a graph
 * @param {Node} node the node which contains the port
 * @param {Port} oldPort port object to be replaced
 * @param {Port} newPort port object to replace with
 * @return {Graph} updated graph with oldPort replaced by newPort
 */
export function replacePort (node, oldPort, newPort, graph) {
  const newNode = _.assign(_.cloneDeep(node), {
    ports: _.map(newNode.ports, (port) => {
      portEquals(port, oldPort)
      ? newPort
      : port
    })
  })
  return Graph.replaceNode(node, newNode, graph)
}
