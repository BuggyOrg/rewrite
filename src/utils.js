import * as Graph from '@buggyorg/graphtools'
import _ from 'lodash'
import fs from 'fs'

export function readGraph (path) {
  return Graph.fromJSON(fs.readFileSync('test/fixtures/' + path))
}

export function writeGraph (path, graph) {
  fs.writeFileSync('test/fixtures/' + path, JSON.stringify(Graph.toJSON(graph), null, 2))
}