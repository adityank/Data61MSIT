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
*   01 July 2018 - Aditya Kamble - Modified the tag format to <bpmn:
*   20 July 2018 - Dongliang Zhou - Added support for annotated outflow from XOR gate.
*   23 July 2018 - Dongliang Zhou - Added error handling and unsupported message.
*
* Description: This is the parser which takes in a BPMN file path and sends the extracted information to generators. 
*
* External Dependencies: 
* 1. Path for existing BPMN file.
* 2. Node-modules: fs, elementtree, hashset
*
******************************************************************************************************************/

var fs = require('fs');
var et = require('elementtree');
var HashSet = require('hashset');
var generateYAML = require('./YamlGenerator');
var generateGo = require('./ChaincodeGenerator');
var logger = require('../Logger/logger');


function Task(id,type,name,lane,children,parents) {
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

// Get mappings from id to type
function getNameAndTypeMappings(etree,typeMap,nameMap,functionNames){
    // A mapping between unique task_id and the corresponding task name

    var tasks = etree.findall('./bpmn:process/bpmn:task');

    // Check here if taskname is unique
    for(var iter=0; iter<tasks.length; iter++){
        (function(iter) {
            typeMap[tasks[iter].get('id')] = 'task';
            if(functionNames.contains(tasks[iter].get('name'))){
                return "Duplicated function name detected: "+task[iter].get('name');
            }
            else{
                nameMap[tasks[iter].get('id')] = tasks[iter].get('name');
                functionNames.add(tasks[iter].get('name'));
            }
        })(iter);
    }

    var starts = etree.findall('./bpmn:process/bpmn:startEvent');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<starts.length; iter++){
        (function(iter) {
            typeMap[starts[iter].get('id')] = 'START';
            nameMap[starts[iter].get('id')] = starts[iter].get('name');
        })(iter);
    }

    var events = etree.findall('./bpmn:process/bpmn:intermediateThrowEvent');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<events.length; iter++){
        (function(iter) {
            typeMap[events[iter].get('id')] = 'event';
            nameMap[events[iter].get('id')] = events[iter].get('name');            
        })(iter);
    }

    var xors = etree.findall('./bpmn:process/bpmn:exclusiveGateway');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<xors.length; iter++){
        (function(iter) {
            typeMap[xors[iter].get('id')] = 'XOR';
            nameMap[xors[iter].get('id')] = xors[iter].get('name');            
        })(iter);
    }

    var ands = etree.findall('./bpmn:process/bpmn:parallelGateway');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<ands.length; iter++){
        (function(iter) {
            typeMap[ands[iter].get('id')] = 'AND';
            nameMap[ands[iter].get('id')] = ands[iter].get('name');            
        })(iter);
    }

    // Inclusive Gateway feature is turned off
    var ors = etree.findall('./bpmn:process/bpmn:inclusiveGateway');
    if (ors.length>0) {
        return "Support for Inclusive Gateway is not enabled.";
    }
    // A mapping between unique task_id and the corresponding task name
    // for(var iter=0; iter<ors.length; iter++){
    //     (function(iter) {
    //         typeMap[ors[iter].get('id')] = 'OR';
    //         nameMap[ors[iter].get('id')] = ors[iter].get('name');            
    //     })(iter);
    // }

    var ends = etree.findall('./bpmn:process/bpmn:endEvent');
    // A mapping between unique task_id and the corresponding task name
    for(var iter=0; iter<ends.length; iter++){
        (function(iter) {
            typeMap[ends[iter].get('id')] = 'END';
            nameMap[ends[iter].get('id')] = ends[iter].get('name');            
        })(iter);
    }
    return null;
}


function getFlows(etree){
    return etree.findall('./bpmn:process/bpmn:sequenceFlow');
}


function insert(dep, key, value) {
    if(dep[key])
        dep[key] = dep[key];
    else
        dep[key] = [];
    dep[key].push(value);
}


function getDependancies(flows,incomingMap,outgoingMap,typeMap,nameMap,laneMap,functionNames){
    // store immediate dependants
    for(var iter=0; iter<flows.length; iter++){
        (function(iter) {
            //console.log( flows[iter].get('name') +" && " + typeMap[flows[iter].get('sourceRef')]);
            if(typeMap[flows[iter].get('sourceRef')] == 'XOR' && flows[iter].get('name') != null){
                    //annotation exists
                    newid = 'Condition_'+flows[iter].get('id').toString().substring(13);//re-use sequence flow id, 13 is length of 'SequenceFlow_'
                    typeMap[newid] = 'task';
                    if(functionNames.contains(flows[iter].get('name'))){
                        return "Duplicated function name detected: "+flows[iter].get('name');
                    }
                    functionNames.add(flows[iter].get('name'));
                    nameMap[newid] = flows[iter].get('name');
                    // Owner of the XOR gate decides the path
                    laneMap[newid] = laneMap[flows[iter].get('sourceRef')];
    
                    insert(incomingMap, newid,flows[iter].get('sourceRef'));
                    insert(outgoingMap, flows[iter].get('sourceRef'),newid);
                    insert(incomingMap, flows[iter].get('targetRef'),newid);
                    insert(outgoingMap, newid,flows[iter].get('targetRef'));
            } else{
                insert(incomingMap, flows[iter].get('targetRef'),flows[iter].get('sourceRef'));
                insert(outgoingMap, flows[iter].get('sourceRef'),flows[iter].get('targetRef'));
            }
        })(iter);
    }
    // Check nested XOR gate
    for (source in outgoingMap){
        if (typeMap[source] == 'XOR' && outgoingMap[source].length > 1) {
            for (var iter=0; iter<outgoingMap[source].length; iter++) {
                var target = outgoingMap[source][iter];
                if (typeMap[target] == 'XOR' || typeMap[target] == 'AND') {
                    return "Immediate nested exclusive gateways is not supported. From "+source+" To "+target;
                }
            }
        }
    }
    return null;
}


function getOrgsAndAccess(etree,orgs,laneMap){
    // Get all participants(lanes)
    var childlanes,numchildlanes,laneName,accessible,childlane;

    // Stores mapping between the lane and the tasks(operations) restricted in that lane
    var lanes = etree.findall('./bpmn:process/bpmn:laneSet/bpmn:lane');
    for(var iter=0; iter<lanes.length; iter++){
        (function(iter) {
            laneName = lanes[iter].get('name');
            childlanes = lanes[iter].findall('./bpmn:childLaneSet/bpmn:lane');
            numchildlanes = childlanes.length;

            // If no childlanes, map tasks to that lane
            if(numchildlanes == 0){
                orgs.push(laneName);
                var allTasks = lanes[iter].findall('./bpmn:flowNodeRef');
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
                var allTasks = childlane.findall('./bpmn:flowNodeRef');
                var numTasks = allTasks.length;
                for (var iter=0;iter<numTasks;iter++){
                    //if(allTasks[iter].text.substring(0,4)=="Task")
                    laneMap[allTasks[iter].text] = childlane.get('name');
                }
                numchildlanes--;
            }
        })(iter);
    }

    if(lanes.length == 0)
        return "No lanes found."
}


function getOrgs(laneToTasks){
    var orgs = [];    
    for (var lane in laneToTasks){
        orgs.push(lane);
    }
    return orgs;
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


/* Pruning intermediate events is disabled in the parser
   Intermediate events are handled in the chaincode

// Returns if the task is intermediate
function intermediate(task){
    return task.toString().substring(0,12) == "Intermediate";
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
*/


function formArray(typeMap,nameMap,laneMap,incomingMap,outgoingMap){
    var array = [];
    for (var ids in typeMap){
        array.push(new Task(ids,typeMap[ids],nameMap[ids],laneMap[ids],outgoingMap[ids],incomingMap[ids]));
    }
    return array;
}


function parse(filename,unique_id){
    logger.init(unique_id);

    var etree = getElementTree(filename);

    //sequence
    var flows = getFlows(etree);
    
    var nameMap = {};
    var typeMap = {};
    var functionNames = new HashSet();
    var err = null;
    err = getNameAndTypeMappings(etree,typeMap,nameMap,functionNames);
    if (err) return {errors: err, num_peers: orgs.length, chaincode: null};

    //access control
    var orgs = [];
    var laneMap = {};

    err = null;
    err = getOrgsAndAccess(etree,orgs,laneMap);
    if (err) return {errors: err, num_peers: orgs.length, chaincode: null};


    var incomingMap = {};
    var outgoingMap = {};
    
    err = null;
    err = getDependancies(flows,incomingMap,outgoingMap,typeMap,nameMap,laneMap,functionNames);
    if (err) return {errors: err, num_peers: orgs.length, chaincode: null};

    /* Pruning intermediate events is disabled in the parser
       Intermediate events are handled in the chaincode
    removeIntermediate(incomingMap);
    removeIntermediate(outgoingMap);
    pruneMap(incomingMap);
    pruneMap(outgoingMap);
    */

    taskObjArray = formArray(typeMap,nameMap,laneMap,incomingMap,outgoingMap);
  
    try {generateYAML(orgs, unique_id);}
    catch (err) {return {errors: err, num_peers: orgs.length, chaincode: null};}
    
    try {generateGo(unique_id, taskObjArray);}
    catch (err) {return {errors: err, num_peers: orgs.length, chaincode: null};}

    var file = "../../out/" + unique_id + "/peers.txt";
    fs.writeFileSync(file, "");
    for(var iter=0;iter<orgs.length;iter++){
        fs.appendFileSync(file, orgs[iter]+"\n");
    }
    var gofile = "../../out/" + unique_id + "/chaincode/chaincode.go";
    var chaincode = fs.readFileSync(gofile,'utf-8');
    return {errors: null, num_peers: orgs.length, chaincode: chaincode};
}

module.exports = parse;

//parse("../../bpmn_examples/andgate.bpmn","andgate");
//parse("../../bpmn_examples/databased.bpmn","databased");

