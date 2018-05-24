// module for file-system
var fs = require('fs');

// module for element tree 
var et = require('elementtree');

// In particular, tree for XML file
var XML = et.XML;
var ElementTree = et.ElementTree;

var element = et.Element;
var subElement = et.SubElement;

var data, etree,i;

data = fs.readFileSync('bpmn/pizza.bpmn').toString();
etree = et.parse(data);

// Get all tasks
var tasks = etree.findall('./process/task');
for(i=0; i<tasks.length; i++){
    (function(i) {
        console.log(tasks[i].get('name'));
    })(i);
}


// Get all participants(lanes)
var childlanes,numchildlanes,laneName;

var lanes = etree.findall('./process/laneSet/lane');
for(i=0; i<lanes.length; i++){
    (function(i) {
        laneName = lanes[i].get('name');
        childlanes = lanes[i].findall('./childLaneSet/lane');
        numchildlanes = childlanes.length;
        while(numchildlanes>0){
            laneName += ", " + childlanes[numchildlanes-1].get('name');
            numchildlanes--;
        }
        console.log(laneName);
    })(i);
}


//console.log(etree.findall('./process/laneSet').length); // entities
//console.log(etree.findall('./entry/category')[0].get('term')); // monitoring.entity.create
//console.log(etree.findall('*/category/[@term="monitoring.entity.update"]').length); // 1