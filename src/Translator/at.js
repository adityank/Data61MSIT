//module1.js
var colors = require('colors');

function module1() {
  console.log('module1 started doing its job!'.red);

  setInterval(function () {
    console.log(('module1 timer:' + new Date().getTime()).red);
  }, 2000);
}

module.exports = module1;