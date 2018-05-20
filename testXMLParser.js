var fs = require('fs');
var parse = require('xml-parser');
var xml = fs.readFileSync('pizza.bpmn', 'utf8');
var inspect = require('util').inspect;
 
var obj = parse(xml);
console.log(inspect(obj, { colors: true, depth: Infinity }));
