/******************************************************************************************************************
* File:parser.js
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
*   14 June 2018 - Aditya Kamble - Integrated with YAMLGenerator and Server.
*   19 June 2018 - Aditya Kamble - Added different mappings to integrate with ChaincodeGenerator.
*
* Description: This is the parser which takes in a BPMN file path and sends the extracted information to generators. 
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
var generateGo = require('./ChaincodeGenerator');


function Task(id,name,type,lane,children,parents) {
    this.ID = id;
    this.Name = name;
    this.Type = type;
    this.Lane = lane;
    if(children)
        this.Children = children;
    else
        this.Children = [];
    if(parents)
        this.Parents = parents;
    else
        this.Parents = []; 
}

function getElementTree(filename){
    // In particular, tree for XML file
    var XML = et.XML;
    var ElementTree = et.ElementTree;

    // The input bpmn file
    var data = fs.readFileSync(filename).toString();
    return et.parse(data);
}

/*// Get all tasks
function getNameMapping(etree){
    var tasks = etree.findall('./process/task');
    // A mapping between unique task_id and the corresponding task name
    var nameMap = {};
    for(var iter=0; iter<tasks.length; iter++){
        (function(iter) {
            nameMap[tasks[iter].get('id')] = tasks[iter].get('name');
        })(iter);
    }
    return nameMap;
}*/

// Get mappings from id to type
function getNameAndTypeMappings(etree,typeMap,nameMap){

    var tasks = etree.findall('./process/task');
    // A mapping between unique task_id and the corresponding task name

    for(var iter=0; iter<tasks.length; iter++){
        (function(iter) {
            typeMap[tasks[iter].get('id')] = 'task';
            nameMap[tasks[iter].get('id')] = tasks[iter].get('name');
        })(iter);
    }

    var starts = etree.findall('./process/startEvent');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<starts.length; iter++){
        (function(iter) {
            typeMap[starts[iter].get('id')] = 'START';
            nameMap[starts[iter].get('id')] = starts[iter].get('name');
        })(iter);
    }

    var events = etree.findall('./process/intermediateThrowEvent');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<events.length; iter++){
        (function(iter) {
            typeMap[events[iter].get('id')] = 'event';
            nameMap[events[iter].get('id')] = events[iter].get('name');            
        })(iter);
    }

    var xors = etree.findall('./process/exclusiveGateway');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<xors.length; iter++){
        (function(iter) {
            typeMap[xors[iter].get('id')] = 'XOR';
            nameMap[xors[iter].get('id')] = xors[iter].get('name');            
        })(iter);
    }

    var ors = etree.findall('./process/parallelGateway');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<ors.length; iter++){
        (function(iter) {
            typeMap[ors[iter].get('id')] = 'OR';
            nameMap[ors[iter].get('id')] = ors[iter].get('name');            
        })(iter);
    }

    var ends = etree.findall('./process/endEvent');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<ors.length; iter++){
        (function(iter) {
            typeMap[ends[iter].get('id')] = 'END';
            nameMap[ends[iter].get('id')] = ends[iter].get('name');            
        })(iter);
    }
    
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


function getOrgsAndAccess(etree,orgs){
    // Get all participants(lanes)
    var childlanes,numchildlanes,laneName,accessible,childlane;

    // Stores mapping between the lane and the tasks(operations) restricted in that lane
    var laneMap = {};
    var lanes = etree.findall('./process/laneSet/lane');
    for(var iter=0; iter<lanes.length; iter++){
        (function(iter) {
            laneName = lanes[iter].get('name');
            childlanes = lanes[iter].findall('./childLaneSet/lane');
            numchildlanes = childlanes.length;

            // If no childlanes, map tasks to that lane
            if(numchildlanes == 0){
                orgs.push(laneName);
                var allTasks = lanes[iter].findall('./flowNodeRef');
                var numTasks = allTasks.length;
                for (var iter=0;iter<numTasks;iter++){
                    //if(allTasks[iter].text.substring(0,4)=="Task")
                    laneMap[allTasks[iter].text] = laneName;
                }
            }
            // else separately map tasks to childlanes
            while(numchildlanes>0){
                childlane = childlanes[numchildlanes-1];
                orgs.push(childlane.get('name'));
                var allTasks = childlane.findall('./flowNodeRef');
                var numTasks = allTasks.length;
                for (var iter=0;iter<numTasks;iter++){
                    //if(allTasks[iter].text.substring(0,4)=="Task")
                    laneMap[allTasks[iter].text] = childlane.get('name');
                }
                numchildlanes--;
            }
        })(iter);
    }
    return laneMap;
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

function formArray(typeMap,nameMap,laneMap,incomingMap,outgoingMap){
    var array = [];
    for (var ids in typeMap){
        //console.log(ids + ', ' + typeMap[ids] + ', ' + nameMap[ids] + ', ' + laneMap[ids]);
        array.push(new Task(ids,typeMap[ids],nameMap[ids],laneMap[ids],outgoingMap[ids],incomingMap[ids]));
    }
    return array;
}

/*module.exports = */function parse(filename,networkName,orgDomain){
    var etree = getElementTree(filename);

    //sequence
    var flows = getFlows(etree);
    var incomingMap = getParents(flows);
    var outgoingMap = getChildren(flows);
    
    //removeIntermediate(incomingMap);
    //removeIntermediate(outgoingMap);
    
    //pruneMap(incomingMap);
    //pruneMap(outgoingMap);

    var nameMap = {};
    var typeMap = {};
    getNameAndTypeMappings(etree,nameMap,typeMap);

    //access control
    //var nameMap = getTaskMapping(etree);

    var orgs = [];
    var laneMap = getOrgsAndAccess(etree,orgs);

    taskObjArray = formArray(typeMap,nameMap,laneMap,incomingMap,outgoingMap);
    console.log(taskObjArray);

/*    for (t in taskObjArray){
        console.log(taskObjArray[t].ID + ', ' + taskObjArray[t].Type + ', ' + taskObjArray[t].Name + ', ' + taskObjArray[t].Lane);
        console.log(taskObjArray[t].Children.length + ', ' + taskObjArray[t].Parents.length);
    }

    for (var t in laneMap){
        console.log(t + ': ' + laneMap[t]);
        console.log('----');
    }
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
    }*/

    generateYAML(orgs, networkName, orgDomain);
    
    generateGo(orgDomain, networkName, taskObjArray);
}

parse("../../bpmn_examples/pizza.bpmn","pizza","example.com");


/*
START
EVENT
TASK
AND
XOR
OR
END

*/


// var tasks = [{Type:'START', ID: 'sta123', Name:'Start', Parents:[], Children:['cre123'], Lane:'restaurant.example.com'},
//          {Type:'task', ID: 'cre123', Name:'Creat Order', Parents:['sta123'], Children:['and123'], Lane:'customer.example.com'},
//          {Type:'AND', ID: 'and123', Name:'Parellel Gateway', Parents:['cre123','cre666'], Children:[], Lane:'restaurant.example.com'}];

