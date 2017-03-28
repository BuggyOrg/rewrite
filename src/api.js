import * as Graph from '@buggyorg/graphtools'
import debug from 'debug'
import _ from 'lodash'

const {Port, Edge} = Graph
const appliedRule = (rule) => debug('rewrite-rule-applied')(JSON.stringify(_.omit(rule, ['matcher', 'generator', 'set'])))
const debugGraph = Graph.debug

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
 * @return {Graph} The updated graph. If the rule did not change the graph it will return undefined.
 */
export function apply (rule, graph) {
  if (!graph) throw new Error('no graph')
  if (!rule) throw new Error('no rule')
  const set = rule.set(graph)
  var anyMatched = false
  const checkIsomorph = rule.checkIsomorph || true
  for (const candidate of set) {
    var match = rule.matcher(candidate, graph)
    if (match === false) {
      continue
    } else if (!match) {
      throw new Error('Match function returned undefined (missing return value?)')
    } else {
      if (match === true) match = candidate
      const newGraph = rule.generator(match, graph)
      if (newGraph === undefined) {
        throw new Error('Generator function returned undefined (missing return value?)')
      } else if (checkIsomorph && Graph.isomorph(graph, newGraph)) {
        if (rule.name) {
          throw new Error('Rule "' + rule.name + '" did not change anything even though it matched. This rule' +
            ' would be applied indefinitely.\nMatch: \n' + JSON.stringify(candidate, null, 2))
        }
        throw new Error('Rule did not change anything even though it matched. This rule' +
            ' would be applied indefinitely.\nMatch: \n' + JSON.stringify(candidate, null, 2))
      }
      anyMatched = true
      appliedRule(rule)
      debugGraph(newGraph)
      graph = newGraph
    }
  }
  return (anyMatched) ? graph : undefined
}

/**
 * Applies a match function to candidate nodes and updates at the first match
 * @param {Func} matcher match function that takes a candidate and a graph and returns a match object if the candidate should be rewritten
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Rule} The rewrite rule. You can apply it via `rewrite([rule], graph)`
 */
export function applyNode (matcher, generator, data = {}) {
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  return Object.assign({matcher, generator, set: Graph.nodesDeep}, data)
}

/**
 * Applies a match function to candidate ports and updates at the first match
 * @param {Func} matcher match function that takes a candidate and a graph and returns a match object if the candidate should be rewritten
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Rule} The rewrite rule. You can apply it via `rewrite([rule], graph)`
 */
export function applyPort (matcher, generator, data = {}) {
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  const allPorts = (graph) =>
    _.flatten(Graph.nodesDeep(graph).map((node) => Graph.Node.ports(node, graph)))
  return Object.assign({matcher, generator, set: allPorts}, data)
}

/**
 * Get all edges in the graph and query the source and destination nodes and ports.
 * @param {Portgraph} graph The graph
 * @returns {Array<Edge>} All edges in the graph
 */
function edgeSet (graph) {
  if (!graph) throw new Error('Invalid graph')
  return Graph.edgesDeep(graph).map((edge) => {
    if (Edge.isBetweenPorts(edge)) {
      const src = Graph.node(edge.from.node, graph)
      if (!src) throw new Error('no src')
      const dst = Graph.node(edge.to.node, graph)
      if (!dst) throw new Error('no dst')
      return Object.assign({
        source: src,
        target: dst
      }, edge, {from: Graph.port(edge.from, graph), to: Graph.port(edge.to, graph)})
    } else {
      return Object.assign({
        source: Graph.node(edge.from, graph),
        target: Graph.node(edge.to, graph)
      }, edge)
    }
  })
}

/**
 * Applies a match function to candidate edges and updates at the first match
 * @param {Func} matcher Match function that takes a candidate and a graph and returns a match object
 * if the candidate should be rewritten. Each candidate is an edge object with already queried source
 * and destinations. An edge object for an edge between ports will look like this:
 *
 * ```
 * {
 *   from: <Port>,
 *   to: <Port>,
 *   source: <Node>,
 *   destination: <Node>,
 *   ...<further edge attributes>
 * }
 * ```
 *
 * If the edge connects two nodes (and not ports), the object will look like this:
 *
 * ```
 * {
 *   from: <Node>,
 *   to: <Node>,
 *   source: <Node>,
 *   destination: <Node>,
 *   ...<further edge attributes>
 * }
 * ```
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Rule} The rewrite rule. You can apply it via `rewrite([rule], graph)`
 */
export function applyEdge (matcher, generator, data = {}) {
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  return Object.assign({matcher, generator, set: edgeSet}, data)
}

/**
 * Applies a match function to candidate components and updates at the first match
 * @param {Func} matcher match function that takes a candidate and a graph and returns a match object if the candidate should be rewritten
 * @param {Func} generator update function that takes a match and a graph and returns a new graph
 * @return {Graph} updated graph
 */
export function applyComponent (matcher, generator, data = {}) {
  if (!matcher) throw new Error('no matcher')
  if (!generator) throw new Error('no generator')
  return Object.assign({matcher, generator, set: Graph.components}, data)
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
        let modifiedGraph = apply(rule, currentGraph)
        if (modifiedGraph) {
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
