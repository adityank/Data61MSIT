var fastXmlParser = require('fast-xml-parser');
var fs = require('fs')
var xmlData = fs.readFileSync('bpmn/pizza.bpmn', 'utf8');
var jsonObj = fastXmlParser.parse(xmlData);
//construct schema manually or with the help of schema builder
var schema = {
    "functions": [{
        "name": "string",        
    }]
}
var nimndata = fastXmlParser.parseToNimn(xmlData,schema);
//or
var options = {
    attributeNamePrefix : "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName : "#text",
    ignoreAttributes : true,
    ignoreNameSpace : false,
    allowBooleanAttributes : false,
    parseNodeValue : true,
    parseAttributeValue : false,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",

};
if(fastXmlParser.validate(xmlData)=== true){//optional
	var jsonObj = fastXmlParser.parse(xmlData,options);
}

//Intermediate obj
var jsonObj = fastXmlParser.convertToJson(tObj,options);
console.log(jsonObj);
//construct schema manually or with the help of schema builder
var nimndata = fastXmlParser.convertTonimn(tObj,schema,options);
