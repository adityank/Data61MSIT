var fs = require('fs');

var logPath, file;

var timeformat = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };

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
	fs.appendFile(file, (new Date()).toLocaleDateString("en-US", timeformat) + ":: " +  text + "\n", function (err) {
		if (err) 
			throw err;
	});
}