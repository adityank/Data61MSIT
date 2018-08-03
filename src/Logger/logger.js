/******************************************************************************************************************
* File:logger.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   1 June 2018 - Aditya Kamble - Initial structure
*
* Description: This is the logger for all other modules.
*
******************************************************************************************************************/


var fs = require('fs');
var path = require('path');
var log_root = path.join(__dirname, '../../logs/');
var logPath, file;
var timeformat = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };

exports.init = function(unique_id){
	if (!fs.existsSync(log_root)) {
	    fs.mkdirSync(log_root);
	}
	if (!fs.existsSync(log_root+unique_id)) {
	    fs.mkdirSync(log_root+unique_id);
	}
	logPath = log_root + unique_id + '/';
}

exports.log = function(type,text){
	file = logPath + type + '.log'
	try {fs.appendFileSync(file, (new Date()).toLocaleDateString("en-US", timeformat) + ":: " +  text + "\n");}
	catch (err) {console.log(err);} // We don't want to crash the whole server.
}