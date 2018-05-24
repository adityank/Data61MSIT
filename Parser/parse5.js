// module for file-system
var fs = require('fs');

// module for element tree 
var et = require('elementtree');

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
        console.log(tasks[i].get('name'));
    })(i);
}


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
        console.log(laneName);
    })(i);
}

/*for (var x in laneToTasks){
    console.log(x + ': ');
    var value = laneToTasks[x];
    for (var y in value){
        console.log(value[y].text.substring(0,4));
        if(value[y].text.substring(0,4)!="Task")
            laneToTasks[x].splice(laneToTasks[x].indexOf(value[y]));
    }
}*/

for (var x in laneToTasks){
    console.log(x + ': ');
    var value = laneToTasks[x];
    for (var y in value){
        console.log(taskMap[value[y].text]+" ");
    }
    console.log('\n');
}

//console.log(etree.findall('./process/laneSet').length); // entities
//console.log(etree.findall('./entry/category')[0].get('term')); // monitoring.entity.create
//console.log(etree.findall('*/category/[@term="monitoring.entity.update"]').length); // 1