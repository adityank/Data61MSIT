

var mysql   = require("mysql");     //Database

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

    router.get("/index",function(req,res){
        res.sendFile( __dirname + "/public/index.html" );
    });

    
    // GET for /pending specifier - returns all pending orders currently stored in the database
    // req paramdter is the request object
    // res parameter is the response object
    /*
    Request format
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
    router.post("/v1/translate",function(req,res){
        console.log("Translating the BPMN file" );
    });
}

// The next line just makes this module available
module.exports = REST_ROUTER;