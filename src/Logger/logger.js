var fs = require('fs');

var logPath, file;

exports.init = function(unique_id){

	if (!fs.existsSync('../../logs')) {
	    fs.mkdirSync('../../logs');
	}

	if (!fs.existsSync('../../logs/'+unique_id)) {
	    fs.mkdirSync('../../logs/'+unique_id);
	}
	logPath = '../../logs/' + unique_id + '/';
	
}

exports.log = function(type,text){

	file = logPath + type + '.log'
	fs.appendFile(file, new Date() + ":: " +  text + "\n", function (err) {
		if (err) 
			throw err;
		console.log('written!');
	});
}