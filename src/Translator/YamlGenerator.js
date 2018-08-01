/******************************************************************************************************************
* File: YamlGenerator.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
*   May 2018 - Dongliang Zhou - Initial implementation
*   July 2018 - Dongliang Zhou - Minor bug fix and add comments
*
* Description: This is the module to generate YAML files for deployment purposes
*
* Dependencies: ../template/*.yaml
*
******************************************************************************************************************/


var fs = require('fs'),
    readline = require('readline'),
    outpath = '';
var logger = require('../Logger/logger');


// Helper function to generate crypto-config.yaml
function generateCryptoConfig(orgs, unique_id) {
    //console.log('---begin generating crypto-config.yaml---');
    logger.log('translator','---begin generating crypto-config.yaml---');
    var writer = fs.createWriteStream(outpath+'crypto-config.yaml');

    var domain = unique_id + '.com';

    var template = fs.readFileSync('../../template/crypto-config.yaml', 'utf8');
    // Write main body
    template.split(/\r?\n/).forEach(function(line){
        writer.write(eval('`'+line+'\n`'));
    })
    // Write peer part
    peer_template = fs.readFileSync('../../template/crypto-config-peer.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerName = orgs[i];
        var peerDomainPrefix = peerName;
        peer_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        })
    }
    writer.end();
    //console.log('---end generating crypto-config.yaml---');
    logger.log('translator','---end generating crypto-config.yaml---');

}

// Helper function to generate configtx.yaml
function generateConfigTX(orgs, unique_id) {
    //console.log('---begin generating configtx.yaml---');
    logger.log('translator','---begin generating configtx.yaml---');

    var writer = fs.createWriteStream(outpath+'configtx.yaml');
    var domain = unique_id + '.com';

    // Generate ${configtx-orgs}
    var configtx_orgs = '';
    var orgs_template = fs.readFileSync('../../template/configtx-orgs.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerName = orgs[i];
        orgs_template.split(/\r?\n/).forEach(function(line){
            configtx_orgs+=eval('`'+line+'\n`');
        });
    }

    // Write main body
    var template = fs.readFileSync('../../template/configtx.yaml', 'utf8');
    template.split(/\r?\n/).forEach(function(line){
        writer.write(eval('`'+line+'\n`'));
    });
    // Write msp part
    msp_template = fs.readFileSync('../../template/configtx-orgs-msp.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerName = orgs[i];
        var peerDomainPrefix = peerName;
        msp_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }
    writer.end();
    //console.log('---end generating configtx.yaml---');
    logger.log('translator','---end generating configtx.yaml---');    
}


// Helper function to generate docker-compose-cli.yaml
function generateDockerComposeCli(orgs, unique_id) {    
    //console.log('---begin generating docker-compose-cli.yaml---');
    logger.log('translator','---begin generating docker-compose-cli.yaml---');        
    var writer = fs.createWriteStream(outpath+'docker-compose-cli.yaml');

    var domain = unique_id + '.com';

    var template = fs.readFileSync('../../template/docker-compose-cli.yaml', 'utf8');
    var volumes_template = fs.readFileSync('../../template/docker-compose-cli-volumes.yaml', 'utf8');
    // Generate peerVolumes
    var peerVolumes = '';
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerDomainPrefix = orgs[i];
        volumes_template.split(/\r?\n/).forEach(function(line){
            peerVolumes+=eval('`'+line+'\n`');
        });
    }
    // Write main body
    template.split(/\r?\n/).forEach(function(line){
        writer.write(eval('`'+line+'\n`'));
    })
    // Write peer part
    var peer_template = fs.readFileSync('../../template/docker-compose-cli-peer.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerDomainPrefix = orgs[i];
        peer_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }    
    // Generate cliDependsOn for cli
    var cliDependsOn = '';
    var dependson_template = fs.readFileSync('../../template/docker-compose-cli-depends-on.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerDomainPrefix = orgs[i];
        dependson_template.split(/\r?\n/).forEach(function(line){
            cliDependsOn+=eval('`'+line+'\n`');
        });
    }
    // Write cli part
    var cli_template = fs.readFileSync('../../template/docker-compose-cli-cli.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerName = orgs[i];
        var peerDomainPrefix = peerName;
        cli_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }
    writer.end();
    //console.log('---end generating docker-compose-cli.yaml---');
    logger.log('translator','---end generating docker-compose-cli.yaml---');            
}


// Helper function to generate docker-compose-base.yaml
function generateDockerComposeBase(orgs, unique_id) {
    //console.log('---begin generating docker-compose-base.yaml---');
    logger.log('translator','---begin generating docker-compose-base.yaml---');

    var writer = fs.createWriteStream(outpath+'base/docker-compose-base.yaml');
    var domain = unique_id + '.com';

    var template = fs.readFileSync('../../template/base/docker-compose-base.yaml', 'utf8');    
    var ordererPort = "$port0";
    template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });

    var peer_template = fs.readFileSync('../../template/base/docker-compose-base-peer.yaml', 'utf8');
    for (var i = orgs.length - 1; i >= 0; i--) {
        var peerName = orgs[i];
        var peerDomainPrefix = peerName;
        var peerPort7051 = "$port"+(2*i+1).toString();
        var peerPort7053 = "$port"+(2*i+2).toString();
        peer_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }

    writer.end();
    //console.log('---end generating docker-compose-base.yaml---');
    logger.log('translator','---end generating docker-compose-base.yaml---');
}


// Helper function to generate peer-base.yaml
function generatePeerBase(unique_id) {
    //console.log('---begin generating peer-base.yaml---');
    logger.log('translator','---begin generating peer-base.yaml---');
    
    var writer = fs.createWriteStream(outpath+'base/peer-base.yaml');
    var domain = unique_id + '.com';

    var template = fs.readFileSync('../../template/base/peer-base.yaml', 'utf8');    
    template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    writer.end();
    //console.log('---end generating peer-base.yaml---');
    logger.log('translator','---end generating peer-base.yaml---');
}


// Main function to generate YAML files
function generateYAML(orgs, unique_id) {
    //console.log('---begin generating YAML files---');
    logger.log('translator','---begin generating YAML files---');
    outpath = '../../out/'+unique_id+'/';
    checkPath(unique_id);
    generatePeerBase(unique_id);
    generateDockerComposeBase(orgs, unique_id);
    generateCryptoConfig(orgs, unique_id);
    generateConfigTX(orgs, unique_id);
    generateDockerComposeCli(orgs, unique_id);
    //console.log('---end generating YAML files---');
    logger.log('translator','---begin generating YAML files---');   
}


// Helper function to check dir and mkdir
function checkPath(unique_id) {
    if (!fs.existsSync('../../out')) {
        fs.mkdirSync('../../out');
    }
    if (!fs.existsSync('../../out/'+unique_id)) {
        fs.mkdirSync('../../out/'+unique_id);
    }
    if (!fs.existsSync('../../out/'+unique_id+'/'+'/base')) {
        fs.mkdirSync('../../out/'+unique_id+'/'+'/base');
    }
}

module.exports = generateYAML;
// var orgs = ['Restaurant','Customer','Deliverer'];
// var unique_id = '1';
// generateYAML(['Deliverer','Customer','Restaurant'], unique_id);
