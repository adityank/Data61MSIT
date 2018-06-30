/******************************************************************************************************************
* File: ChaincodeGenerator.js
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   
* 1.0 March 2018 - Initial implementation by Dongliang Zhou
* 2.0 June 2018 - Modified to use unique id. Dongliang Zhou
*
* Description: This is the generator that genereates chaincode in a .go file which implements the BPMN logic.
*
* Dependencies: ../template/chaincode_*.go
*
******************************************************************************************************************/

var fs = require('fs'),
    readline = require('readline');


function checkPath(unique_id) {
    if (!fs.existsSync('../../out')) {
        fs.mkdirSync('../../out');
    }
    if (!fs.existsSync('../../out/'+unique_id)) {
        fs.mkdirSync('../../out/'+unique_id);
    }
    if (!fs.existsSync('../../out/'+unique_id+'/chaincode')) {
        fs.mkdirSync('../../out/'+unique_id+'/chaincode');
    }
}


module.exports = function generateGo(unique_id, tasks) {
    console.log('---begin generating Go chaincode---');
    checkPath(unique_id)
    var outpath = '../../out/'+unique_id+'/chaincode/';
    var writer = fs.createWriteStream(outpath+'chaincode.go');
    var domain = unique_id + '.com';

    var header_template = fs.readFileSync('../../template/chaincode_header.go', 'utf8');
    header_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        })

    var event_setup_template = fs.readFileSync('../../template/chaincode_event_setup.go', 'utf8');
    for (var i=0; i<tasks.length; i++) {
        var task = tasks[i]
        var Type = '"'+task.Type+'"';
        var ID = '"'+task.ID+'"';
        var Name = '"'+task.Name+'"';
        var Token = 0;
        var AND_token = '';
        if (Type=='AND') {
            AND_token = '"'+task.Parents.join('":0,"')+'":0';
        }
        var Children = '';
        if (task.Children!=null && task.Children.length>0) {
            Children = '"'+task.Children.join('","')+'"';
        }
        var Lane = '"'+task.Lane.toLowerCase()+'.'+domain+'"'
        var start_event_control = '';
        var function_control = '';
        if (Type=='"START"') {
            start_event_control = 'StartIDs = append(StartIDs, event.ID)\n';
        } else if (Type=='"task"') {
            function_control = 'Functions[event.Name]=event.ID';
        }
        event_setup_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        });
    }

    var body_template = fs.readFileSync('../../template/chaincode_body.go', 'utf8');
    body_template.split(/\r?\n/).forEach(function(line){
            writer.write(eval('`'+line+'\n`'));
        })

    writer.end();
    console.log('---end generating Go chaincode---');
}


// var tasks = [{Type:'START', ID: 'sta123', Name:'Start', Parents:[], Children:['cre123'], Lane:'restaurant.example.com'},
//          {Type:'task', ID: 'cre123', Name:'Creat Order', Parents:['sta123'], Children:['and123'], Lane:'customer.example.com'},
//          {Type:'AND', ID: 'and123', Name:'Parellel Gateway', Parents:['cre123','cre666'], Children:[], Lane:'restaurant.example.com'}];
// var unique_id = '1';
// generateGo(unique_id, tasks);