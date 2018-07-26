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
            
            // compose response object
            var response = {
                "errors":translate_results.result,
                "contractCode":translate_results.chaincode
            };

            res.json(response);
            
        });
        //res.end(JSON.stringify(response));
    });

    //POST /api/v1/account/fetch
    // Note: this fucntion is deprecated in Hyperledger
    /*
    Response format
    {
        "error": "If error occurred" | null, 
        "result": [
        "0x11D6fd252049f869349CAdf4E2df3E17c8539Bf0", "0x180d34b876DAa90057B2Ec345E82E2B1E9a4A082", ...
        ] 
    }
    */
    router.post("/api/v1/account/fetch",function(req,res){
        var response = {
            "errors":"This function is not supported.",
            "result":"This function is not supported."
        };
        res.json(response);
        //res.end(JSON.stringify(response));
    });



    //POST /api/v1/compile
    // req paramdter is the request object
    // res parameter is the response object
    /*
    Request format
    {
        "contractCode": "pragma solidity ^0.4.18; contract ProcessFactory {...}", 
        // Whether or not to enable compiler optimization (solc compiler option) 
        "optimizationEnabled": true
    }
    Response format
    {
    "errors": ["Compilation errors or warnings"] | null, "contracts": {
    // The smart contract name. The Solidity code provided may define multiple smart contracts.
    "ProcessFactory": {
    // The smart contract Application Binary Interface (ABI) "interface": [
    {
        "type": "function",
        "name": "createInstance",
        "constant": false,
        "payable": false,
        "inputs": [{ "name": "_participants", "type": "address[]" }], "outputs": [{ "name": "", "type": "uint256" }]
        }
        ... ],
        // Compiled EVM bytecode
        "bytecode": "0xdeadbeef",
        // Contract EVM bytecode at runtime (i.e. constructor excluded) "runtimeBytecode": "0xbeef",
        // Execution cost estimate for contract deployment and contract functions "gasEstimates": {
                "creation": 100000,
                "external": {
        "createInstance(address[])": 50000
        ... },
        "internal": { "setPreconditions(uint256,uint256)": 20314 ...
        } }
            },
            "ProcessMonitor": {
        ... }
        } 
    }
    */
    router.post("/api/v1/contract/compile",function(req,res){
        console.log("Deploying Smart Contract" );
        
        receive = {
          unique_id:req.body.unique_id,
          chaincode:req.body.contractCode
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

            var response = {
                "errors":compile_status
            };

            res.json(response);
        });
        //res.end(JSON.stringify(response));
    });



    //POST /api/v1/deploy
    // req paramdter is the request object
    // res parameter is the response object
    /*
    Request format
    {
        // Ethereum account to use for sending the contract deployment transaction. 
        "sender": "0x11D6fd252049f869349CAdf4E2df3E17c8539Bf0",
        // Compiled EVM bytecode of smart contract
        "bytecode": "0xdeadbeef",
        // Number of confirmations to wait before the transaction is consideredcommitted. 
        "numConfirmations": 0
    }
    Response format
    {
        "error": "If error occurred" | null,
        // UUID generated for deployment. Will be used to watch deployment progress. 
        "result": "<DEPLOYMENT_ID_FOR_WATCHING_DEPLOYMENT_PROGRESS>"
    }
    */
    router.post("/api/v1/deploy",function(req,res){
        console.log("Deploying Smart Contract" );
        
        receive = {
          unique_id:req.body.sender,
          chaincode:req.body.bytecode
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

            var response = {
                "result": deploy_results.result,
                "error": deploy_results.message
            };

            res.json(response);
        });
        

        //res.end(JSON.stringify(response));
    });

    //POST /api/v1/contract/function/call
    // req paramdter is the request object
    // res parameter is the response object
    /*
    Request body: 
    {
        "contractAddress": "0xe71cEE28a1AE3c9501d990C192D2D364016cEb13", 
        "contractAbi": [
        {
        "type": "function",
        "name": "isProcessInstanceCompleted",
        "constant": true,
        "payable": false,
        "inputs": [{ "name": "instanceID", "type": "uint256" }], "outputs": [{ "name": "", "type": "bool" }]
        } 
        ],
        "fnName": "isProcessInstanceCompleted",
        // Smart contract function parameters.
        // Must specify in the same order as the 'inputs' array in the contract ABI. 
        "fnParams": [
        {
            "type": "uint256", "value": "<PARAM_VALUE>"
        } 
        ],
        "txParams": {
        // Ethereum account to use for calling the function "from": "<SENDER_ETHEREUM_ACCOUNT>"
        },
        "defaultBlock": "<BLOCK_NUMBER | latest | pending>" 
    }
    Response body:
    {
        "error": "If error occurred" | null, 
        "result": "<FUNCTION_LOCAL_CALL_RESULT>"
    }
    */
    router.post("/api/v1/contract/function/call",function(req,res){
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
        var response = {
            "error":null,
            "result":invoke_results
        };
        
        res.json(response);
    });

};
// Makes this module available
module.exports = REST_ROUTER;