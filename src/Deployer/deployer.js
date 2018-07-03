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

var channelName;
var channelProfile;

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
  return true;
}

function createJoinChannel(peer,unique_id,first){
    var orgDomain = unique_id + '.com';

	if(first == true){

		obj = shell.exec("docker exec -t " + peer + "_" + unique_id + "_cli peer channel create -o orderer." + orgDomain + ":7050 -c " + channelName + " -f ./channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain +"/orderers/orderer." + orgDomain +"/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem");
		if(obj.code !== 0) {
	        console.log('Channel creation failed!');
	        logger.log('deployer','Channel creation failed!');
            logger.log('deployer',obj.stderr);
			return false;			
		}
	    logger.log('deployer','=================Channel created successfully!================');
	}
	else{
		obj = shell.exec("docker exec -t " + peer + "_" + unique_id + "_cli peer channel fetch newest ./" + channelName + ".block -o orderer." + orgDomain + ":7050 -c " + channelName + " --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain + "/orderers/orderer." + orgDomain + "/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem");
		if(obj.code !== 0) {
	        // node couldn't execute the command
	        console.log("Channel fetching failed for " + peer + "!");
	        logger.log('deployer',"Channel fetching failed for " + peer + "!");
            logger.log('deployer',obj.stderr);
        	return false;
	    }
	    logger.log('deployer', '================' + peer + ' fetched channel successfully!=================');
	}

	obj = shell.exec("docker exec -t " + peer + "_" + unique_id + "_cli peer channel join -b "+ channelName + ".block");
	if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Channel joining failed for " + peer + "!");
        logger.log('deployer',"Channel joining failed for " + peer + "!");
        logger.log('deployer',obj.stderr);
        return false;
	}
    logger.log('deployer', '===============' + peer + ' joined channel successfully!===============');
	return true;
}


function cryptogen(unique_id) {
	console.log("Start generating organization certificates...");
	obj = shell.exec(fabricSamplesPath + "bin/cryptogen generate --config=./crypto-config.yaml");
	if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Artifacts generation failed!");
        logger.log('deployer',"Artifacts generation failed!");
        logger.log('deployer',obj.stderr);
        return false;
    }
    logger.log('deployer', 'Crytogen Succeeded!! ');
    return true;
}

function channel_artifacts_gen(unique_id,peers){
	shell.mkdir ('channel-artifacts');

	//shell.cp( fabricSamplesPath + ".env", "./.env");

	obj = shell.exec("export FABRIC_CFG_PATH=$PWD && "+fabricSamplesPath + "bin/configtxgen -profile " + unique_id + "Genesis -outputBlock ./channel-artifacts/genesis.block");
	if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Genesis generation failed!")
        logger.log('deployer',"Genesis generation failed!");
        logger.log('deployer',obj.stderr);
        return false;
    }

    logger.log('deployer', "Genesis block created!! ");

	obj = shell.exec(fabricSamplesPath + "bin/configtxgen -profile " + channelProfile + " -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID " + channelName);
	if(obj.code !== 0) {
        console.log("Channel.tx generation failed!")
        logger.log('deployer',"Channel.tx generation failed!");
        logger.log('deployer',obj.stderr);
        return false;
    }
    logger.log('deployer', "Channel.tx generated!! ");

	for(var iter=0; iter<peers.length; iter++){
		var command = fabricSamplesPath + "bin/configtxgen -profile " + channelProfile + " -outputAnchorPeersUpdate ./channel-artifacts/" + peers[iter] +  "MSPanchors.tx -channelID " + channelName + " -asOrg " + peers[iter] + "MSP";
		obj = shell.exec(command);
		if(obj.code !== 0) {
	    	// node couldn't execute the command
	        console.log(peers[iter] + " generation failed!")
	        logger.log('deployer',command);
	        logger.log('deployer',peers[iter] + " generation failed!");
            logger.log('deployer',obj.stderr);
	        return false;
	    }
	    logger.log('deployer', peers[iter] + "MSPanchors.tx created!! ");
	}
	return true;
}


function deploy(unique_id,peers,stage,ports){

	channelProfile = unique_id + "Channel";
	channelName = "mychannel";
	deploymentPath = "../../out/" + unique_id + "/";
	fabricSamplesPath = "/Users/DLZHOU/Documents/Github/Unchained/";

	logger.init(unique_id);
	
	shell.cd(deploymentPath);
	var res = true;
	logger.log('deployer',"........----------------Starting to log deployment-----------------.............");	
	logger.log('deployer', "******* Start Stage: " + stage.toString() + " ************")

	if (!shell.which('docker')) {
		shell.echo('Sorry, this script requires docker');
		logger.log('deployer',"Tried deploying without installing docker ");
		shell.exit(1);
		return stage;
	}

	if (!shell.which('docker-compose')) {
		shell.echo('Sorry, this script requires docker-compose');
		logger.log('deployer',"Tried deploying without installing docker-compose ");		
		shell.exit(1);
		return stage;
	}

	// Setup the infrastructure and bring up the network
	if(stage == 0){		
		logger.log('deployer',"==================  Stage 0: Crytogen  ==========================");
		res = cryptogen(unique_id);
		//shell.exec('node deployNetwork.js', { async: true }, { async: true });
		if(res == false)
			return stage;
		logger.log('deployer', "==================  Crytogen Succeeded!!  ========================== ");
		stage = 1;
	}

	if(stage == 1){		
		logger.log('deployer',"==================  Stage 1: Channel Artifacts Gen  ==========================");
		res = channel_artifacts_gen(unique_id,peers);
		//shell.exec('node deployNetwork.js', { async: true }, { async: true });
		if(res == false)
			return stage;
		logger.log('deployer', "==================  Channel Artifacts Generated!!  ========================== ");
		stage = 2;
	}

	if(stage == 2){		
		logger.log('deployer',"==================  Stage 2: Bring Up Network  ==========================");
		shell.exec("docker-compose -f docker-compose-cli.yaml up", {silent: true, async:true})
		
		var wait = sleep(10000);

		logger.log('deployer', wait);

	    logger.log('deployer', "==================  Network up and running!!  ========================== ");
		stage = 3;
	}

	//shell.exec('node deployPeer.js', { async: true }, { async: true });

    if(stage == 3){
    	logger.log('deployer',"==================  Stage 3: Create & Join Channel  ==========================");
		endorsers = "";
		var first = true;
		for(var iter=0; iter<peers.length; iter++){
			res = createJoinChannel(peers[iter],unique_id,first);
			if(res == false)
				return stage;
			logger.log('deployer',"Channel for " + peers[iter] + " created and joined ");
			if(first == true){
				first = false;
			}
			else{
				endorsers += ",";
			}
			endorsers += "'" + peers[iter] + "MSP.peer'";
		}
	    logger.log('deployer', "==================  Channel is running!!  ========================== ");
		stage = 4;
    }

	if(stage == 4) {
		logger.log('deployer',"==================  Stage 4: Install Chaincode  ==========================");
		for(var iter=0; iter<peers.length; iter++){
			obj = shell.exec("docker exec -t " + peers[iter] + "_" + unique_id + "_cli peer chaincode install -n mycc -v 1.0 -p github.com/chaincode/");
			if(obj.code !== 0) {
		        // node couldn't execute the command
		        console.log("Installing chaincode failed on " + peers[iter])
		        logger.log("Installing chaincode failed on " + peers[iter]);
	            logger.log('deployer',obj.stderr);
		        return stage;
		    }
		    logger.log('deployer', peers[iter] + " installed chaincode ");
		}
	    logger.log('deployer', "==================  Channel is running!!  ========================== ");
		stage = 5;
	}

	if(stage == 5) {
		logger.log('deployer',"==================  Stage 5: Instantiate Chaincode  ==========================");
		obj = shell.exec("docker exec -t " + peers[0] + "_" + unique_id + "_cli peer chaincode instantiate -o orderer." + unique_id + ".com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + unique_id + ".com/orderers/orderer." + unique_id + ".com/msp/tlscacerts/tlsca." + unique_id + ".com-cert.pem -C " + channelName + " -n mycc -v 1.0 -c '{\"Args\":[\"init\"]}' -P \"OR (" + endorsers + ")\"");
		if(obj.code !== 0) {
	        // node couldn't execute the command
	        console.log("Instantiating chaincode failed")
	        logger.log("Instantiating chaincode failed");
	        logger.log('deployer',obj.stderr);
	        return stage;
	    }
	    logger.log('deployer',"==================  Chaincode instantiated!  ========================== ");
		stage = 6;
	}
	return stage;
}

// peer names need to be lower case
stage = deploy('test0702v1',['Restaurant','Customer','Deliverer'],2);
logger.log('deployer', "******* Final Stage Reached: " + stage.toString() + " ************")
console.log('======================v1done========================')
stage = deploy('test0702v2',['Restaurant','Customer','Deliverer'],2);
logger.log('deployer', "******* Final Stage Reached: " + stage.toString() + " ************")
console.log('======================v2done========================')
//up
//down