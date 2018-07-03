var fs = require('fs');


var logPath, file;

exports.init = function(domain){

	if (!fs.existsSync('../../logs')) {
	    fs.mkdirSync('../../logs');
	}

	if (!fs.existsSync('../../logs/'+domain)) {
	    fs.mkdirSync('../../logs/'+domain);
	}

	if (!fs.existsSync('../../logs/'+domain)) {
	    fs.mkdirSync('../../logs/'+domain);
	}

	logPath = '../../logs/' + domain + '/';
	
}

exports.log = function(type,text){

	if(type == 'deployer')
		file = logPath + 'deployer_log.txt';
	else if(type == 'invoker')
		file = logPath + 'invoker_log.txt';		
	else
		file = logPath + 'translator_log.txt';
	fs.appendFile(file, new Date() + ":: " +  text + "\n", function (err) {
		if (err) 
			throw err;
		console.log('written!');
	});
}