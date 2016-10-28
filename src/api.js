import * as Graph from '@buggyorg/graphtools'

function graphEquals (g1, g2) {
  return g1 === g2
}

export function applyRule (matcher, generator) {
  return (graph) => {
    Graph.nodes(graph).forEach((node) => {
      var match = matcher(node)
      if (matcher(node) !== false) { return generator(match, graph) }
    })
  }
}

var AppliedSomeRuleException = {}

export function rewrite(rules, numIterations) {
  return (graph) => {
    var currentGraph = graph
    for(var i = 0; i < numIterations; ++i) {
      try {
        rules.forEach((r) => {
          var modifiedGraph = r(currentGraph)
          if(!graphEquals(currentGraph, modifiedGraph))
          {
            currentGraph = modifiedGraph
            throw AppliedSomeRuleException
          }
        })
      }
      catch (e) {
        if(e === AppliedSomeRuleException) continue
        else break
      }
      finally { }
    }
    return currentGraph
  }
}
