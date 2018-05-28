var fs = require('fs'),
    readline = require('readline'),
    outpath = '';

function generateCryptoConfig(orgs, networkName, domain) {

}

function generateConfigTX(orgs, networkName, domain) {

}

function generateDockerComposeCli(orgs, networkName, domain) {

}

function generateDockerComposeBase(orgs, networkName, domain) {
    var writer = fs.createWriteStream(outpath+'base/docker-compose-base.yaml');
    console.log('---begin generating docker-compose-base.yaml---');

    var template = fs.readFileSync('./template/base/docker-compose-base.yaml', 'utf8');
    
    var ordererPort = 7050;

    template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });

    var peer_template = fs.readFileSync('./template/base/docker-compose-base-peer.yaml', 'utf8');

    for (var i = orgs.length - 1; i >= 0; i--) {
        var peerName = orgs[i];
        var peerDomainPrefix = peerName.toLowerCase();
        var peerPort7051 = 7051+i*100;
        var peerPort7053 = 7053+i*100;
        peer_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }

    writer.end();
    console.log('---end generating docker-compose-base.yaml---');
}

function generatePeerBase(networkName) {
    var writer = fs.createWriteStream(outpath+'base/peer-base.yaml');
    console.log('---begin generating peer-base.yaml---');

    var template = fs.readFileSync('./template/base/peer-base.yaml', 'utf8');
    
    template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    writer.end();
    console.log('---end generating peer-base.yaml---');
}

function generateYAML(orgs, networkName, domain) {
    outpath = 'out/'+domain+'/'+networkName+'/';
    checkPath(domain,networkName);
    generatePeerBase(networkName);
    generateDockerComposeBase(orgs, networkName, domain);
    generateCryptoConfig(orgs, networkName, domain);
    generateConfigTX(orgs, networkName, domain);
    generateDockerComposeCli(orgs, networkName, domain);
}

function checkPath(domain,networkName) {
    if (!fs.existsSync('out')) {
        fs.mkdirSync('out');
    }
    if (!fs.existsSync('out/'+domain)) {
        fs.mkdirSync('out/'+domain);
    }
    if (!fs.existsSync('out/'+domain+'/'+networkName)) {
        fs.mkdirSync('out/'+domain+'/'+networkName);
    }
    if (!fs.existsSync('out/'+domain+'/'+networkName)) {
        fs.mkdirSync('out/'+domain+'/'+networkName);
    }
    if (!fs.existsSync('out/'+domain+'/'+networkName+'/base')) {
        fs.mkdirSync('out/'+domain+'/'+networkName+'/base');
    }
}

//var orgs = ['Restaurant','Customer','Deliverer'];
//var networkName = 'pizzanetwork';
//var domain = 'example.com';
generateYAML(['Deliverer','Customer','Restaurant'], 'pizzanetwork', 'example.com');