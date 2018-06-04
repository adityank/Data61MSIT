/******************************************************************************************************************
* File:parse5.go
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   26 May 2018 - Adity Kamble - Parsing of a BPMN file done to extract the tasks and lanes. A dependancy graph
*   is created to identify dependancies between tasks. Tasks are mapped to lanes to identify access control logic. 
*   04 June 2018 - Adity Kamble - Refactored by creating separate functions. Returning mainly 3 things:
*   1. Incoming (parent) nodes for every construct.
*   2. Outgoing (child) nodes for every construct.
*   3. Access to tasks every lane has
*
* Description: This is the parser which takes in a BPMN file and stores the extracted information in different objects. 
*
* External Dependencies: 
* 1. Path for existing BPMN file.
* 2. Node-modules: fs, elementtree
*
******************************************************************************************************************/

// module for file-system
var fs = require('fs');

// module for element tree 
var et = require('elementtree');


function getElementTree(filename){
    // In particular, tree for XML file
    var XML = et.XML;
    var ElementTree = et.ElementTree;

    // The input bpmn file
    var data = fs.readFileSync(filename).toString();
    return et.parse(data);
}

// Get all tasks
function getTaskMapping(etree){
    var tasks = etree.findall('./process/task');
    // A mapping between unique task_id and the corresponding task name
    var taskMap = {};
    for(var iter=0; iter<tasks.length; iter++){
        (function(iter) {
            taskMap[tasks[iter].get('id')] = tasks[iter].get('name');
        })(iter);
    }
    return taskMap;
}


function getFlows(etree){
    return etree.findall('./process/sequenceFlow');
}


function insert(dep, key, value) {
    if(dep[key])
        dep[key] = dep[key];
    else
        dep[key] = [];
    dep[key].push(value);
}

function getParents(flows){
    var dep = {};
    // store immediate dependants
    for(var iter=0; iter<flows.length; iter++){
        (function(iter) {
            insert(dep, flows[iter].get('targetRef'),flows[iter].get('sourceRef'));
        })(iter);
    }
    return dep;
}

function getChildren(flows){
    var dep = {};
    // store immediate dependants
    for(var iter=0; iter<flows.length; iter++){
        (function(iter) {
            insert(dep, flows[iter].get('sourceRef'),flows[iter].get('targetRef'));
        })(iter);
    }
    return dep;
}


function getLaneAccess(etree){
    // Get all participants(lanes)
    var childlanes,numchildlanes,laneName,accessible,childlane;

    // Stores mapping between the lane and the tasks(operations) restricted in that lane
    var laneToTasks = {};
    var lanes = etree.findall('./process/laneSet/lane');
    for(var iter=0; iter<lanes.length; iter++){
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
        for (var iter=0;iter<numTasks;iter++){
            if(value[iter].text.substring(0,4)!="Task"){
                laneToTasks[lane].splice(laneToTasks[lane].indexOf(value[iter]),1);
                iter--;
                numTasks--;
            }
        }
    }
    return laneToTasks;

}

function getOrgs(laneToTasks){
    var orgs = [];    
    for (var lane in laneToTasks){
        orgs.push(lane);
    }
    return orgs;
}

function parse(filename){
    var etree = getElementTree(filename);

    //sequence
    var flows = getFlows(etree);
    var incomingMap = getParents(flows);
    var outgoingMap = getChildren(flows);
    
    //access control
    var taskMap = getTaskMapping(etree);
    var laneToTasks = getLaneAccess(etree);
    var orgs = getOrgs(laneToTasks);

    /*
    // Print lanes and the tasks belonging to that lane
    for (var lane in laneToTasks){
        console.log(lane + ': ');
        var value = laneToTasks[lane];
        for (var y in value){
            console.log(taskMap[value[y].text]+" ");
        }
        console.log('----');
    }

    // Print all constructs and its dependancies
    for (var task in incomingMap){
        var value = incomingMap[task].length;
        var parent = "";
        for (var iter=0;iter<value;iter++){
            parent += incomingMap[task][iter]+", ";
        }
        console.log(task + ': ' + parent);
    }
    console.log(".-.-..-.--.--.-.-..-.--.-.-");
    // Print all constructs and its dependants
    for (var task in outgoingMap){
        var value = outgoingMap[task].length;
        var child = "";
        for (var iter=0;iter<value;iter++){
            child += outgoingMap[task][iter]+", ";
        }
        console.log(task + ': ' + child);
    }*/

}

parse('../../bpmn_examples/pizza.bpmn');