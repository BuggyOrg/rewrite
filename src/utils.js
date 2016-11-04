import * as Graph from '@buggyorg/graphtools'
import fs from 'fs'

export function readGraph (path) {
  return Graph.fromJSON(fs.readFileSync('test/fixtures/' + path))
}

export function writeGraph (path, graph) {
  fs.writeFileSync('test/fixtures/' + path, JSON.stringify(Graph.toJSON(graph), null, 2))
}

export function logGraph (graph) {
  console.log(JSON.stringify(Graph.toJSON(graph), null, 2))
}

export function compareGraphs (graph1, graph2) {
  var g1 = JSON.stringify(Graph.toJSON(graph1), null, 2)
  var g2 = JSON.stringify(Graph.toJSON(graph2), null, 2)
  return g1 === g2
}

export function portEquals (port1, port2) {
  return port1.port === port2.port && port1.kind === port2.kind
}
