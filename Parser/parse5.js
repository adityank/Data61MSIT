// module for file-system
var fs = require('fs');

// module for element tree 
var et = require('elementtree');

var DepGraph = require('dependency-graph').DepGraph;
var graph = new DepGraph();

// In particular, tree for XML file
var XML = et.XML;
var ElementTree = et.ElementTree;

var element = et.Element;
var subElement = et.SubElement;

var data, etree, i;

data = fs.readFileSync('bpmn/pizza.bpmn').toString();
etree = et.parse(data);

// Get all tasks
var tasks = etree.findall('./process/task');
var taskMap = {};
for(i=0; i<tasks.length; i++){
    (function(i) {
        taskMap[tasks[i].get('id')] = tasks[i].get('name');
    })(i);
}

// add nodes
var nodes = etree.findall('./process/laneSet/lane/flowNodeRef');

for(i=0; i<nodes.length; i++){
    (function(i) {
        graph.addNode(nodes[i].text);
    })(i);
}

//build dependancy graph
var flows = etree.findall('./process/sequenceFlow');
for(i=0; i<flows.length; i++){
    (function(i) {
        graph.addDependency(flows[i].get('sourceRef'), flows[i].get('targetRef'));
        //console.log(tasks[i].get('name'));
    })(i);
}

console.log(graph.overallOrder());

// Get all participants(lanes)
var childlanes,numchildlanes,laneName,accessible,childlane;
var laneToTasks = {};
var lanes = etree.findall('./process/laneSet/lane');
for(i=0; i<lanes.length; i++){
    (function(i) {
        laneName = lanes[i].get('name');
        childlanes = lanes[i].findall('./childLaneSet/lane');
        numchildlanes = childlanes.length;
        if(numchildlanes == 0){
            // constructs accessible inside a lane
            laneToTasks[laneName] = lanes[i].findall('./flowNodeRef');
        }
        while(numchildlanes>0){
            childlane = childlanes[numchildlanes-1];
            laneToTasks[childlane.get('name')] = childlane.findall('./flowNodeRef');
            laneName += ", " + childlane.get('name');
            numchildlanes--;
        }
        //console.log(laneName);
    })(i);
}

for (var x in laneToTasks){
    console.log(x + ': ');
    var value = laneToTasks[x];
    var numTasks = value.length;
    for (y=0;y<numTasks;y++){
        if(value[y].text.substring(0,4)!="Task"){
            laneToTasks[x].splice(laneToTasks[x].indexOf(value[y]),1);
            y--;
            numTasks--;
        }
    }
}

for (var x in laneToTasks){
    console.log(x + ': ');
    var value = laneToTasks[x];
    for (var y in value){
        console.log(taskMap[value[y].text]+" ");
    }
    console.log('\n');
}
