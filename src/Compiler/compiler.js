/******************************************************************************************************************
* File: compiler.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   June 2018 - Dongliang Zhou - Initial implementation
*
* Description: This is the module to test compile a given chaincode and returns the compilation status.
*
* Dependencies: 
* 1. Golang
* 2. Hyperledger Fabric library at path ../../src/github.com/hyperledger
*
******************************************************************************************************************/

// module for file-system
var fs = require('fs');
var shell = require('shelljs');
var logger = require('../Logger/logger');

module.exports = function compile(filename) {
    console.log('Start compiling...')
    // Careful with GOPATH, set back?
    // Hyperledger Fabric library location TBD
    // Output folder TBD
    // export GOPATH=$(cd ../../;pwd) & 
    obj = shell.exec('export GOPATH=$HOME/go & go build --tags nopkcs11 '+filename);
    if(obj.code !== 0) {
        console.log('Channel creation failed!');
        logger.log('deployer','Channel creation failed!');
        logger.log('deployer',obj.stderr);
        return obj.stderr;           
    }

    console.log('Successfully compiled!');
    return "Success";
}

//compile('badcc');
