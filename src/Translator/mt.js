//https://stackoverflow.com/questions/27560968/how-can-i-run-multiple-node-js-scripts-from-a-main-node-js-scripts
//https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
//https://medium.freecodecamp.org/node-js-child-processes-everything-you-need-to-know-e69498fe970a


//index.js
var module1 = require('./at'),
  	module2 = require('./bt');

module1();
module2();