/******************************************************************************************************************
* File:deployer.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   28 June 2018 - Aditya Kamble - Created a new file with
*
* Description: This is script that will deploy the network defined by the generated files in ../../out folder by the generators(translator) 
*
* External Dependencies: 
* 1. files in ../../out directory
* 2. fabric-samples
*
******************************************************************************************************************/

var shell = require('shelljs');

var logger = require('../Logger/logger')

var deploy_writer;

function createJoinChannel(peer,networkName,orgDomain,first){

	channelName = networkName + "channel";

	if(first)
		shell.exec("docker exec" + peer + "_cli bash /bin/sh -c 'peer channel create -o orderer." + orgDomain + ":7050 -c " + channelName + " -f ./channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain +"/orderers/orderer." + orgDomain +"/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem'");
	else
		shell.exec("docker exec" + peer + "_cli bash /bin/sh -c 'peer channel fetch newest ./" + networkName + "channel.block -o orderer." + orgDomain + ":7050 -c " + channelName + " --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain + "/orderers/orderer." + orgDomain + "/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem'");

	shell.exec("docker exec" + peer + "_cli bash /bin/sh -c 'peer channel join -b "+ networkName + "channel.block'");

}

function setupNetwork(networkName,orgDomain,peers){
	
	shell.mkdir ('channel-artifacts');

	shell.cp( fabricSamplesPath + "first-network/.env", "./.env");

	shell.exec(fabricSamplesPath + "bin/cryptogen  generate --config=./crypto-config.yaml");
	logger.log(deploy_writer,"==================\n Artifacts generated \n ==========================\n");

	shell.exec("export FABRIC_CFG_PATH=$PWD");

	shell.exec(fabricSamplesPath + "bin/configtxgen -profile " + networkName + "Genesis -outputBlock ./channel-artifacts/genesis.block");

	logger.log(deploy_writer,"==================\n Genesis block created!!\n ==========================\n");

	shell.exec("export CHANNEL_NAME=" + networkName + "channel  && " + fabricSamplesPath + "bin/configtxgen -profile " + networkName + "Channel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME");

	logger.log(deploy_writer,"==================\n \n ==========================\n");

	for (var peer in peers){
		shell.exec(fabricSamplesPath + "bin/configtxgen -profile " + networkName + "channel -outputAnchorPeersUpdate ./channel-artifacts/" + peer +  "MSPanchors.tx -channelID $CHANNEL_NAME -asOrg " + peer + "MSP");
	}

	shell.exec("docker-compose -f docker-compose-cli.yaml up");

}



function deploy(networkName,orgDomain,peers){

	outPath = "../../out/" + orgDomain + "/" + networkName + "/";
	fabricSamplesPath = "../../../../../fabric-samples/";

	deploy_writer = logger.getWriter('deployer',orgDomain,networkName);

	if (!shell.which('docker')) {
		shell.echo('Sorry, this script requires docker');
		logger.log(deploy_writer,"Tried deploying without installing docker\n");
		shell.exit(1);
	}

	if (!shell.which('docker-compose')) {
		shell.echo('Sorry, this script requires docker-compose');
		logger.log(deploy_writer,"Tried deploying without installing docker-compose\n");		
		shell.exit(1);
	}

	shell.cd(outPath);

	// Setup the infrastructure and bring up the network


	logger.log(deploy_writer,"==================\n Starting to setup infra \n ==========================");

	setupNetwork(networkName,orgDomain,peers);

	endorsers = "";
	
	var first = true;

	for(var peer in peers){

		createJoinChannel(peer,networkName,orgDomain,first);
		logger.log(deploy_writer,"==================\n Channel for " + peer + " created and joined\n ==========================\n");

		if(first == true){
			first = false;
		}
		else{
			endorsers += ",";
		}
		endorsers += "'" + peer + "MSP.peer'";

	}

	for(var peer in peers){

		shell.exec("docker exec" + peer + "_cli bash /bin/sh -c 'peer chaincode install -n mycc -v 1.0 -p github.com/chaincode/" + networkName + "'");
		logger.log(deploy_writer,"==================\n " + peer + " installed chaincode\n ==========================\n");
		
	}

	shell.exec("docker exec" + peers[0] + "_cli bash /bin/sh -c 'peer chaincode instantiate -o orderer." + orgDomain + ":7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain + "/orderers/orderer." + orgDomain + "/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem -C " + channelName + " -n mycc -v 1.0 -c '{\"Args\":[\"init\"]}' -P \"OR (" + endorsers + ")\"'");
	logger.log(deploy_writer,"==================\n Chaincode instantiated!\n ==========================\n");

}


deploy("pizza","demo0625.com",['restaurant','customer','deliverer']);