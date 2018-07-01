/******************************************************************************************************************
* File:deployer.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   1 July 2018 - Aditya Kamble - Initial structure
*
* Description: This is a script that invokes the function on the network. It receives the necessary arguments from the server and 
* executes the command. This action is logged in invoker_log.txt and the response is sent back to the server. 
*
* External Dependencies: 
* 1. files in ../../out directory
* 2. fabric-samples
* 3. ../Logger/logger
*
******************************************************************************************************************/

var shell = require('shelljs');

var logger = require('../Logger/logger');

var obj;

function invoke(unique_id,orgDomain,peer,actionName,parameters){

	logger.init(orgDomain);

	var paramString="";
	
	var res = true;

	if (!shell.which('docker')) {
		shell.echo('Sorry, this script requires docker');
		logger.log('deployer',"Tried deploying without installing docker ");
		shell.exit(1);
		return false;
	}

	if (!shell.which('docker-compose')) {
		shell.echo('Sorry, this script requires docker-compose');
		logger.log('deployer',"Tried deploying without installing docker-compose ");		
		shell.exit(1);
		return false;
	}

	for(var iter = 0; iter<parameters.length;iter++){
		paramString += ', \"'+parameters[iter] + '\"';
	}


	obj = shell.exec("docker exec -t " + peer + "_" + unique_id + "_cli invoke -o orderer." + orgDomain + ":7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain + "/orderers/orderer."+ orgDomain + "/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem -C " + channelName + " -n mycc -c '{\"Args\":[\"" + actionName + "\"" + paramString + "]}");
	if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Invoking function " + actionName + " with parameters " + paramString + " failed")
        logger.log("Invoking function " + actionName + " with parameters " + paramString + " failed");
    }
    logger.log('deployer',"Successfully invoked function " + actionName + " with parameters " + paramString);
    return true;
}


invoke("demo0625","demo0625.com","confirmOrder",{"ORDER4","Coke","Adi"});
