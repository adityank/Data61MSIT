// initialize num1,num2
// spawn bt.js and send num1 and num2 to it

var t2 = require("./bt.js");

module.exports = {
    do1: function() {
    	var a = 10;
    	var b = 20;
        return t2.do2(a,b);
    }
};

