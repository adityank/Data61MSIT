var fs = require('fs');

var date = new Date();

var logPath, deployer_writer, translator_writer, invoker_writer;

/*module.exports = function init(){

	if (!fs.existsSync('../../logs')) {
	    fs.mkdirSync('../../logs');
	}

	if (!fs.existsSync('../../logs/'+domain)) {
	    fs.mkdirSync('../../logs/'+domain);
	}

	if (!fs.existsSync('../../logs/'+domain+'/'+networkName)) {
	    fs.mkdirSync('../../logs/'+domain+'/'+networkName);
	}

	logPath = '../../logs/' + networkName + '/';

	deployer_writer = fs.createWriteStream(logPath + 'deployer_log.txt');

	translator_writer = fs.createWriteStream(logPath + 'translator_log.txt');

	invoker_writer = fs.createWriteStream(logPath + 'invoker_log.txt');

	return translator_writer;
}*/

exports.getWriter = function(type,domain,networkName){

	if (!fs.existsSync('../../logs')) {
	    fs.mkdirSync('../../logs');
	}

	if (!fs.existsSync('../../logs/'+domain)) {
	    fs.mkdirSync('../../logs/'+domain);
	}

	if (!fs.existsSync('../../logs/'+domain+'/'+networkName)) {
	    fs.mkdirSync('../../logs/'+domain+'/'+networkName);
	}

	logPath = '../../logs/' + domain + '/' + networkName + '/';

	deployer_writer = fs.createWriteStream(logPath + 'deployer_log.txt');

	translator_writer = fs.createWriteStream(logPath + 'translator_log.txt');

	invoker_writer = fs.createWriteStream(logPath + 'invoker_log.txt');

	console.log("type is ::::::::::::::::::::"  + type);

	if(type == 'deployer')
		return deployer_writer;		
	else if(type == 'invoker')
		return invoker_writer;
}

exports.log = function(writer,text){
	if(writer == null){
		console.log("Failed to log!");
		return;
	}
	var current_hour = date.getHours();

	writer.write(current_hour + ":: " +  text);
	console.log("written!");
}