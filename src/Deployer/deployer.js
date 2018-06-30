/******************************************************************************************************************
* File:deployer.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   28 June 2018 - Aditya Kamble - Created a new file with all commands
* 	29 june 2018 - Aditya Kamble - Added logging and repaired the relative folder structure
* 	29 june 2018 - Aditya Kamble - exec made synchronous
*
* Description: This is script that will deploy the network defined by the generated files in ../../out folder by the generators(translator) 
*
* External Dependencies: 
* 1. files in ../../out directory
* 2. fabric-samples
*
******************************************************************************************************************/

var shell = require('shelljs');

var logger = require('../Logger/logger');

var obj;

function createJoinChannel(peer,networkName,orgDomain,first){

	channelName = networkName + "channel";

	if(first == true){

		obj = shell.exec("docker exec" + peer + "_cli bash /bin/sh -c 'peer channel create -o orderer." + orgDomain + ":7050 -c " + channelName + " -f ./channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain +"/orderers/orderer." + orgDomain +"/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem'");
		if(obj.code !== 0) {
	        console.log('Channel creation failed!')
	        logger.log('deployer','Channel creation failed!');
			return false;			
		}
	    logger.log('deployer','=================Channel created successfully!================');
	}
	else{
		obj = shell.exec("docker exec" + peer + "_cli bash /bin/sh -c 'peer channel fetch newest ./" + networkName + "channel.block -o orderer." + orgDomain + ":7050 -c " + channelName + " --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain + "/orderers/orderer." + orgDomain + "/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem'");
		if(obj.code !== 0) {
	        // node couldn't execute the command
	        console.log("Channel fetching failed for " + peer + "!")
	        logger.log('deployer',"Channel fetching failed for " + peer + "!");
        	return false;
	    }
	    logger.log('deployer', '================' + peer + ' fetched channel successfully!=================');
	}

	obj = shell.exec("docker exec" + peer + "_cli bash /bin/sh -c 'peer channel join -b "+ networkName + "channel.block'");
	if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Channel joining failed for " + peer + "!")
        logger.log('deployer',"Channel joining failed for " + peer + "!");
        return false;
	}
    logger.log('deployer', '===============' + peer + ' joined channel successfully!===============');
	return true;
}

function setupNetwork(networkName,orgDomain,peers){
	console.log("In setup network");
	shell.mkdir ('channel-artifacts');

	shell.cp( fabricSamplesPath + "first-network/.env", "./.env");

	obj = shell.exec(fabricSamplesPath + "bin/cryptogen  generate --config=./crypto-config.yaml");
	if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Artifacts generation failed!")
        logger.log('deployer',"Artifacts generation failed!");
        return false;
    }

    logger.log('deployer', '=============Artifacts generated successfully!============');

	shell.exec("export FABRIC_CFG_PATH=$PWD");

	obj = shell.exec(fabricSamplesPath + "bin/configtxgen -profile " + networkName + "Genesis -outputBlock ./channel-artifacts/genesis.block");
	if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Genesis generation failed!")
        logger.log('deployer',"Genesis generation failed!");
        return false;
    }

    logger.log('deployer', "==================  Genesis block created!!  ========================== ");

	obj = shell.exec("export CHANNEL_NAME=" + networkName + "channel  && " + fabricSamplesPath + "bin/configtxgen -profile " + networkName + "Channel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME");
	if(obj.code !== 0) {
        // node couldn't execute the command
        /*
        console.log("++++++++++++++++++++++++++++++++++++++++++++++")
        
        console.log(obj.stderr);

        console.log("****************************************")
        
        console.log(obj.stdout);*/
        
        console.log("Channel.tx generation failed!")
        logger.log('deployer',"Channel.tx generation failed!");
        return false;
    }

    logger.log('deployer', "==================  Channel.tx generated!!  ========================== ");

	for(var iter=0; iter<peers.length; iter++){
		obj = shell.exec(fabricSamplesPath + "bin/configtxgen -profile " + networkName + "channel -outputAnchorPeersUpdate ./channel-artifacts/" + peers[iter] +  "MSPanchors.tx -channelID $CHANNEL_NAME -asOrg " + peers[iter] + "MSP");
		if(obj.code !== 0) {
	    	// node couldn't execute the command
	        console.log(peers[iter] + " generation failed!")
	        logger.log('deployer',peers[iter] + " generation failed!");
	        return false;
	    }
	    logger.log('deployer', "==================  " + peers[iter] + " created!!  ======================= ");
	}
	return true;
}


function deploy(networkName,orgDomain,peers,status){

	outPath = "../../out/" + orgDomain + "/" + networkName + "/";
	fabricSamplesPath = "../../../../../fabric-samples/";

	logger.init(orgDomain,networkName);
	
	shell.cd(outPath);
	var res = true;
	logger.log('deployer',"........----------------Starting to log deployment-----------------.............");	

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

	// Setup the infrastructure and bring up the network

	if(status == "new"){		
		logger.log('deployer',"==================  Starting to setup infra   ==========================");
		res = setupNetwork(networkName,orgDomain,peers);
		//shell.exec('node deployNetwork.js', { async: true }, { async: true });
		if(res == false)
			return false;
	}

	//shell.exec('node deployPeer.js', { async: true }, { async: true });


	obj = shell.exec("docker-compose -f docker-compose-cli.yaml up")
	if(obj.code !== 0) {
	        // node couldn't execute the command
	        console.log("Bringing up network failed!")
	        logger.log('deployer',"Bringing up network failed!");
	        return false;
	    }
    logger.log('deployer', "==================  Network up and running!!  ========================== ");

	endorsers = "";
	
	var first = true;
	
	for(var iter=0; iter<peers.length; iter++){

		res = createJoinChannel(peers[iter],networkName,orgDomain,first);
		if(res == false)
			return false;
		logger.log('deployer',"==================  Channel for " + peers[iter] + " created and joined  ========================== ");

		if(first == true){
			first = false;
		}
		else{
			endorsers += ",";
		}
		endorsers += "'" + peers[iter] + "MSP.peer'";

	}

	for(var iter=0; iter<peers.length; iter++){

		obj = shell.exec("docker exec" + peers[iter] + "_cli bash /bin/sh -c 'peer chaincode install -n mycc -v 1.0 -p github.com/chaincode/" + networkName + "'");
		if(obj.code !== 0) {
	        // node couldn't execute the command
	        console.log("Installing chaincode failed on " + peers[iter])
	        logger.log("Installing chaincode failed on " + peers[iter]);
	        return false;
	    }
	    logger.log('deployer', "==================" + peers[iter] + " installed chaincode  ========================== ");
	    return true;
	}

	obj = shell.exec("docker exec" + peers[0] + "_cli bash /bin/sh -c 'peer chaincode instantiate -o orderer." + orgDomain + ":7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain + "/orderers/orderer." + orgDomain + "/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem -C " + channelName + " -n mycc -v 1.0 -c '{\"Args\":[\"init\"]}' -P \"OR (" + endorsers + ")\"'");
	if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Instantiating chaincode failed")
        logger.log("Instantiating chaincode failed");
        return false;
    }
    logger.log('deployer',"==================  Chaincode instantiated!  ========================== ");
    return true;
}


deploy("pizza","demo0625.com",['restaurant','customer','deliverer'],"new");

//up
//down