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

var mainShell = require('shelljs');

function setupPeer(shell,peer,networkName,orgDomain,first){
	shell.exec("docker exec -it " +	peer + "_cli bash");

	shell.exec("export CHANNEL_NAME = " + networkName + "channel");
	if(first)
		shell.exec("peer channel create -o orderer." + orgDomain + ":7050 -c $CHANNEL_NAME -f ./channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain +"/orderers/orderer." + orgDomain +"/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem");
	else
		shell.exec("peer channel fetch newest ./" + networkName + "channel.block -o orderer." + orgDomain + ":7050 -c $CHANNEL_NAME --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain + "/orderers/orderer." + orgDomain + "/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem");

	shell.exec("peer channel join -b "+ networkName + "channel.block");

}

function setupNetwork(mainShell,networkName,orgDomain,peers){

	console.log(mainShell.ls());
	
	/*mainShell.mkdir ('channel-artifacts');

	mainShell.cp( fabricSamplesPath + "first-network/.env", "./.env");

	mainShell.exec(fabricSamplesPath + "bin/cryptogen  generate --config=./crypto-config.yaml");

	mainShell.exec("export FABRIC_CFG_PATH=$PWD");

	mainShell.exec(fabricSamplesPath + "bin/configtxgen -profile " + networkName + "Genesis -outputBlock ./channel-artifacts/genesis.block");

	mainShell.exec("export CHANNEL_NAME=" + networkName + "channel  && " + fabricSamplesPath + "bin/configtxgen -profile " + networkName + "Channel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME");

	for (var peer in peers){
		mainShell.exec(fabricSamplesPath + "bin/configtxgen -profile " + networkName + "channel -outputAnchorPeersUpdate ./channel-artifacts/" + peer +  "MSPanchors.tx -channelID $CHANNEL_NAME -asOrg " + peer + "MSP");
	}

	mainShell.exec("docker-compose -f docker-compose-cli.yaml up");*/

}



function deploy(networkName,orgDomain,peers){

	outPath = "../../out/" + orgDomain + "/" + networkName + "/";
	fabricSamplesPath = "../../../../fabric-samples/";

	mainShell.echo('hello world');

	if (!mainShell.which('docker')) {
		mainShell.echo('Sorry, this script requires docker');
		mainShell.exit(1);
	}

	if (!mainShell.which('docker-compose')) {
		mainShell.echo('Sorry, this script requires docker-compose');
		mainShell.exit(1);
	}

	mainShell.cd(outPath);

	setupNetwork(mainShell,networkName,orgDomain,peers);

	shell1 = require('shelljs');

	console.log(shell1.ls());

	/*for(var peer in peers){

		setupPeers();

	}*/
}


deploy("pizza","demo0625.com",['restaurant','customer','deliverer']);