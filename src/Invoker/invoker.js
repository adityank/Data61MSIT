/******************************************************************************************************************
* File:deployer.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   1 July 2018 - Aditya Kamble - Initial structure
*   31 July 2018 - Dongliang Zhou - Added comments
*
* Description: This is a script that invokes the function on the network. It receives the necessary arguments from the server and 
* executes the command. This action is logged in invoker_log.txt and the response is sent back to the server. 
*
* External Dependencies: 
* 1. files in ../../out directory
* 2. fabric-samples
* 3. shelljs and strip-ansi package
*
******************************************************************************************************************/

var shell = require('shelljs');
var logger = require('../Logger/logger');
const stripAnsi = require('strip-ansi');

var obj; // object for shell exec


// This function invokes/queries the deployed chaincode as the specified peer
// Returns any error message or null
function invoke(unique_id,peer,actionName,parameters){

	logger.init(unique_id);
	var orgDomain = unique_id + '.com';
	var channelName = 'mychannel';

	var paramString="";
	var use_silent = true; // silent -> no info echo on server terminal

	if (!shell.which('docker')) {
		shell.echo('Sorry, this script requires docker');
		logger.log('deployer',"Tried deploying without installing docker ");
		shell.exit(1);
		return "ERROR: docker not installed on server";
	}

	if (!shell.which('docker-compose')) {
		shell.echo('Sorry, this script requires docker-compose');
		logger.log('deployer',"Tried deploying without installing docker-compose ");		
		shell.exit(1);
		return "ERROR: docker-compose not installed on server";
	}

    // Transform list of params to a string
	for(var iter = 0; iter<parameters.length;iter++){
		paramString += ', \"'+parameters[iter] + '\"';
	}

    // Query is read-only, so does not need to provide TLS certs
	if (actionName=='queryEvent' || actionName=='queryAllEvents') {
		obj = shell.exec("docker exec -t " + peer + "_" + unique_id + "_cli peer chaincode query -C " + channelName + " -n mycc -c '{\"Args\":[\"" + actionName + "\"" + paramString + "]}'", {silent:use_silent});
	} else { // Normal invoke needs to provide TLS certs
		obj = shell.exec("docker exec -t " + peer + "_" + unique_id + "_cli peer chaincode invoke -o orderer." + orgDomain + ":7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain + "/orderers/orderer."+ orgDomain + "/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem -C " + channelName + " -n mycc -c '{\"Args\":[\"" + actionName + "\"" + paramString + "]}'", {silent:use_silent});
	}

    // Process chaincode output that contains Ansi color coding
	var output = stripAnsi(obj.stdout);
	if(obj.code !== 0) {
        // node couldn't execute the command
        //console.log("Invoking function " + actionName + " with parameters " + paramString + " failed")
        logger.log('invoker',"Invoking function " + actionName + " with parameters " + paramString + " failed");
        logger.log('invoker',output);
        logger.log('invoker',obj.stderr);
        // Chaincode error will be contained in stdout not stderr
        // Server level error will be in stderr
        if (output != '') {
            return output;
        }
        return obj.stderr;
    }
    logger.log('invoker',"Successfully invoked function " + actionName + " with parameters " + paramString);
    logger.log('invoker',output);
    return output;
}

module.exports = invoke;
//invoke("test0701v1","Restaurant","initLedger",[]);
