import * as Graph from '@buggyorg/graphtools'

function graphEquals (g1, g2) {
  /* compare by reference */
  return g1 === g2
}

export function applyRule (matcher, generator) {
  return (graph) => {
    Graph.nodes(graph).forEach((node) => {
      var match = matcher(node, graph)
      if (matcher(node) !== false) { return generator(match, graph) }
    })
    return graph
  }
}

var BreakException = { }

export function rewrite (rules) {
  return (graph) => {
    var currentGraph = graph
    /* iterate as long as any rule is applied */
    for (var i = 1; i < 100; i++) {
      console.log('iteration #' + i)
      try {
        /* iterate over set of rules */
        rules.forEach((rule) => {
          var modifiedGraph = rule(currentGraph)
          if (!graphEquals(currentGraph, modifiedGraph)) {
            /* rule was applied */
            currentGraph = modifiedGraph
            throw BreakException
          }
        })
        console.log('no more matching rules')
        break
      } catch (e) {
        if (e === BreakException) {
          continue
        } else {
          break
        }
      }
    }
    return currentGraph
  }
}
