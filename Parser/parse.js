//task(functions),order of tasks,logic,who can do what

//xml-parser
//xml-parse
//xml2js
//elementtree


var fs = require('fs');
const parse = require('xml-parser');
var xml = fs.readFileSync('bpmn/pizza.bpmn', 'utf8');
var inspect = require('util').inspect;
 
var obj = parse(xml);

//var proc = obj.getElementsByTagName("process")[0];

//console.log(proc.childNodes[0].parentNode);
//console.log(inspect(obj, { depth: Infinity }));
fs.writeFile('parsed.json', inspect(obj, { depth: Infinity }), 'utf8');