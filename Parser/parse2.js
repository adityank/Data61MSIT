const xml = require("xml-parse");
var fs = require('fs');
// Valid XML string
var file = fs.readFileSync('bpmn/pizza.bpmn', 'utf8');
var parsedXML = xml.parse(file);
console.log(parsedXML);
 