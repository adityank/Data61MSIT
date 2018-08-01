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
*   31 July 2018 - Dongliang Zhou - Minor bug fix and add comments
*
* Description: This is the parser which takes in a BPMN file path and sends the extracted information to generators. 
*
* External Dependencies: 
* 1. Path for existing BPMN file.
* 2. elementtree and hashset package
*
******************************************************************************************************************/

var fs = require('fs');
var et = require('elementtree');
var HashSet = require('hashset');
var generateYAML = require('./YamlGenerator');
var generateGo = require('./ChaincodeGenerator');
var logger = require('../Logger/logger');


// Helper structure for an object in BPMN (event, task, gateway)
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


// Parse XML format BPMN to a tree object
function getElementTree(data){
    // In particular, tree for XML file
    var XML = et.XML;
    var ElementTree = et.ElementTree;

    // The input bpmn file
    return et.parse(data);
}


// Helper function to get mappings from id to type and id to name
// And insert function names into a hashset to check duplicates
function getNameAndTypeMappings(etree,typeMap,nameMap,functionNames){
    var tasks = etree.findall('./bpmn:process/bpmn:task');

    // Check here if taskname is unique
    for(var iter=0; iter<tasks.length; iter++){
        typeMap[tasks[iter].get('id')] = 'task';
        if(functionNames.contains(tasks[iter].get('name'))){
            return "Duplicated function name detected: "+tasks[iter].get('name');
        }
        else{
            nameMap[tasks[iter].get('id')] = tasks[iter].get('name');
            functionNames.add(tasks[iter].get('name'));
        }
    }

    var starts = etree.findall('./bpmn:process/bpmn:startEvent');
    for(var iter=0; iter<starts.length; iter++){
        typeMap[starts[iter].get('id')] = 'START';
        nameMap[starts[iter].get('id')] = starts[iter].get('name');
    }

    var events = etree.findall('./bpmn:process/bpmn:intermediateThrowEvent');
    for(var iter=0; iter<events.length; iter++){
        typeMap[events[iter].get('id')] = 'event';
        nameMap[events[iter].get('id')] = events[iter].get('name');            
    }

    var xors = etree.findall('./bpmn:process/bpmn:exclusiveGateway');
    for(var iter=0; iter<xors.length; iter++){
        typeMap[xors[iter].get('id')] = 'XOR';
        nameMap[xors[iter].get('id')] = xors[iter].get('name');            
    }

    var ands = etree.findall('./bpmn:process/bpmn:parallelGateway');
    for(var iter=0; iter<ands.length; iter++){
        typeMap[ands[iter].get('id')] = 'AND';
        nameMap[ands[iter].get('id')] = ands[iter].get('name');            
    }

    // Inclusive Gateway feature is turned off
    var ors = etree.findall('./bpmn:process/bpmn:inclusiveGateway');
    if (ors.length>0) {
        return "Support for Inclusive Gateway is not enabled.";
    }


    var ends = etree.findall('./bpmn:process/bpmn:endEvent');
    for(var iter=0; iter<ends.length; iter++){
        typeMap[ends[iter].get('id')] = 'END';
        nameMap[ends[iter].get('id')] = ends[iter].get('name');            
    }
    return null;
}


// Helper function to get flows in the tree
function getFlows(etree){
    return etree.findall('./bpmn:process/bpmn:sequenceFlow');
}


// Helper function for value insertion with key check
function insert(dep, key, value) {
    if(!dep[key])
        dep[key] = [];
    dep[key].push(value);
}


// Helper function to get mappings from id to list of incoming/ougoing ids
// And insert XOR condition name to the function name hashset and check for duplicates
function getDependancies(flows,incomingMap,outgoingMap,typeMap,nameMap,laneMap,functionNames){
    // store immediate dependants
    for(var iter=0; iter<flows.length; iter++){
        //console.log( flows[iter].get('name') +" && " + typeMap[flows[iter].get('sourceRef')]);
        // XOR with condition specified -> transform condition to a task for flow control
        if(typeMap[flows[iter].get('sourceRef')] == 'XOR' && flows[iter].get('name') != null){
                //annotation exists
                var newid = 'Condition_'+flows[iter].get('id').toString().substring(13);//re-use sequence flow id, 13 is length of 'SequenceFlow_'
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


// Helper function to get mappings from id to lane name and list of peers(orgs)
// Returns any error message or null
function getOrgsAndAccess(etree,orgs,laneMap){
    // Get all participants(lanes)
    var childlanes,numchildlanes,laneName,accessible,childlane;

    // Stores mapping between the lane and the tasks(operations) restricted in that lane
    var lanes = etree.findall('./bpmn:process/bpmn:laneSet/bpmn:lane');
    var laneNames = new HashSet();

    if(lanes.length == 0) {
        return "The BPMN must have at least one lane.";
    }

    for(var iter=0; iter<lanes.length; iter++){
        var err = processLaneRecur(lanes[iter],orgs,laneNames,laneMap);
        if (err) return err;
    }
    return null;
}


// Helper function to get lane name recursively
// A task is mapped to the lowest level child lane
function processLaneRecur(lane,orgs,laneNames,laneMap) {
    var laneName = lane.get('name');
    if(!laneName) {
        return "All lanes must be named: "+lane.get('id');
    }
    if (!laneName.match(/^[0-9a-zA-Z_]+$/)){
        return "Lane names can only contain a-Z, 0-9, and _: "+laneName;
    }
    var childlanes = lane.findall('./bpmn:childLaneSet/bpmn:lane');
    var numchildlanes = childlanes.length;

    // If no childlanes, map tasks to that lane
    if(numchildlanes == 0){
        if (laneNames.contains(laneName)) {
            return "Duplicated lane name found: "+laneName;
        }
        laneNames.add(laneName);
        orgs.push(laneName);
        var allTasks = lane.findall('./bpmn:flowNodeRef');
        var numTasks = allTasks.length;
        for (var iter=0;iter<numTasks;iter++){
            laneMap[allTasks[iter].text] = laneName;
        }
        return null;
    }
    // else separately map tasks to childlanes
    else {
        for (var iter=0;iter<numchildlanes;iter++){
            var err = processLaneRecur(childlanes[iter],orgs,laneNames,laneMap);
            if (err) return err;
        }
        return null;
    }
}

// Helper function to put all maps together using Task structure
// Return the array of Tasks
function formArray(typeMap,nameMap,laneMap,incomingMap,outgoingMap){
    var array = [];
    for (var ids in typeMap){
        array.push(new Task(ids,typeMap[ids],nameMap[ids],laneMap[ids],outgoingMap[ids],incomingMap[ids]));
    }
    return array;
}


// Main function of Translator module
// Returns {errors: list of any error messages, num_peers: int to be saved in database, chaincode: as string}
function parse(data,unique_id){
    logger.init(unique_id);
    //tree
    var etree = getElementTree(data);
    //sequence
    var flows = getFlows(etree);
    
    //task name and type
    var nameMap = {};
    var typeMap = {};
    var functionNames = new HashSet();
    var err = null;
    err = getNameAndTypeMappings(etree,typeMap,nameMap,functionNames);
    if (err) return {errors: [err.toString()], num_peers: 0, chaincode: null};

    //access control
    var orgs = [];
    var laneMap = {};
    err = getOrgsAndAccess(etree,orgs,laneMap);
    if (err) return {errors: [err.toString()], num_peers: 0, chaincode: null};

    //task flow
    var incomingMap = {};
    var outgoingMap = {};    
    err = getDependancies(flows,incomingMap,outgoingMap,typeMap,nameMap,laneMap,functionNames);
    if (err) return {errors: [err.toString()], num_peers: 0, chaincode: null};

    var taskObjArray = formArray(typeMap,nameMap,laneMap,incomingMap,outgoingMap);

    try {generateYAML(orgs, unique_id);}
    catch (err) {return {errors: [err.toString()], num_peers: orgs.length, chaincode: null};}
    
    try {generateGo(unique_id, taskObjArray);}
    catch (err) {return {errors: [err.toString()], num_peers: orgs.length, chaincode: null};}

    // Write orgs to peers.txt for deployer reference
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

// Helper function for testing the module by given bpmn filename
function parse_by_file(filename,unique_id) {
    var data = fs.readFileSync(filename).toString();
    return parse(data,unique_id);
}

/*
test = "nested_child_lanes";
result = parse_by_file("../../bpmn_examples/"+test+".bpmn",test);
console.log(result.errors);
console.log(result.num_peers);
// test cases:
// invalid_lane_name duplicated_lane_names nested_child_lanes unnamed_lanes participant_without_lane
// no_participant inclusive_gateway duplicated_function_names

*/