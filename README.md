# Rewrite

Tools for replacing parts of a graph.

# Usage

The generic replacement method is

<pre><code>
g1 = API.apply(g, set, matcher, generator)
</code></pre>

<ul>
<li><code>g</code> is a graph</li>
<li><code>set</code> is an arbitrary set of candidates for the matcher</li>
<li><code>matcher</code> takes a candidate and the graph and returns false iff there is no match, otherwise the return value is arbitrary</li>
<li><code>generator</code> takes the return value of the matcher and the graph and returns a new graph
</ul>

A few candidate sets are provided:

<pre><code>
g1 = API.applyNode(matcher, generator)(g)
g2 = API.applyEdge(matcher, generator)(g)
g3 = API.applyPort(matcher, generator)(g)
g4 = API.applyComponent(matcher, generator)(g)
</code></pre>

These replacement rules can be iterated like this:

<pre><code>
// matches nothing
const rule1 = API.applyNode((node, g) => false, (match, g) => null)
// matches everything, does nothing
const ruleTrivial = API.applyNode((node, g) => true, (match, g) => g)
const rewriter = API.rewrite([rule1, rule2], maxIterations)
g1 = rewriter(g)
</code></pre>

where <code>maxIterations</code> is optional (default: <code>Infinity</code>)

> Written with [StackEdit](https://stackedit.io/).
