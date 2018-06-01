/******************************************************************************************************************
* File:pizza.go
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   1.0 March 2018 - Initial implementation by Dongliang Zhou
*	2.0 March 2018 - Added access control logic by Dongliang Zhou
*   3.0 May 2018 - Refactor to include only information derivable from BPMN so that can be templated. Dongliang Zhou
*
* Description: This is the smart contract created manually to implement the pizza BPMN. 
*
* External Dependencies: Hyperledger fabric library
*
******************************************************************************************************************/


package main
import (
	"bytes"
	"strings"
	"encoding/json"
	"encoding/pem"
	"crypto/x509"
	"fmt"
	"strconv"
    "github.com/hyperledger/fabric/core/chaincode/shim"
    "github.com/hyperledger/fabric/protos/peer"
)


// Define the Smart Contract structure
type SmartContract struct {
	EventIDs []string
}

// Define the order structure, with 5 properties.  Structure tags are used by encoding/json library
type Event struct {
	Type string `json:"type"`
	ID string `json:"id"`
	Name  string `json:"name"`
	Status string `json:"status"` // avail, notavail, done
	Dependency []string `json:"dependency"`
	Access map[string]bool `json:"access"`
}

var accessControl = map[string]map[string]bool {
	"confirmOrder": map[string]bool {
		"restaurant.example.com":true,
	},
	"createOrder": map[string]bool {
		"customer.example.com":true,
	},
	"cancelOrder": map[string]bool {
		"restaurant.example.com":true,
	},
	"assignDeliverer": map[string]bool {
		"restaurant.example.com":true,
	},
	"deliverOrder": map[string]bool {
		"deliverer.example.com":true,
	},
}


/*
 * The Init method is called when the Smart Contract "pizza" is instantiated by the blockchain network
 * Best practice is to have any Ledger initialization in separate function -- see initLedger()
 */
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) peer.Response {
	var event Event
	var eventAsBytes []byte
	// create order
	event := Event{
		Type: "task"
		ID: "cre123"
		Name: "Create Order"
		Status: "avail"
		Dependency: []string {,}
		Access: map[string]bool {"customer.example.com":true,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// receive order
	event := Event{
		Type: "event"
		ID: "rec123"
		Name: "Receive Order"
		Status: "notavail"
		Dependency: []string {"cre123",}
		Access: map[string]bool {"restaurant.example.com":true,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// XOR
	event := Event{
		Type: "XOR"
		ID: "xor123"
		Name: "Exclusive Gateway"
		Status: "notavail"
		Dependency: []string {"rec123",}
		Access: map[string]bool {,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// confirm order
	event := Event{
		Type: "task"
		ID: "con123"
		Name: "Confirm Order"
		Status: "notavail"
		Dependency: []string {"xor123",}
		Access: map[string]bool {"restaurant.example.com":true,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// cancel order
	event := Event{
		Type: "task"
		ID: "can123"
		Name: "Cancel Order"
		Status: "notavail"
		Dependency: []string {"xor123",}
		Access: map[string]bool {"restaurant.example.com":true,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// assign deliverer
	event := Event{
		Type: "task"
		ID: "ass123"
		Name: "Assign Deliverer"
		Status: "notavail"
		Dependency: []string {"con123",}
		Access: map[string]bool {"restaurant.example.com":true,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// delivery en route
	event := Event{
		Type: "event"
		ID: "enr123"
		Name: "Assign Deliverer"
		Status: "notavail"
		Dependency: []string {"ass123",}
		Access: map[string]bool {"deliverer.example.com":true,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// deliver order
	event := Event{
		Type: "task"
		ID: "del123"
		Name: "Deliver Order"
		Status: "notavail"
		Dependency: []string {"ass123",}
		Access: map[string]bool {"deliverer.example.com":true,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// AND
	event := Event{
		Type: "AND"
		ID: "and123"
		Name: "Parellel Gateway"
		Status: "notavail"
		Dependency: []string {"del123",}
		Access: map[string]bool {,}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// collect pizza and pay
	event := Event{
		Type: "event"
		ID: "pay123"
		Name: "Collect Pizza and Pay"
		Status: "notavail"
		Dependency: []string {"and123",}
		Access: map[string]bool {"customer.example.com",}
	}
	eventAsBytes, _ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	return shim.Success(nil)
}


func (domain string) hasAccess(function string) bool {
	if domains, ok:=accessControl[function]; ok {
		if access, found:=domains[domain];found {
			return access
		} else {
			return false
		}
	} else {
		return true
	}
}

/*
 * The Invoke method is called as a result of an application request to run the Smart Contract "pizza"
 * The calling application program has also specified the particular smart contract function to be called, with arguments
 */
func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) peer.Response {

	// Retrieve the requested Smart Contract function and arguments
	function, args := APIstub.GetFunctionAndParameters()

    // GetCreator returns marshaled serialized identity of the client
    creatorByte,_:= APIstub.GetCreator()
    certStart := bytes.IndexAny(creatorByte, "-----BEGIN")
    if certStart == -1 {
       return shim.Error("No certificate found")
    }
    certText := creatorByte[certStart:]
    bl, _ := pem.Decode(certText)
    if bl == nil {
       return shim.Error("Could not decode the PEM structure")
    }

    cert, err := x509.ParseCertificate(bl.Bytes)
    if err != nil {
       return shim.Error("ParseCertificate failed")
    }
    uname:=cert.Subject.CommonName
    domainStart := strings.Index(uname,"@")
    if domainStart == -1 {
    	return shim.Error("Could not parce certificate domain")
    }
    domain := uname[domainStart+1:]

	// Route to the appropriate handler function to interact with the ledger appropriately
	if !domain.hasAccess(function) {
		return shim.Error(domain+" is not allowed to call "+function)
	}

	if function == "queryOrder" {
		return s.queryOrder(APIstub, args)
	} else if function == "initLedger" {
		return s.initLedger(APIstub)
	} else if function == "createOrder" {
		return s.createOrder(APIstub, args)
	} else if function == "queryAllOrders" {
		return s.queryAllOrders(APIstub)
	} else if function == "confirmOrder" {
		return s.confirmOrder(APIstub, args)
	} else if function == "cancelOrder" {
		return s.cancelOrder(APIstub, args)
	} else if function == "assignDeliverer" {
		return s.assignDeliverer(APIstub, args)
	} else if function == "deliverOrder" {
		return s.deliverOrder(APIstub, args)
	}

	return shim.Error("Invalid Smart Contract function name.")
}

func (s *SmartContract) queryStatus(APIstub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	statusAsBytes, _ := APIstub.GetState(args[0])
	return shim.Success(statusAsBytes)
}

func (s *SmartContract) initLedger(APIstub shim.ChaincodeStubInterface) peer.Response {
	taskStatus := []TaskStatus{
		TaskStatus{TaskId: "ORDER0", Item: "Cheese Pizza", Customer: "Leo", Deliverer: "John", Status: "Delivered"},
	}

	i := 0
	for i < len(orders) {
		fmt.Println("i is ", i)
		orderAsBytes, _ := json.Marshal(orders[i])
		APIstub.PutState("ORDER"+strconv.Itoa(i), orderAsBytes)
		fmt.Println("Added", orders[i])
		i = i + 1
	}

	return shim.Success(nil)
}

func (s *SmartContract) createOrder(APIstub shim.ChaincodeStubInterface, args []string) peer.Response {
	fmt.Println("creating! ");
	if len(args) != 3 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	var order = Order{OrderId: args[0], Item: args[1], Customer: args[2], Deliverer: "N/A", Status: "Ordered"}

	orderAsBytes, _ := json.Marshal(order)
	APIstub.PutState(args[0], orderAsBytes)

	return shim.Success(nil)
}

func (s *SmartContract) queryAllOrders(APIstub shim.ChaincodeStubInterface) peer.Response {

	startKey := "ORDER0"
	endKey := "ORDER999"

	resultsIterator, err := APIstub.GetStateByRange(startKey, endKey)
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryResults
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- queryAllOrders:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

func (s *SmartContract) confirmOrder(APIstub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	orderAsBytes, _ := APIstub.GetState(args[0])
	order := Order{}

	json.Unmarshal(orderAsBytes, &order)
	if order.Status != "Ordered" {
		return shim.Error("This order cannot be confirmed")
	}

	order.Status = "Confirmed"

	orderAsBytes, _ = json.Marshal(order)
	APIstub.PutState(args[0], orderAsBytes)

	return shim.Success(nil)
}

func (s *SmartContract) cancelOrder(APIstub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	orderAsBytes, _ := APIstub.GetState(args[0])
	order := Order{}

	json.Unmarshal(orderAsBytes, &order)
	if order.Status == "Delivered" {
		return shim.Error("This order cannot be cancelled.")
	}
	
	order.Status = "Cancelled"

	orderAsBytes, _ = json.Marshal(order)
	APIstub.PutState(args[0], orderAsBytes)

	return shim.Success(nil)
}
func (s *SmartContract) assignDeliverer(APIstub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2")
	}

	orderAsBytes, _ := APIstub.GetState(args[0])
	order := Order{}

	json.Unmarshal(orderAsBytes, &order)
	if order.Status != "Confirmed" {
		return shim.Error("Cannot assign deliverer to this order")
	}
	
	order.Deliverer = args[1]
	order.Status = "OutForDelivery"

	orderAsBytes, _ = json.Marshal(order)
	APIstub.PutState(args[0], orderAsBytes)

	return shim.Success(nil)
}
func (s *SmartContract) deliverOrder(APIstub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	orderAsBytes, _ := APIstub.GetState(args[0])
	order := Order{}

	json.Unmarshal(orderAsBytes, &order)
	if order.Status != "OutForDelivery" {
		return shim.Error("This order cannot be delivered")
	}
	
	order.Status = "Delivered"

	orderAsBytes, _ = json.Marshal(order)
	APIstub.PutState(args[0], orderAsBytes)

	return shim.Success(nil)
}
// The main function is only relevant in unit test mode. Only included here for completeness.
func main() {

	// Create a new Smart Contract
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
