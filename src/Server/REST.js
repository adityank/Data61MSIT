/* 
  This provides restful api for server
  @by700git
*/

// require database
var mysql   = require("mysql");
var fs = require("fs");
var crypto = require('crypto');
var parse = require("../Translator/parser.js");




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
                                uniqle_id: "N/A",
                                all_networks: result,
                                translate_results: "N/A",
                                compile_results: "N/A",
                                deploy_results: "N/A",
                                invoke_results: "N/A"
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
    /*
    POST format
    {
        //  The BPMN    model   in  XML
        "xmlModel":
                "<?xml  version=\"1.0\" encoding=\"UTF-8\"?><bpmn:definitions>...</bpmn:definitions>",
        //  The BPMN    process name
        "processName":  "IncidentManagement",
        //  Whether or  not to  use Petri-net   method  (BPMN2Solidity  translator  option)
        "usePetriMethod":   true
    }
    */
    router.post("/api/v1/translate",function(req,res){
        console.log("Translating the BPMN file" );
        
        receive = {
          xmlModel:req.body.xmlModel,
        };
        console.log(receive);

        var uniqle_id = crypto.createHash('md5').update(receive.xmlModel).digest('hex').substring(0, 5);
        console.log("uniqle_id created: " + uniqle_id); 
        filename = "tmp/" + uniqle_id + ".bpmn";

        fs.writeFile(filename, receive.xmlModel, function (err) {
            if (err) {
                console.log(err);
            }

            translate_results = parse(filename,uniqle_id);

            query = "SELECT * FROM bpmn";
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Query all networks");
                // send response
                res.render('index',{
                                uniqle_id: uniqle_id,
                                all_networks: result,
                                translate_results: translate_results,
                                compile_results: "N/A",
                                deploy_results: "N/A",
                                invoke_results: "N/A"
                });
            });
        });
        //res.end(JSON.stringify(response));
    });

    //POST /api/v1/compile
    // req paramdter is the request object
    // res parameter is the response object
    /*
    POST format
    {
        // The only uniqle_id
        "uniqle_id": 
        // The chaincode
        "chaincode":     
    }
    */
    router.post("/api/v1/compile",function(req,res){
        console.log("Deploying Smart Contract" );
        
        receive = {
          uniqle_id:req.body.uniqle_id,
          chaincode:req.body.chaincode
        };
        console.log(receive);
        filename = "../../out/" + receive.uniqle_id + ".go";

        // save in out/uniqle_id/chaincode/*.go
        fs.writeFile(filename, receive.chaincode, function (err) {
            if (err) {
                console.log(err);
            }
            var status = compile(filename,receive.uniqle_id);

            query = "SELECT * FROM bpmn";
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Query all networks");
                // send response
                res.render('index',{
                                uniqle_id: receive.uniqle_id,
                                all_networks: result,
                                translate_results: "translate_results",
                                compile_results: "N/A",
                                deploy_results: "N/A",
                                invoke_results: "N/A"
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
        // The only uniqle_id
        "uniqle_id": 
        // The chaincode
        "chaincode":     
    }
    */
    router.post("/api/v1/deploy",function(req,res){
        console.log("Deploying Smart Contract" );
        
        receive = {
          uniqle_id:req.body.uniqle_id,
          chaincode:req.body.chaincode
        };
        console.log(receive);
        filename = "../../out/" + receive.uniqle_id + ".go";

        // save in out/uniqle_id/chaincode/*.go
        fs.writeFile(filename, receive.chaincode, function (err) {
            if (err) {
                console.log(err);
            }
            var status = deploy(filename,receive.uniqle_id);

            query = "SELECT * FROM bpmn";
            connection.query(query, function (err, result) {
                if (err) throw err;
                console.log("Query all networks");
                // send response
                res.render('index',{
                                uniqle_id: receive.uniqle_id,
                                all_networks: result,
                                translate_results: "translate_results",
                                compile_results: "N/A",
                                deploy_results: "N/A",
                                invoke_results: "N/A"
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
        // The only uniqle_id
        "uniqle_id": 
        // The chaincode
        "function_name":
        // The parameters, a list of parameters
        "parameters"    
    }
    */
    router.post("/api/v1/invoke",function(req,res){
        console.log("Invoking Smart Contract: function " + req.body.function_name);
        
        receive = {
          uniqle_id:req.body.uniqle_id,
          function_name:req.body.function_name,
          parameters:req.body.parameters
        };

        console.log(receive);
        
        var status = deploy(filename,receive.uniqle_id);     

        // send response
        res.render('index',{
                                uniqle_id: receive.uniqle_id,
                                all_networks: result,
                                translate_results: "translate_results",
                                compile_results: "N/A",
                                deploy_results: "N/A",
                                invoke_results: "N/A"
                });
        //res.end(JSON.stringify(response));
    });
}

// Makes this module available
module.exports = REST_ROUTER;