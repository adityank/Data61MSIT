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
* 2. Hyperledger Fabric library at path $GOPATH/src/github.com/hyperledger
* 3. shelljs package
*
******************************************************************************************************************/

// module for file-system
var fs = require('fs');
var shell = require('shelljs');
var logger = require('../Logger/logger');

// This function tries to compile the chaincode that exists in ../../out/unique_id/chaincode
// Returns any error messages or null
function compile(unique_id) {
    logger.init(unique_id);
    console.log('Start compiling...')

    obj = shell.exec('cd ../../out/'+unique_id+'/chaincode/ && go build --tags nopkcs11 chaincode.go');
    if(obj.code !== 0) {
        //console.log('Compilation failed.');
        //console.log(obj.stdout);
        logger.log('compiler','Compilation failed!');
        logger.log('compiler', 'stdout:\n'+obj.stdout);
        logger.log('compiler',obj.stderr);
        return [obj.stderr];           
    }

    console.log('Successfully compiled!');
    return null;
}

module.exports = compile;