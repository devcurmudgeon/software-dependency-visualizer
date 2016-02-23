/* Software dependency explorer PROTOTYPE */

/* Data model.
 *
 * This basically stores a list of graph nodes and edges using generic Object
 * instances. These instances are used directly by the Graph object for the D3
 * layouts, which means D3 sets various properties on them.
 */

"use strict";

// The Component class is used to represent:
//
//   - each node in the dependency graph
//   - each fundamental unit in the software design
//
function Component(label) {
    if (label == undefined)
        throw new Error("Component 'label' must be defined.");

    this.label = label;

    // FIXME: URL escapeing!!!!
    this.focus_url = '?focus=' + this.label

    this.requires = [];
    this.required_by = [];
}

// Constructor for Model object.
function Model() {
    this.nodes = [];
    this.edges = [];
}

// Import data from a DotGraph object (useful for importing from GraphViz).
//
// Any existing data is overwritten.
//
// Example usage:
//
//    var dotgraph_ast = DotParser.parse(graphviz_text);
//    var dotgraph_graph = new DotGraph(ast);
//    dotgraph_graph.walk();
//    graph = new Model().import_from_dotgraph(dotgraph_graph);
//
Model.prototype.import_from_dotgraph = function(dotgraph_object) {
    this.nodes = {};

    for (name in dotgraph_object.nodes) {
        this.nodes[name] = new Component(name)
    }

    // DotGraph stores the edges as a dict, where key is the edge name,
    // and value is an array with one entry, an object with a .edge property
    // that contains an array. (Really).
    //
    // D3 expects an array of objects with .source and .target properties
    // that refer to indexes of the nodes_array, or the actual objects.
    //
    // For now the internal representation matches the bizarre format that D3
    // expects, but that should change.
    this.edges = [];
    Object.keys(dotgraph_object.edges).forEach(function(edge_name, index, _array) {
        var edge_data = dotgraph_object.edges[edge_name][0].edge

        var source = this.nodes[edge_data[0]];
        var target = this.nodes[edge_data[1]];

        var edge_object = {
            source: source,
            target: target
        };
        this.edges.push(edge_object);

        source.requires.push(target);
        target.required_by.push(source);
    }, this)
}

// Returns an array of all the nodes in the data model.
Model.prototype.all_nodes = function() {
    all_nodes = [];
    Object.keys(this.nodes).forEach(function(node_name, index, _array) {
        var node = this.nodes[node_name];
        node.label = node_name
        node.index = index
        all_nodes[index] = node;
    }, this);
    return all_nodes;
}

// Returns a component plus its requires and required-by components.
//
// The result is an object, with component names as the keys and the
// objects themselves as values.
//
// It would make more sense to return a Javascript Set object but these
// aren't supported in all browsers (Internet Explorer < 11, in particular).
// Arrays are a bit rubbish in old browsers too, Objects are most useful.
//
// Transitive dependencies are included up to the given maximum.
//
// This query should probably be done by a graph query running server-side
// rather than by client-side Javascript code. It traverses the graph
// recursively which is of course not amazingly efficient.
//
// FIXME: that said, is there any simple way to make this faster? it's so sloww!!!
Model.prototype.node_with_dependencies = function(
        root_name, max_requires, max_required_by) {
    var root = this.nodes[root_name];
    var result = { };
    result[root_name] = root;

    console.log("Finding dep tree for " + root_name + ", max requires " +
            max_requires + ", max required by: " + max_required_by);

    function collect_depends(collection, root, depends_fn, depth, maximum_depth) {
        if (depth > maximum_depth)
            return;
        depends_fn(root).forEach(function(dep) {
            if (! (dep.label in collection)) {
                collection[dep.label] = dep;
                collect_depends(collection, dep, depends_fn, depth + 1, maximum_depth);
            }
        });
    }

    collect_depends(result, root, function(n) { return n.requires; }, 1, max_requires);
    collect_depends(result, root, function(n) { return n.required_by; }, 1, max_required_by);

    return result;
}

// Returns an array of all the edges in the data model.
// Each edge is represented as an Object with .source and .target properties
// that each point to a node object.
Model.prototype.all_edges = function() {
    return this.edges;
}

Model.prototype.node = function(name) {
    return this.nodes[name];
}