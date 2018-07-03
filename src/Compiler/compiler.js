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
const { exec } = require('child_process');


function compile(filename) {
    console.log('Start compiling...')
    // Careful with GOPATH, set back?
    // Hyperledger Fabric library location TBD
    // Output folder TBD
    exec('export GOPATH=$(cd ../../;pwd) & go build --tags nopkcs11 ./chaincode/'+filename, (err, stdout, stderr) => {
    if (err) {
        // node couldn't execute the command
        console.log('Compilation failed!')
        console.log(stderr);
        return;
    }

    console.log('Successfully compiled!');
    });
}

compile('badcc');
