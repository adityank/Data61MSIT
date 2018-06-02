var fs = require('fs'),
    readline = require('readline'),
    outpath = '';

function generateCryptoConfig(orgs, networkName, domain) {
    console.log('---begin generating crypto-config.yaml---');
    var writer = fs.createWriteStream(outpath+'crypto-config.yaml');

    var template = fs.readFileSync('./template/crypto-config.yaml', 'utf8');
    // Write main body
    template.split(/\r?\n/).forEach(function(line){
        writer.write(eval('`'+line+'\n`'));
    })
    // Write peer part
    peer_template = fs.readFileSync('./template/crypto-config-peer.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerName = orgs[i];
        var peerDomainPrefix = peerName.toLowerCase();
        peer_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        })
    }
    writer.end();
    console.log('---end generating crypto-config.yaml---');
}

function generateConfigTX(orgs, networkName, domain) {
    console.log('---begin generating configtx.yaml---');
    var writer = fs.createWriteStream(outpath+'configtx.yaml');

    // Generate ${configtx-orgs}
    var configtx_orgs = '';
    var orgs_template = fs.readFileSync('./template/configtx-orgs.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerName = orgs[i];
        orgs_template.split(/\r?\n/).forEach(function(line){
            configtx_orgs+=eval('`'+line+'\n`');
        });
    }

    // Write main body
    var template = fs.readFileSync('./template/configtx.yaml', 'utf8');
    template.split(/\r?\n/).forEach(function(line){
        writer.write(eval('`'+line+'\n`'));
    });
    // Write msp part
    msp_template = fs.readFileSync('./template/configtx-orgs-msp.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerName = orgs[i];
        var peerDomainPrefix = peerName.toLowerCase();
        msp_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }
    writer.end();
    console.log('---end generating crypto-config.yaml---');
}

function generateDockerComposeCli(orgs, networkName, domain) {    
    console.log('---begin generating docker-compose-cli.yaml---');
    var writer = fs.createWriteStream(outpath+'docker-compose-cli.yaml');

    var template = fs.readFileSync('./template/docker-compose-cli.yaml', 'utf8');
    var volumes_template = fs.readFileSync('./template/docker-compose-cli-volumes.yaml', 'utf8');
    // Generate peerVolumes
    var peerVolumes = '';
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerDomainPrefix = orgs[i].toLowerCase();
        volumes_template.split(/\r?\n/).forEach(function(line){
            peerVolumes+=eval('`'+line+'\n`');
        });
    }
    // Write main body
    template.split(/\r?\n/).forEach(function(line){
        writer.write(eval('`'+line+'\n`'));
    })
    // Write peer part
    var peer_template = fs.readFileSync('./template/docker-compose-cli-peer.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerDomainPrefix = orgs[i].toLowerCase();
        peer_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }    
    // Generate cliDependsOn for cli
    var cliDependsOn = '';
    var dependson_template = fs.readFileSync('./template/docker-compose-cli-depends-on.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerDomainPrefix = orgs[i].toLowerCase();
        dependson_template.split(/\r?\n/).forEach(function(line){
            cliDependsOn+=eval('`'+line+'\n`');
        });
    }
    // Write cli part
    var cli_template = fs.readFileSync('./template/docker-compose-cli-cli.yaml', 'utf8');
    for (var i = orgs.length -1; i >= 0; i--) {
        var peerName = orgs[i];
        var peerDomainPrefix = peerName.toLowerCase();
        cli_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }
    writer.end();
    console.log('---end generating docker-compose-cli.yaml---');
}

function generateDockerComposeBase(orgs, networkName, domain) {
    console.log('---begin generating docker-compose-base.yaml---');
    var writer = fs.createWriteStream(outpath+'base/docker-compose-base.yaml');

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
    console.log('---begin generating peer-base.yaml---');
    var writer = fs.createWriteStream(outpath+'base/peer-base.yaml');

    var template = fs.readFileSync('./template/base/peer-base.yaml', 'utf8');
    
    template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    writer.end();
    console.log('---end generating peer-base.yaml---');
}

function generateYAML(orgs, networkName, domain) {
    console.log('---begin generating YAML files---');
    outpath = 'out/'+domain+'/'+networkName+'/';
    checkPath(domain,networkName);
    generatePeerBase(networkName);
    generateDockerComposeBase(orgs, networkName, domain);
    generateCryptoConfig(orgs, networkName, domain);
    generateConfigTX(orgs, networkName, domain);
    generateDockerComposeCli(orgs, networkName, domain);
    console.log('---end generating YAML files---');
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
generateYAML(['Deliverer','Customer','Restaurant'], 'NewPizza', 'pizzatest.com');