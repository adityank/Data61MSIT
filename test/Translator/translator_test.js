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
	/*
	it('Pizza Example', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'pizza.bpmn', 'test_pizza');
		console.log(translation_result.errors);
		expect(translation_result.errors).to.be.equal(null);
	});
	*/
});

describe('Expected Warning', function() {
	it('Duplicated Function Names', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'duplicated_function_names.bpmn', 'test_duplicated_function_names');
		expect(translation_result.errors).to.be.eql(["Duplicated function name detected: Task A"]);
	});
	it('Duplicated Lane Names', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'duplicated_lane_names.bpmn', 'test_duplicated_lane_names');
		expect(translation_result.errors).to.be.eql(["Duplicated lane name found: Lane1"]);
	});
	it('Inclusive Gateway', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'inclusive_gateway.bpmn', 'test_inclusive_gateway');
		expect(translation_result.errors).to.be.eql(["Support for Inclusive Gateway is not enabled."]);
	});
	it('No Participant', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'no_participant.bpmn', 'test_no_participant');
		expect(translation_result.errors).to.be.eql(["The BPMN must have at least one lane."]);
	});
	it('Participant without Lane', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'participant_without_lane.bpmn', 'test_participant_without_lane');
		expect(translation_result.errors).to.be.eql(["The BPMN must have at least one lane."]);
	});
	it('Invalid Lane Name', function() {
		var translation_result = parser.parse_by_file(bpmn_root+'invalid_lane_name.bpmn', 'test_invalid_lane_name');
		expect(translation_result.errors).to.be.eql(["Lane names can only contain a-Z, 0-9, and _: Lane 2"]);
	});

});
