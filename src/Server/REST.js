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
    // req parameter is the request object
    // res parameter is the response object
    router.get("/",function(req,res){
        return res.json({"Message":"BPMN Translation Server Version 1.0"});
    });
    
    // POST /api/v1/translate
    // req parameter is the request object
    // res parameter is the response object
    // Note: some the parameters is deprecated in Hyperledger
    /*
    POST format
    {
        // The BPMN model in XML
        "xmlModel":
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?><bpmn:definitions>...
        </bpmn:definitions>"
    }
    Response format
    {
        "errors": ["<ARRAY_OF_TRANSLATION_ERRORS>"] | null,
        // Go chaincode smart contract output
        "contractCode":
        "type SmartContract struct {}..." | null
        }
    */
    router.post("/api/v1/translate",function(req,res){
        console.log("Translating the BPMN file" );
        
        receive = {
          xmlModel:req.body.xmlModel,
        };
        console.log(receive);
        var response;
        if (!receive.xmlModel) {
            response = {
                "errors":["xmlModel must be supplied."],
                "contractCode":null,
                "unique_id":null
            };
            return res.json(response);
        }

        var unique_id = sh.unique(uniqueString());
        console.log("unique_id created: " + unique_id); 
        filename = "tmp/" + unique_id + ".bpmn";

        fs.writeFile(filename, receive.xmlModel, {flag:'wx'}, function (err) {
            if (err) {
                console.log(err);
                response = {
                    "errors":err,
                    "contractCode":null,
                    "unique_id":null
                };
                return res.json(response);
            }
            var parse = importFresh("../Translator/parser.js");
            var translate_results;
            try {translate_results = parse(filename,unique_id);}
            catch (err) {
                response = {
                    "errors":err.toString(),
                    "contractCode":null,
                    "unique_id":null
                };
                return res.json(response);
            }
            console.log(translate_results.errors);
            console.log(translate_results.num_peers);
            console.log(translate_results.chaincode);

            if (translate_results.errors) {
                response = {
                    "errors":translate_results.errors,
                    "contractCode":null,
                    "unique_id":null
                };
                return res.json(response);
            }

            query = "INSERT INTO bpmn (unique_id, status, num_peers) VALUES (?,?,?)";
            table = [unique_id,0,translate_results.num_peers];

            query = mysql.format(query,table);
            connection.query(query, function (err, result) {
                if (err) {
                    console.log(err);
                    response = {
                        "errors":err,
                        "contractCode":null,
                        "unique_id":null
                    };
                    return res.json(response);
                }
                console.log("Adding new entries");
                // compose response object
                response = {
                    "errors":translate_results.result,
                    "contractCode":translate_results.chaincode,
                    "unique_id":unique_id
                };
                console.log(response.contractCode);
                return res.json(response);
            });
        });
        //res.end(JSON.stringify(response));
    });

    //POST /api/v1/account/fetch
    // Note: this fucntion returns a list of possible senders for a specific chaincode identified by its unique_id
    /*
    POST format
    {
        // The unique_id for a chaincode
        "unique_id":"A2C4D6"
    }
    Response format
    {
        "error": "If error occurred" | null, 
        "result": [
        "Restaurant", "Customer", "Deliverer" ...
        ] 
    }
    */
    router.post("/api/v1/account/fetch",function(req,res){
        receive = {
          unique_id:req.body.unique_id,
        };
        console.log(receive);
        var response;
        if (!receive.unique_id) {
            response = {
                "errors":"unique_id must be supplied."
            };
            return res.json(response);
        }

        query = "SELECT * FROM bpmn where unique_id='"+receive.unique_id+"'";
        connection.query(query, function (err, result) {
            if (err) {
                response = {
                    "errors":err.toString(),
                    "result":null
                };
                return res.json(response);
            }

            if (result.length==0) {
                response = {
                    "errors":"Unique Id "+receive.unique_id+" is not found.",
                    "result":null
                };
                return res.json(response);
            }
            
            var file = "../../out/" + receive.unique_id + "/peers.txt";
            fs.readFile(file, 'utf-8', function(err, result){
                if (err){
                    response = {
                        "errors":err.toString(),
                        "result":null
                    };
                    return res.json(response);
                }
                var peers = result.split('\n').filter(Boolean);
                response = {
                    "errors":null,
                    "result":peers
                };
                return res.json(response);
            });
        });
    });

    //POST /api/v1/compile
    // req parameter is the request object
    // res parameter is the response object
    /*
    Post format
    {
        "contractCode": "pragma solidity ^0.4.18; contract ProcessFactory {...}",
        "unique_id": "A2B4C6"
    }
    Response format
    {
    "errors": ["Compilation errors or warnings"] | null
    // return bytecode to identify
    "contracts": {"bytecode":"unique_id"}
    */
    router.post("/api/v1/contract/compile",function(req,res){
        console.log("Deploying Smart Contract" );
        
        receive = {
          unique_id:req.body.unique_id,
          chaincode:req.body.contractCode
        };
        console.log(receive);
        var response;
        if (!receive.unique_id || !receive.chaincode) {
            response = {
                "errors":["unique_id and contractCode must be supplied."],
                "contracts":{"bytecode":null}
            };
            return res.json(response);
        }

        query = "SELECT * FROM bpmn where unique_id='"+receive.unique_id+"'";
        connection.query(query, function (err, result) {
            if (err) {
                response = {
                    "errors":[err.toString()],
                    "contracts":{"bytecode":null}
                };
                return res.json(response);
            }
            if (result.length==0) {
                response = {
                    "errors":["Unique Id "+receive.unique_id+" is not found."],
                    "contracts":{"bytecode":null}
                };
                return res.json(response);
            }
            // save in out/unique_id/chaincode/*.go
            filename = "../../out/" + receive.unique_id + "/chaincode/chaincode.go";            
            fs.writeFile(filename, receive.chaincode, function (err) {
                if (err) {
                    response = {
                        "errors":[err.toString()],
                        "contracts":{"bytecode":null}
                    };
                    return res.json(response);
                }
                var compile = importFresh("../Compiler/compiler.js");
                var compile_status;
                try {compile_status = compile(receive.unique_id);}
                catch (err) {
                    response = {
                        "errors":err.toString(),
                        "contracts":{"bytecode":null}
                    };
                    return res.json(response);
                }
                response = {
                    "errors":compile_status,
                    "contracts":{"bytecode":receive.unique_id}
                };
                return res.json(response);
            });
        });
    });



    //POST /api/v1/deploy
    // req parameter is the request object
    // res parameter is the response object
    /*
    Request format
    {
        // Unique Id to identify the generated/compiled chaincode. 
        "bytecode": "A2B4C6"
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
          unique_id:req.body.bytecode,
        };
        console.log(receive);
        var response;
        if (!receive.unique_id) {
            response = {
                "error":"bytecode (unique_id for chaincode) must be supplied.",
                "result":receive.unique_id
            };
            return res.json(response);
        }
 
        query = "SELECT * FROM bpmn where unique_id='"+receive.unique_id+"'";
        connection.query(query, function (err, result) {
            if (err) {
                response = {
                    "error":err.toString(),
                    "result":receive.unique_id
                };
                return res.json(response);
            }
            if (result.length==0) {
                response = {
                    "error":"Unique Id "+receive.unique_id+" is not found.",
                    "result":receive.unique_id
                };
                return res.json(response);
            }

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
            var deploy_results;
            try {deploy_results = deploy.deploy(receive.unique_id,status,ports);}
            catch (err) {
                console.log(err);
                response = {
                    "error": err.toString(),
                    "result":receive.unique_id
                };
                return res.json(response);
            }
            query = "UPDATE bpmn SET status=? WHERE unique_id=?";
            table = [deploy_results.result, receive.unique_id];
            query = mysql.format(query,table);
            connection.query(query, function (err, result) {
                if (err) {
                    console.log(err);
                    response = {
                        "error":err.toString(),
                        "result":receive.unique_id
                    };
                    return res.json(response);
                }
                console.log("Updating deployment status");
                response = {
                    "error":deploy_results.error,
                    "result":receive.unique_id
                };
                return res.json(response);
            });
        });
    });

    //POST /api/v1/bringdown
    // req parameter is the request object
    // res parameter is the response object
    /*
    Request format
    {
        // Unique Id to identify the deployment. 
        "bytecode": "A2B4C6"
    }
    Response format
    {
        "error": "If error occurred" | null,
    }
    */
    router.post("/api/v1/bringdown",function(req,res){
        console.log("Bringing down containers" );
        
        receive = {
          unique_id:req.body.bytecode
        };
        console.log(receive);
        var response;
        if (!receive.unique_id) {
            response = {
                "error":"bytecode (unique_id for chaincode) must be supplied."
            };
            return res.json(response);
        }
 
        query = "SELECT * FROM bpmn where unique_id='"+receive.unique_id+"'";
        connection.query(query, function (err, result) {
            if (err) {
                response = {
                    "error":err.toString()
                };
                return res.json(response);
            }
            if (result.length==0) {
                response = {
                    "error":"Unique Id "+receive.unique_id+" is not found."
                };
                return res.json(response);
            }

            var status = result[0].status;
            var deploy = importFresh("../Deployer/deployer.js");
            // parameters: unique_id and status
            console.log('status:'+status);
            var bringdown_results;
            try {bringdown_results = deploy.bringDown(receive.unique_id,status);}
            catch (err) {
                console.log(err);
                response = {
                    "error": err.toString()
                };
                return res.json(response);
            }
            query = "UPDATE bpmn SET status=? WHERE unique_id=?";
            table = [bringdown_results.result, receive.unique_id];
            query = mysql.format(query,table);
            connection.query(query, function (err, result) {
                if (err) {
                    console.log(err);
                    response = {
                        "error": err.toString()
                    };
                    return res.json(response);
                }
                console.log("Updating deployment status");
                response = {
                    "error": bringdown_results.error
                };
                return res.json(response);
            });
        });
    });

    //POST /api/v1/contract/function/call
    // req parameter is the request object
    // res parameter is the response object
    /*
    Request body: 
    {
        "contractAddress": "A2B4C6", 
        "fnName": "Confirm Order",
        // Smart contract function parameters.
        // Must specify in the same order as the 'inputs' array in the contract ABI. 
        "fnParams": [
        {
            "value": "<PARAM_VALUE>"
        } 
        ],
        "txParams": {
        // participant/peer for calling the function "from": "Restaurant"
        }
    }
    Response body:
    {
        "error": "If error occurred" | null, 
        "result": "<FUNCTION_LOCAL_CALL_RESULT>"
    }
    */
    router.post("/api/v1/contract/function/call",function(req,res){
        console.log("Local Call Smart Contract: function " + req.body.function_name);
        
        receive = {
          unique_id:req.body.contractAddress,
          function_name:req.body.fnName,
          parameters:req.body.fnParams,
          peer:req.body.txParams.from
        };

        console.log(receive);
        if (!receive.unique_id || !receive.function_name || !receive.peer) {
            response = {
                "error":"contractAddress, fnName, and txParams.from must be supplied.",
                "result":null
            };
            return res.json(response);
        }

        var parameters = [receive.function_name];
        for (var i = 0; i < receive.parameters.length; i++) {
            if (receive.parameters[i].value) {
                parameters.push(receive.parameters[i].value);
            }
        }
        console.log(parameters);
        var invoke = importFresh("../Invoker/invoker.js");
        var invoke_results;
        try {invoke_results = invoke(receive.unique_id, receive.peer, "_localCall", parameters);}
        catch (err) {
            response = {
                "error":err.toString(),
                "result":invoke_results
            };
            return res.json(response);
        }

        response = {
            "error":null,
            "result":invoke_results
        };
        return res.json(response);
    });

    //POST /api/v1/contract/function/sendTx
    // req parameter is the request object
    // res parameter is the response object
    /*
    Request body: 
    {
        "contractAddress": "A2B4C6", 
        "fnName": "Confirm Order",
        // Smart contract function parameters.
        // Must specify in the same order as the 'inputs' array in the contract ABI. 
        "fnParams": [
        {
            "value": "<PARAM_VALUE>"
        } 
        ],
        "txParams": {
        // participant/peer for calling the function "from": "Restaurant"
        }
    }
    Response body:
    {
        "error": "If error occurred" | null, 
        "result": "<FUNCTION_LOCAL_CALL_RESULT>"
    }
    */
    router.post("/api/v1/contract/function/sendTx",function(req,res){
        console.log("Invoking Smart Contract: function " + req.body.function_name);
        
        receive = {
          unique_id:req.body.contractAddress,
          function_name:req.body.fnName,
          parameters:req.body.fnParams,
          peer:req.body.txParams.from
        };

        console.log(receive);
        if (!receive.unique_id || !receive.function_name || !receive.peer) {
            response = {
                "error":"contractAddress, fnName, and txParams.from must be supplied.",
                "result":null
            };
            return res.json(response);
        }

        var parameters = [];
        for (var i = 0; i < receive.parameters.length; i++) {
            if (receive.parameters[i].value) {
                parameters.push(receive.parameters[i].value);
            }
        }
        console.log(parameters);
        var invoke = importFresh("../Invoker/invoker.js");
        var invoke_results;
        try {invoke_results = invoke(receive.unique_id, receive.peer, receive.function_name, parameters);}
        catch (err) {
            response = {
                "error":err.toString(),
                "result":invoke_results
            };
            return res.json(response);
        }
        response = {
            "error":null,
            "result":invoke_results
        };
        return res.json(response);
    });
};
// Makes this module available
module.exports = REST_ROUTER;