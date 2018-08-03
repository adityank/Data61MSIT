// Tests for Translator Module


/*
test = "nested_child_lanes";
result = parse_by_file("../../bpmn_examples/"+test+".bpmn",test);
console.log(result.errors);
console.log(result.num_peers);
// test cases:
// invalid_lane_name duplicated_lane_names nested_child_lanes unnamed_lanes participant_without_lane
// no_participant inclusive_gateway duplicated_function_names

*/

var parser = require('../../src/Translator/parser.js');
var expect = require('chai').expect;
var path = require('path'),
    bpmn_root = path.join(__dirname, '../../bpmn_examples/');
describe('Test name 1', function() {
  it('description 1', function() {
  	var translation_result = parser.parse_by_file(bpmn_root+'andgate.bpmn', 'test_andgate');
  	console.log(translation_result.errors);
    expect(translation_result.errors).to.be.equal(null);
  });
});