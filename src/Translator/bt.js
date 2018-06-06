//module2.js
var colors = require('colors');

function module2() {
  console.log('module2 started doing its job!'.blue);

  setTimeout(function () {

    setInterval(function () {
      console.log(('module2 timer:' + new Date().getTime()).blue);
    }, 2000);

  }, 1000);
}

module.exports = module2;