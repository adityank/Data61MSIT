var fs = require('fs'),
	readline = require('readline');

var writer = fs.createWriteStream('test.go');


function generateGo(tasks, args) {
	console.log('begin');

	var template = fs.readFileSync('./template/task.txt', 'utf8');

	for (var i=0; i<tasks.length; i++) {
		var task_name = tasks[i];
		var task_arg = args[i];
		template.split(/\r?\n/).forEach(function(line){
			writer.write(eval('`'+line+'\n`'));
		});
	}

    console.log('end');
}

var tasks = ['createOrder','confirmOrder','cancelOrder'];
var args = [1,1,1];
generateGo(tasks, args);