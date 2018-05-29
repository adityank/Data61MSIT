/******************************************************************************************************************
* File:parse5.go
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   26 May 2018 - Adity Kamble - Parsing of a BPMN file done to extract the tasks and lanes. A dependancy graph
*   is created to identify dependancies between tasks. Tasks are mapped to lanes to identify access control logic. 
*
* Description: This is the parser which takes in a BPMN file and stores the extracted information in different objects. 
*
* External Dependencies: 
* 1. Input BPMN file
* 2. Node-modules: fs, elementtree, dependency-graph
*
******************************************************************************************************************/



// module for file-system
var fs = require('fs');

// module for element tree 
var et = require('elementtree');

var DepGraph = require('dependency-graph').DepGraph;
var graph = new DepGraph();

// In particular, tree for XML file
var XML = et.XML;
var ElementTree = et.ElementTree;

var iter;

// The input bpmn file
var data = fs.readFileSync('../../bpmn_examples/pizza.bpmn').toString();
var etree = et.parse(data);

// Get all tasks
var tasks = etree.findall('./process/task');

// A mapping between unique task_id and the corresponding task name
var taskMap = {};
for(iter=0; iter<tasks.length; iter++){
    (function(iter) {
        taskMap[tasks[iter].get('id')] = tasks[iter].get('name');
    })(iter);
}

// The nodes of the dependancy tree will be the constructs like gateways and tasks
var nodes = etree.findall('./process/laneSet/lane/flowNodeRef');

// Add the nodes to the graph
for(iter=0; iter<nodes.length; iter++){
    (function(iter) {
        graph.addNode(nodes[iter].text);
    })(iter);
}

//build dependancy graph
var flows = etree.findall('./process/sequenceFlow');
for(iter=0; iter<flows.length; iter++){
    (function(iter) {
        graph.addDependency(flows[iter].get('sourceRef'), flows[iter].get('targetRef'));
    })(iter);
}

//console.log(graph.overallOrder());
//console.log("dependancies");

// Print dependancies
for(iter=0; iter<nodes.length; iter++){
    console.log(nodes[iter].text);
    (function(iter) {
        console.log(graph.dependenciesOf(nodes[iter].text));
    })(iter);
    console.log("---------------------------------");
}

/*console.log("dependants");
// Print dependants
for(iter=0; iter<nodes.length; iter++){
    console.log(nodes[iter].text);
    (function(iter) {
        console.log(graph.dependantsOf(nodes[iter].text));
    })(iter);
    console.log("---------------------------------");
}*/


// Get all participants(lanes)
var childlanes,numchildlanes,laneName,accessible,childlane;

// Stores mapping between the lane and the tasks(operations) restricted in that lane
var laneToTasks = {};
var lanes = etree.findall('./process/laneSet/lane');
for(iter=0; iter<lanes.length; iter++){
    (function(iter) {
        laneName = lanes[iter].get('name');
        childlanes = lanes[iter].findall('./childLaneSet/lane');
        numchildlanes = childlanes.length;

        // If no childlanes, map tasks to that lane
        if(numchildlanes == 0){
            laneToTasks[laneName] = lanes[iter].findall('./flowNodeRef');
        }
        // else separately map tasks to childlanes
        while(numchildlanes>0){
            childlane = childlanes[numchildlanes-1];
            laneToTasks[childlane.get('name')] = childlane.findall('./flowNodeRef');
            laneName += ", " + childlane.get('name');
            numchildlanes--;
        }
    })(iter);
}

// Filter out non-task nodes from the mapping, since we only need tasks
for (var lane in laneToTasks){
    var value = laneToTasks[lane];
    var numTasks = value.length;
    for (iter=0;iter<numTasks;iter++){
        if(value[iter].text.substring(0,4)!="Task"){
            laneToTasks[lane].splice(laneToTasks[lane].indexOf(value[iter]),1);
            iter--;
            numTasks--;
        }
    }
}

for (var lane in laneToTasks){
    console.log(lane + ': ');
    var value = laneToTasks[lane];
    for (var y in value){
        console.log(taskMap[value[y].text]+" ");
    }
    console.log('----');
}
