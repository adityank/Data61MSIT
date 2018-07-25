// BPMN server
// @by700git

var express = require("express");             //express is a Node.js web application framework 
var mysql   = require("mysql");               //Database
var bodyParser  = require("body-parser");     //Javascript parser utility
var rest = require("./REST.js");              //REST services/handler module
var app  = express();                         //express instance

// Function definition
function REST(){
    var self = this;
    self.connectMysql();
};

REST.prototype.connectMysql = function() {
    var self = this;
    var pool = mysql.createPool({
        connectionLimit : 100,
        host     : 'localhost',
        user     : 'root',
        password : 'Unchained#1',  // replace with your MySQL password
        database : 'bpmn',
        debug    :  false
    });

    // Here make the connection to the bpmn database and create table
    pool.getConnection(function(err,connection) {
        if (err) {
          self.stop(err);
        } 
        else {
          query = "CREATE TABLE IF NOT EXISTS bpmn (id INT AUTO_INCREMENT PRIMARY KEY, unique_id VARCHAR(255), status INT, num_peers INT)";
          connection.query(query,function(err,result){
              if (err) throw err;
              console.log("Database connected");
          });
          self.configureExpress(connection);
        }
    });
}

// Configure express and the body parser so the server process can get parsed URLs. 
REST.prototype.configureExpress = function(connection) {
      var self = this;
      app.use(bodyParser.urlencoded({ extended: true }));
      app.use(bodyParser.json());
      app.use(bodyParser.text());

      app.set('view engine', 'ejs');
      
      var router = express.Router();
      app.use('', router);
      app.use(express.static('public'));
      var rest_router = new rest(router,connection);
      self.startServer();
}

REST.prototype.startServer = function() {
      app.listen(3000,function(){
          console.log("Server Started at Port 3000.");
      });
}

REST.prototype.stop = function(err) {
    console.log("Issue connecting with mysql and/or connecting to the database.\n" + err);
    process.exit(1);
}

new REST();
