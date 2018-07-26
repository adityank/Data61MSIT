/******************************************************************************************************************
* File:deployer.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   28 June 2018 - Aditya Kamble - Created a new file with all commands
*   29 june 2018 - Aditya Kamble - Added logging and repaired the relative folder structure
*   29 june 2018 - Aditya Kamble - exec made synchronous
*
* Description: This is script that will deploy the network defined by the generated files in ../../out folder by the generators(translator) 
*
* External Dependencies: 
* 1. files in ../../out directory
* 2. fabric-samples
*
******************************************************************************************************************/

var shell = require('shelljs');
// module for file-system
var fs = require('fs');

var logger = require('../Logger/logger');

var obj;

var channelName;
var channelProfile;


function createJoinChannel(peer,unique_id,first){
    var orgDomain = unique_id + '.com';

    if(first == true){

        obj = shell.exec("docker exec -t " + peer + "_" + unique_id + "_cli peer channel create -o orderer." + orgDomain + ":7050 -c " + channelName + " -f ./channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/" + orgDomain +"/orderers/orderer." + orgDomain +"/msp/tlscacerts/tlsca." + orgDomain + "-cert.pem");
        if(obj.code !== 0) {
            console.log('Channel creation failed!');
            logger.log('deployer','Channel creation failed!');
            logger.log('deployer',obj.stderr);
            return obj.stderr;          
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
            return obj.stderr;
        }
        logger.log('deployer', '================' + peer + ' fetched channel successfully!=================');
    }

    obj = shell.exec("docker exec -t " + peer + "_" + unique_id + "_cli peer channel join -b "+ channelName + ".block");
    if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Channel joining failed for " + peer + "!");
        logger.log('deployer',"Channel joining failed for " + peer + "!");
        logger.log('deployer',obj.stderr);
        return obj.stderr;
    }
    logger.log('deployer', '===============' + peer + ' joined channel successfully!===============');
    return "Success";
}


function cryptogen(unique_id) {
    console.log("Start generating organization certificates...");
    obj = shell.exec(fabricSamplesPath + "bin/cryptogen generate --config=./crypto-config.yaml");
    if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Artifacts generation failed!");
        logger.log('deployer',"Artifacts generation failed!");
        logger.log('deployer',obj.stderr);
        return obj.stderr;
    }
    logger.log('deployer', 'Crytogen Succeeded!! ');
    return "Success";
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
        return obj.stderr;
    }

    logger.log('deployer', "Genesis block created!! ");

    obj = shell.exec(fabricSamplesPath + "bin/configtxgen -profile " + channelProfile + " -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID " + channelName);
    if(obj.code !== 0) {
        console.log("Channel.tx generation failed!")
        logger.log('deployer',"Channel.tx generation failed!");
        logger.log('deployer',obj.stderr);
        return obj.stderr;
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
            return obj.stderr;
        }
        logger.log('deployer', peers[iter] + "MSPanchors.tx created!! ");
    }
    return "Success";
}


function createEnv(unique_id,ports){
    
    file = "../../out/" + unique_id + "/.env";

    fs.writeFileSync(file, "COMPOSE_PROJECT_NAME=net\nIMAGE_TAG=latest\n", function (err) {
    if (err)
        return err;
    });
    for(var iter=0;iter<ports.length;iter++){
        fs.appendFileSync(file, "port" + iter.toString() + "=" + ports[iter] + "\n", function (err) {
        if (err) 
            return err;
        });
    }
    return "Success";
}

function getPeers(unique_id){
    file = "../../out/" + unique_id + "/peers.txt";
    peers = fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
    return peers;
}

function deploy(unique_id,stage,ports){

    channelProfile = unique_id + "Channel";
    channelName = "mychannel";
    deploymentPath = "../../out/" + unique_id + "/";
    fabricSamplesPath = "~/fabric-samples/";

    var res;
    logger.init(unique_id);
    logger.log('deployer',"........----------------Starting to log deployment-----------------.............");  
    logger.log('deployer', "******* Start Stage: " + stage.toString() + " ************")
        
    res = createEnv(unique_id,ports);
    if (res!="Success") {
        return {result: stage, message: res};
    }
    logger.log('deployer', "******* Created .env file with " + ports.length + " ports ************")
    
    var peers = getPeers(unique_id);
    console.log(peers.length);

    shell.cd(deploymentPath);   

    if (!shell.which('docker')) {
        shell.echo('Sorry, this script requires docker');
        logger.log('deployer',"Tried deploying without installing docker ");
        shell.exit(1);
        return {result: stage, message: "ERROR: docker not installed on server"};
    }

    if (!shell.which('docker-compose')) {
        shell.echo('Sorry, this script requires docker-compose');
        logger.log('deployer',"Tried deploying without installing docker-compose ");        
        shell.exit(1);
        return {result: stage, message: "ERROR: docker-compose not installed on server"};
    }

    // Setup the infrastructure and bring up the network
    if(stage == 0){     

        logger.log('deployer',"==================  Stage 0: Crytogen  ==========================");
        res = cryptogen(unique_id);
        //shell.exec('node deployNetwork.js', { async: true }, { async: true });
        if(res != "Success")
            return {result: stage, message: res};
        logger.log('deployer', "==================  Crytogen Succeeded!!  ========================== ");
        stage = 1;
    }

    if(stage == 1){     
        logger.log('deployer',"==================  Stage 1: Channel Artifacts Gen  ==========================");
        res = channel_artifacts_gen(unique_id,peers);
        //shell.exec('node deployNetwork.js', { async: true }, { async: true });
        if(res != "Success")
            return {result: stage, message: res};
        logger.log('deployer', "==================  Channel Artifacts Generated!!  ========================== ");
        stage = 2;
    }

    if(stage == 2){     
        logger.log('deployer',"==================  Stage 2: Bring Up Network  ==========================");
        shell.exec("docker-compose -f docker-compose-cli.yaml up", {silent: true, async:true})
        
        logger.log('deployer', 'before wait');
        var start = new Date().getTime();
        while ((new Date().getTime() - start) < 10000){
            // wait for network to run
            stage = 2;
        }

        logger.log('deployer', 'after wait');

        logger.log('deployer', "==================  Network up and running!!  ========================== ");
        stage = 3;
    }


    if(stage == 3){
        logger.log('deployer',"==================  Stage 3: Create & Join Channel  ==========================");
        var endorsers = "";
        var first = true;
        for(var iter=0; iter<peers.length; iter++){
            res = createJoinChannel(peers[iter],unique_id,first);
            if(res != "Success")
                return {result: stage, message: res};
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
                return {result: stage, message: obj.stderr};
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
            return {result: stage, message: obj.stderr};
        }
        logger.log('deployer',"==================  Chaincode instantiated!  ========================== ");
        stage = 6;
    }

    if(stage == 7) {
        logger.log('deployer',"==================  Stage 7: Restart stopped containers  ==========================");
        shell.exec("docker-compose -f docker-compose-cli.yaml up", {silent: true, async:true})
        logger.log('deployer',"==================  Containers restarted!  ========================== ");
        stage = 6;
    }
    logger.log('deployer', "******* Final Stage Reached: " + stage.toString() + " ************")
    return {result: stage, message: "Success"};
}


function bringDown(unique_id,stage) {
    deploymentPath = "../../out/" + unique_id + "/";

    var res;
    logger.init(unique_id);
    logger.log('deployer',"........----------------Starting to log deployment-----------------.............");  
    logger.log('deployer', "******* Start Stage: " + stage.toString() + " ************")

    if(stage!=6) {
        return {result: stage, message: "Requested deployment is not running."};
    }

    shell.cd(deploymentPath);   

    if (!shell.which('docker')) {
        shell.echo('Sorry, this script requires docker');
        logger.log('deployer',"Tried deploying without installing docker ");
        shell.exit(1);
        return {result: stage, message: "ERROR: docker not installed on server"};
    }

    if (!shell.which('docker-compose')) {
        shell.echo('Sorry, this script requires docker-compose');
        logger.log('deployer',"Tried deploying without installing docker-compose ");        
        shell.exit(1);
        return {result: stage, message: "ERROR: docker-compose not installed on server"};
    }

    logger.log('deployer',"==================  Stage 6: Stop containers  ==========================");
    obj = shell.exec("docker-compose -f docker-compose-cli.yaml down", {silent: true})
    if(obj.code !== 0) {
        // node couldn't execute the command
        console.log("Stop containers failed")
        logger.log("Stop containers failed");
        logger.log('deployer',obj.stderr);
        return {result: stage, message: obj.stderr};
    }
    logger.log('deployer',"==================  Containers stopped!  ========================== ");
    stage = 7;
    return {result: stage, message: "Success"};
}

module.exports = {
    deploy: deploy,
    bringDown: bringDown
};