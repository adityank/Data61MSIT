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
var path = require('path');
var bpmn_root = path.join(__dirname, '../../bpmn_examples/');

describe('Correct Translation', function() {
	it('Parallel Gateway', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'andgate.bpmn', 'test_andgate');
		console.log(translation_result.errors);
		expect(translation_result.errors).to.be.equal(null);
	});
	it('Exclusive Gateway', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'nestedxorgood.bpmn', 'test_nestedxorgood');
		console.log(translation_result.errors);
		expect(translation_result.errors).to.be.equal(null);
	});
	it('Databased Exclusive Gateway', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'databased.bpmn', 'test_databased');
		console.log(translation_result.errors);
		expect(translation_result.errors).to.be.equal(null);
	});
	it('Pizza Example', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'pizza.bpmn', 'test_pizza');
		console.log(translation_result.errors);
		expect(translation_result.errors).to.be.equal(null);
	});
});
/*
describe('Expected Warning', function() {
	it('Parallel Gateway', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'andgate.bpmn', 'test_andgate');
		expect(translation_result.errors).to.be.equal(null);
	});
	it('Exclusive Gateway', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'nestedxorgood.bpmn', 'test_nestedxorgood');
		expect(translation_result.errors).to.be.equal(null);
	});
	it('Databased Exclusive Gateway', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'databased.bpmn', 'test_databased');
		expect(translation_result.errors).to.be.equal(null);
	});
	it('Pizza Example', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'pizza.bpmn', 'test_pizza');
		expect(translation_result.errors).to.be.equal(null);
	});
});
*/