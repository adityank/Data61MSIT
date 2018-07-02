/* 
  This provides restful api for server
  @by700git
*/

// require database
var mysql   = require("mysql");
var fs = require("fs");
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
        res.sendFile( __dirname + "/public/index.html" );
    });

    
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
          processName:req.body.processName,
          orgDomain:req.body.orgDomain
        };
        console.log(receive);
        filename = "tmp/" + receive.processName + ".bpmn";

        fs.writeFile(filename, receive.xmlModel, function (err) {
            if (err) {
                console.log(err);
            }
            parse(filename,receive.orgDomain);
        });

        response = {
            message:"Success"
        }

        // send response
        res.end(JSON.stringify(response));
    });
}

// Makes this module available
module.exports = REST_ROUTER;