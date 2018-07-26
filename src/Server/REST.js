/* 
  This provides restful api for server
  @by700git
*/

// require database
var mysql   = require("mysql");
var fs = require("fs");
var crypto = require('crypto');

const uniqueString = require('unique-string');
const importFresh = require('import-fresh');

var sh = require("shorthash");

const getPortSync = require('get-port-sync');


function REST_ROUTER(router,connection) {
    var self = this;
    self.handleRoutes(router,connection);
}


// Define the routes. A route is a path taken through the code dependent upon contents of the URL
REST_ROUTER.prototype.handleRoutes= function(router,connection) {

    // GET with no specifier - returns system version information
    // req paramdter is the request object
    // res parameter is the response object
    router.get("/",function(req,res){
        res.json({"Message":"BPMN Translation Server Version 1.0"});
    });


    // Index page used for testing
    router.get("/index",function(req,res){
        query = "SELECT * FROM bpmn";
        connection.query(query, function (err, result) {
            if (err) throw err;
            console.log("Query all networks");
            res.render('index',{
                                unique_id: "N/A",
                                all_networks: result,
                                translate_results: "N/A",
                                compile_results: "N/A",
                                deploy_results: "N/A",
                                invoke_results: "N/A",
                                translated_chaincode: "N/A"
            });
        });        
        //res.sendFile( __dirname + "/public/index.html" );
    });
    
    /*
    // list all created or deployed networks
    router.get("/api/v1/list",function(req,res){
        var query = "SELECT * FROM bpmn";
        connection.query(query, function (err, result) {
            
            console.log("Query all networks");
        });
        res.render('index',{
                            all_networks: "N/A",
                            translate_results: "N/A",
                            compile_results: "N/A",
                            deploy_results: "N/A",
                            invoke_results: "N/A"
        });
    });
    */


    
    // POST /api/v1/translate
    // req paramdter is the request object
    // res parameter is the response object
    // Note: some the parameters is deprecated in Hyperledger
    /*
    POST format
    {
        // The BPMN model in XML
        "xmlModel":
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?><bpmn:definitions>...
        </bpmn:definitions>",
        // The BPMN process name
        "processName": "IncidentManagement",
        // Whether or not to use Petri-net method (BPMN2Solidity translator option)
        "usePetriMethod": true
    }
    Response format
    {
        "errors": ["<ARRAY_OF_TRANSLATION_ERRORS>"] | null,
        // Solidity smart contract output
        "contractCode":
        "pragma solidity ^0.4.18; contract ProcessFactory {...}" | null
        }
    */
    router.post("/api/v1/translate",function(req,res){
        console.log("Translating the BPMN file" );
        
        receive = {
          xmlModel:req.body.xmlModel,
        };
        console.log(receive);


        var unique_id = sh.unique(uniqueString());
        console.log("unique_id created: " + unique_id); 
        filename = "tmp/" + unique_id + ".bpmn";


        fs.writeFile(filename, receive.xmlModel, function (err) {
            if (err) {
                console.log(err);
            }

            var parse = importFresh("../Translator/parser.js");
            var translate_results;
            translate_results = parse(filename,unique_id);
            console.log(translate_results.result);
            console.log(translate_results.num_peers);

            query = "INSERT INTO bpmn (unique_id, status, num_peers) VALUES (?,?,?)";
            table = [unique_id,0,translate_results.num_peers];

            query = mysql.format(query,table);
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Adding new entries");
            });

        res.errors = null;
            
        });
        //res.end(JSON.stringify(response));
    });

    //POST /api/v1/compile
    // req paramdter is the request object
    // res parameter is the response object
    /*
    POST format
    {
        // The only unique_id
        "unique_id": 
        // The chaincode
        "chaincode":     
    }
    */
    router.post("/api/v1/compile",function(req,res){
        console.log("Deploying Smart Contract" );
        
        receive = {
          unique_id:req.body.unique_id,
          chaincode:req.body.chaincode
        };
        console.log(receive);
        filename = "../../out/" + receive.unique_id + "/chaincode/chaincode.go";

        // save in out/unique_id/chaincode/*.go
        fs.writeFile(filename, receive.chaincode, function (err) {
            if (err) {
                console.log(err);
            }

            var compile = importFresh("../Compiler/compiler.js");
            var compile_status = compile(filename);

            query = "SELECT * FROM bpmn";
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Query all networks");
                // send response
                res.render('index',{
                                unique_id: receive.unique_id,
                                all_networks: result,
                                translate_results: "N/A",
                                compile_results: compile_status,
                                deploy_results: "N/A",
                                invoke_results: "N/A",
                                translated_chaincode: "N/A"
                });
            });
        });
        //res.end(JSON.stringify(response));
    });

    //POST /api/v1/deploy
    // req paramdter is the request object
    // res parameter is the response object
    /*
    POST format
    {
        // The only unique_id
        "unique_id": 
        // The chaincode
        "chaincode":     
    }
    */
    router.post("/api/v1/deploy",function(req,res){
        console.log("Deploying Smart Contract" );
        
        receive = {
          unique_id:req.body.unique_id,
          chaincode:req.body.chaincode
        };
        console.log(receive);
 

        query = "SELECT * FROM bpmn WHERE unique_id=?";
        table = [receive.unique_id];
        query = mysql.format(query,table);
        connection.query(query, function (err, result) {
            if (err) throw err;
            console.log("Querying new status");
            console.log(result[0].status);
            var status = result[0].status;
            var num_peers = result[0].num_peers;

            var ports = [];
            for(var iter=0;iter<2*num_peers + 1;iter++){
                ports.push(getPortSync());
            }

            var deploy = importFresh("../Deployer/deployer.js");
            // parameters: unique_id and status
            console.log('status:'+status);
            deploy_results = deploy.deploy(receive.unique_id,status,ports);
            query = "UPDATE bpmn SET status=? WHERE unique_id=?";
            table = [deploy_results.result, receive.unique_id];
            query = mysql.format(query,table);
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Updating deployment status");
            });

            query = "SELECT * FROM bpmn";
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Query all networks");
                // send response
                res.render('index',{
                                unique_id: receive.unique_id,
                                all_networks: result,
                                translate_results: "N/A",
                                compile_results: "N/A",
                                deploy_results: deploy_results.message,
                                invoke_results: "N/A",
                                translated_chaincode: "N/A"

                });
            });
        });
        

        //res.end(JSON.stringify(response));
    });

    //POST /api/v1/bringdown
    // req paramdter is the request object
    // res parameter is the response object
    /*
    POST format
    {
        // The only unique_id
        "unique_id": 
    }
    */
    router.post("/api/v1/bringdown",function(req,res){
        console.log("Bringing down containers" );
        
        receive = {
          unique_id:req.body.unique_id
        };
        console.log(receive);
 

        query = "SELECT * FROM bpmn WHERE unique_id=?";
        table = [receive.unique_id];
        query = mysql.format(query,table);
        connection.query(query, function (err, result) {
            if (err) throw err;
            console.log("Querying new status");
            console.log(result[0].status);
            var status = result[0].status;

            var deploy = importFresh("../Deployer/deployer.js");
            // parameters: unique_id and status
            console.log('status:'+status);
            deploy_results = deploy.bringDown(receive.unique_id,status);
            query = "UPDATE bpmn SET status=? WHERE unique_id=?";
            table = [deploy_results.result, receive.unique_id];
            query = mysql.format(query,table);
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Updating deployment status");
            });

            query = "SELECT * FROM bpmn";
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Query all networks");
                // send response
                res.render('index',{
                                unique_id: receive.unique_id,
                                all_networks: result,
                                translate_results: "N/A",
                                compile_results: "N/A",
                                deploy_results: deploy_results.message,
                                invoke_results: "N/A",
                                translated_chaincode: "N/A"

                });
            });
        });
        

        //res.end(JSON.stringify(response));
    });

    //POST /api/v1/invoke
    // req paramdter is the request object
    // res parameter is the response object
    /*
    POST format
    {
        // The only unique_id
        "unique_id": 
        // The chaincode
        "function_name":
        // The parameters, a list of parameters
        "parameters"    
    }
    */
    router.post("/api/v1/invoke",function(req,res){
        console.log("Invoking Smart Contract: function " + req.body.function_name);
        
        receive = {
          peer:req.body.peer,
          unique_id:req.body.unique_id,
          function_name:req.body.function_name,
          parameters:req.body.parameters
        };

        console.log(receive);

        var parameters;
        if (receive.parameters!="")
            parameters = receive.parameters.split(',');
        else
            parameters = [];
        console.log(parameters);
        var invoke = importFresh("../Invoker/invoker.js");
        var invoke_results = invoke(receive.unique_id, receive.peer, receive.function_name, parameters);     

        // send response
        res.render('index',{
                                unique_id: receive.unique_id,
                                all_networks: "N/A",
                            translate_results: "N/A",
                            compile_results: "N/A",
                            deploy_results: "N/A",
                            invoke_results: invoke_results,
                            translated_chaincode: "N/A"
            });
        });
};
// Makes this module available
module.exports = REST_ROUTER;