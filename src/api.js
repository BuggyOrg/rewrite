import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'

const BreakException = { }

export function portEquals (port1, port2) {
  return port1.port === port2.port && port1.kind === port2.kind
}

export function isGenericPort (port) {
  if (!port) return false
  return port.type === 'generic'
}

export function applyNode (matcher, generator) {
  return (graph) => {
    try {
      Graph.nodesDeep(graph).forEach((node) => {
        var match = matcher(node, graph)
        if (match === true) {
          graph = generator(node, graph)
          throw BreakException
        }
        if (match !== false) {
          graph = generator(match, graph)
          throw BreakException
        }
      })
    } catch (exc) {
      if (exc !== BreakException) {
        throw exc
      }
    }
    return graph
  }
}

export function applyPort (matcher, generator) {
  return (graph) => {
    try {
      Graph.nodesDeep(graph).forEach((node) => {
        Graph.Node.ports(node).forEach((port) => {
          var match = matcher(node, port, graph)
          if (match === true) {
            graph = generator(node, port, graph)
            throw BreakException
          }
          if (match !== false) {
            graph = generator(match, graph)
            throw BreakException
          }
        })
      })
    } catch (exc) {
      if (exc !== BreakException) {
        throw exc
      }
    }
    return graph
  }
}

export function applyEdge (matcher, generator) {
  return (graph) => {
    try {
      Graph.edges(graph).forEach((edge) => {
        if (!edge ||
        !edge.from ||
        !edge.to) {
          return
        }
        var arg = {
          source: Graph.node(edge.from, graph),
          target: Graph.node(edge.to, graph)
        }
        if (edge.from.node && edge.from.port) arg.sourcePort = Graph.Node.port(edge.from.port, arg.source)
        if (edge.to.node && edge.to.port) arg.targetPort = Graph.Node.port(edge.to.port, arg.target)
        var match = matcher(arg, graph)
        if (match === true) {
          graph = generator(arg, graph)
          throw BreakException
        }
        if (match !== false) {
          graph = generator(match, graph)
          throw BreakException
        }
      })
    } catch (exc) {
      if (exc !== BreakException) {
        throw exc
      }
    }
    return graph
  }
}

export function applyComponent (matcher, generator) {
  return (graph) => {
    try {
      Graph.components(graph).forEach((comp) => {
        var match = matcher(comp, graph)
        if (match === true) {
          graph = generator(comp, graph)
          throw BreakException
        }
        if (match !== false) {
          graph = generator(match, graph)
          throw BreakException
        }
      })
    } catch (exc) {
      if (exc !== BreakException) {
        throw exc
      }
    }
    return graph
  }
}

export function rewrite (rules, iterations) {
  iterations = iterations || Infinity
  return (graph) => {
    var currentGraph = graph
    /* iterate as long as any rule is applied */
    for (var i = 1; i < iterations; i++) {
      try {
        /* iterate over set of rules */
        rules.forEach((rule) => {
          var modifiedGraph = rule(currentGraph)
          if (!graphEquals(currentGraph, modifiedGraph)) {
            /* some rule applied */
            currentGraph = modifiedGraph
            throw BreakException
          }
        })
        /* no rule applied */
        break
      } catch (exc) {
        if (exc === BreakException) {
          continue
        } else {
          throw exc
        }
      }
    }
    return currentGraph
  }
}

function compareCustomizer (value, key) {
  if (key === 'id') {
    return null
  } else if (key === 'path') {
    return null
  } else if (key === 'node') {
    return null
  } else {
    return undefined
  }
}

export function graphEquals (graph1, graph2) {
  var g1 = _.cloneDeepWith(graph1, compareCustomizer)
  var g2 = _.cloneDeepWith(graph2, compareCustomizer)
  var s1 = JSON.stringify(Graph.toJSON(g1))
  var s2 = JSON.stringify(Graph.toJSON(g2))
  return s1 === s2
}

export function replacePort (node, oldPort, newPort, graph) {
  var newNode = _.cloneDeep(node)
  newNode.ports = _.map(newNode.ports, (port) => {
    if (portEquals(port, oldPort)) {
      return newPort
    } else {
      return port
    }
  })
  graph = Graph.replaceNode(node, newNode, graph)
  return graph
}
