/******************************************************************************************************************
* File:parse5.go
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   26 May 2018 - Aditya Kamble - Parsing of a BPMN file done to extract the tasks and lanes. A dependancy graph
*   is created to identify dependancies between tasks. Tasks are mapped to lanes to identify access control logic. 
*   04 June 2018 - Aditya Kamble - Refactored by creating separate functions. Returning mainly 3 things:
*   1. Incoming (parent) nodes for every construct.
*   2. Outgoing (child) nodes for every construct.
*   3. Access to tasks every lane has
*   06 June 2018 - Aditya Kamble - Handled intermediate events and adjusted dependancies and dependants accordingly. 
*    Started adding code to integrate with YAMLGenerator and ChaincodeGenerator.
*
* Description: This is the parser which takes in a BPMN file and sends the extracted information to generators. 
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

var generateYAML = require('./YAMLGenerator');
//var generateCC = require('./ChaincodeGenerator');
//var module1 = require('./at'),
//    module2 = require('./bt');


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

// Returns if the task is intermediate
function intermediate(task){
    return task.toString().substring(0,12) == "Intermediate";
}

// Returns the first non-intermediate child task of the task  
function getChild(task,outgoingMap){
    while(intermediate(task)){
        task = outgoingMap[task];
    }
    return task;
}

// Returns the first non-intermediate parent task of the task  
function getParent(task,incomingMap){
    while(intermediate(task)){
        task = incomingMap[task];
    }
    return task;
}

// Updates the child or parent to the task after skipping the intermediate one
function removeIntermediate(map){
    for (var task in map){
        var value = map[task].length;
        var temp;
        for (var iter=0;iter<value;iter++){
            if(intermediate(map[task][iter])){
                temp = map[task][iter];
                map[task].splice(iter,1);
                iter--;
                map[task].push(getParent(temp,map));
            }
        }
    }
}

// Removes intermediate tasks from the map
function pruneMap(map){
    for (var task in map){
        if(intermediate(task))
            delete map[task];
    }
}

function parse(filename){
    var etree = getElementTree(filename);

    //sequence
    var flows = getFlows(etree);
    var incomingMap = getParents(flows);
    var outgoingMap = getChildren(flows);
    
    removeIntermediate(incomingMap);
    removeIntermediate(outgoingMap);
    
    pruneMap(incomingMap);
    pruneMap(outgoingMap)

    //access control
    var taskMap = getTaskMapping(etree);
    var laneToTasks = getLaneAccess(etree);
    var orgs = getOrgs(laneToTasks);

    //generateYAML(orgs, "pizzanetwork", "example.com");
    //generateCC();
    /*
    // Print lanes and the tasks belonging to that lane
    for (var lane in laneToTasks){
        console.log(lane + ': ');
        var value = laneToTasks[lane];
        for (var y in value){
            console.log(taskMap[value[y].text]+" ");
        }
        console.log('----');
    }*/
    console.log(".-.-..-.--.--.-.-..-.--.-.-");
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
    }

    generateYAML(orgs, 'pizzanetwork', 'example.com');
    //generateCC(tasks,['createOrder','confirmOrder','cancelOrder'],[1,1,1])

}

parse('../../bpmn_examples/pizza.bpmn');
