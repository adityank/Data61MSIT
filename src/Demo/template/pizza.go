/******************************************************************************************************************
* File:pizza.go
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   1.0 March 2018 - Initial implementation by Dongliang Zhou
*	2.0 March 2018 - Added access control logic by Dongliang Zhou
*   3.0 May 2018 - Refactor to include only information derivable from BPMN so that can be templated. Dongliang Zhou
*   3.1 Jun 2018 - Transform to use token method to control task availability
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
	"errors"
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

// Define the Event structure, with 6 properties.  Structure tags are used by encoding/json library
type Event struct {
	Type string `json:"type"`
	ID string `json:"id"`
	Name  string `json:"name"`
	Token int `json:"token"`
	XORtoken []string `json:"xortoken"`
	ANDtoken map[string]int `json:"andtoken"`
	Children []string `json:"children"`
	Access map[string]bool `json:"access"`
}


/*
 * The Init method is called when the Smart Contract "pizza" is instantiated by the blockchain network
 * Best practice is to have any Ledger initialization in separate function -- see initLedger()
 */
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) peer.Response {
	var StartIDs []string
	var event Event
	var eventAsBytes []byte
	// start
	event = Event{
		Type: "start",
		ID: "sta123",
		Name: "Start",
		Token: 1,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {"cre123"},
		Access map[string]bool {},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	StartIDs = append(StartIDs, event.ID)

	// create order
	event = Event{
		Type: "task",
		ID: "cre123",
		Name: "Create Order",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {"rec123"},
		Access: map[string]bool {"customer.example.com":true},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// receive order
	event = Event{
		Type: "event",
		ID: "rec123",
		Name: "Receive Order",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {"xor123"},
		Access: map[string]bool {"restaurant.example.com":true},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// XOR
	event = Event{
		Type: "XOR",
		ID: "xor123",
		Name: "Exclusive Gateway",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {"con123","can123"},
		Access: map[string]bool {},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// confirm order
	event = Event{
		Type: "task",
		ID: "con123",
		Name: "Confirm Order",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {"ass123"},
		Access: map[string]bool {"restaurant.example.com":true},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// cancel order
	event = Event{
		Type: "task",
		ID: "can123",
		Name: "Cancel Order",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {},
		Access: map[string]bool {"restaurant.example.com":true},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// assign deliverer
	event = Event{
		Type: "task",
		ID: "ass123",
		Name: "Assign Deliverer",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {"enr123"},
		Access: map[string]bool {"restaurant.example.com":true},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// delivery en route
	event = Event{
		Type: "event",
		ID: "enr123",
		Name: "Delivery En Route",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {"del123"},
		Access: map[string]bool {"deliverer.example.com":true},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// deliver order
	event = Event{
		Type: "task",
		ID: "del123",
		Name: "Deliver Order",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {"and123"},
		Access: map[string]bool {"deliverer.example.com":true},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// AND
	event = Event{
		Type: "AND",
		ID: "and123",
		Name: "Parellel Gateway",
		Token: 0,
		XORtoken: []string {},
		ANDtoken: map[string]int {"del123":0},
		Children: []string {"pay123"},
		Access: map[string]bool {},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)
	// collect pizza and pay
	event = Event{
		Type: "event",
		ID: "pay123",
		Name: "Collect Pizza and Pay",
		XORtoken: []string {},
		ANDtoken: map[string]int {},
		Children: []string {},
		Access: map[string]bool {"customer.example.com"},
	}
	eventAsBytes, _ = json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
	s.EventIDs = append(s.EventIDs, event.ID)

	err = s.StartEvent(APIstub, StartIDs)
	if err!= nil {
		return shim.Error(err.Error())
	}
	return shim.Success(nil)
}

func (s *SmartContract) StartEvent(APIstub shim.ChaincodeStubInterface, StartIDs []string) (error) {
	for _, id := range StartIDs {
		startEvent, err := s.GetEvent(APIstub, id)
		if err!=nil {
			return err
		}
		for _, childID := range startEvent.Children {
			err =s.PropagateToken(APIstub, childID, id)
			if err!=nil {
				return err
			}
		}
	}
	return nil
}


func (s *SmartContract) CheckAccess(caller string, task Event) bool {
	return task.Access[caller]
}


func (s *SmartContract) DoTask(APIstub shim.ChaincodeStubInterface, targetEvent Event) (bool,error) {
	if targetEvent.Type == "task" {
		if targetEvent.Token > 0 {
			s.ConsumeToken(APIstub, targetEvent)
			s.PropagateToken(APIstub, targetEvent)
			return true, nil
		} else if len(targetEvent.XORtoken)>0 {
			for i,xorID := range targetEvent.XORtoken {
				xor, err := s.GetEvent(APIstub, xorID)
				if xor.Token>0 { // found a usable XOR token
					s.ConsumeToken(APIstub, xor)
					// delete tested XOR tokens
					targetEvent.XORtoken = targetEvent.XORtoken[i+1:]
					s.PutEvent(APIstub, targetEvent)
					// Propagate a token to all children
					for _, childID := range targetEvent.Children {
						s.PropagateToken(APIstub, childID, targetEvent.ID)
					}
					return true, nil
				}
			}
			// delete all tested XOR tokens
			targetEvent.XORtoken = []string {}
			s.PutEvent(APIstub, targetEvent)
			return false, nil
		} else {
			return false, nil
		}
	} else {
		return false, errors.New("Event type unexecutable: "+targetEvent.ID+", "+targetEvent.Type)
	}
}


func (s *SmartContract) ConsumeToken(APIstub shim.ChaincodeStubInterface, event Event) {
	event.Token -= 1
	s.PutEvent(APIstub, event)
}

func (s *SmartContract) PropagateToken(APIstub shim.ChaincodeStubInterface, targetEventID string, sourceID string) (error) {
	targetEvent, err := GetEvent(APIstub, targetEventID)
	if err!=nil {
		return err
	}

	if targetEvent.Type == "task" {
		targetEvent.Token += 1
		s.PutEvent(targetEvent)
		return nil
	} else if targetEvent.Type == "AND" {
		// check all
		targetEvent.ANDtoken[sourceID] += 1
		for _, token := range targetEvent.ANDtoken {
			if token==0 {
				s.PutEvent(APIstub,targetEvent)
				return nil
			}
		}
		for parentID, _ := range targetEvent.ANDtoken {
			targetEvent.ANDtoken[parentID] -= 1
		}
		s.PutEvent(APIstub, targetEvent)
		for _, childID := range targetEvent.Children {
			err = s.PropagateToken(APIstub, childID, targetEvent.ID)
			if err!=nil {
				return err
			}
		}
		return nil
	} else if targetEvent.Type == "XOR" {
		if len(targetEvent.Children)<=1 {
			for _, childID := range targetEvent.Children {
				err = s.PropagateToken(APIstub, childID, targetEvent.ID)
				if err!= nil {
					return err
				}
			}
			return nil
		} else {
			targetEvent.Token += 1
			s.PutEvent(targetEvent)
			for _, childID := range targetEvent.Children {
				err = s.PropagateXORToken(APIstub, childID, targetEvent.ID)
				if err!=nil {
					return err
				}
			}
			return nil
		}
	} else {
		for _, childID := range targetEvent.Children {
			err = s.PropagateToken(APIstub, childID, targetEvent.ID)
			if err!=nil {
				return err
			}
		}
		return nil
	}
}

func (s *SmartContract) PropagateXORToken(APIstub shim.ChaincodeStubInterface, targetEventID string, xorID string) (error) {
	targetEvent, _ := GetEvent(APIstub, targetEventID)
	if targetEvent.Type == "task" {
		targetEvent.XORtoken = append(targetEvent.XORtoken, xorID)
		s.PutEvent(targetEvent)
		return nil
	} else if targetEvent.Type == "event" {
		for _, childID := range targetEvent.Children {
			s.PropagateXORToken(APIstub, childID, xorID)
		}
		return nil
	} else {
		// Unsupported
		return errors.New("Attaching another gateway to an exclusive gateway is not supported.")
	}
}


func (s *SmartContract) GetEvent(APIstub shim.ChaincodeStubInterface, eventID string) (Event, error) {
	eventAsBytes, err := APIstub.GetState(eventID)
	if err!=nil {
		return nil, err
	}
	targetEvent := Event{}
	json.Unmarshal(eventAsBytes, &targetEvent)
	return targetEvent,nil
}

func (s *SmartContract) PutEvent(APIstub shim.ChaincodeStubInterface, event Event) {
	eventAsBytes,_ := json.Marshal(event)
	APIstub.PutState(event.ID, eventAsBytes)
}

func (s *SmartContract) GetCaller(APIstub shim.ChaincodeStubInterface) (string,error) {
    // GetCreator returns marshaled serialized identity of the client
    creatorByte,_:= APIstub.GetCreator()
    certStart := bytes.IndexAny(creatorByte, "-----BEGIN")
    if certStart == -1 {
       return nil,errors.New("No certificate found")
    }
    certText := creatorByte[certStart:]
    bl, _ := pem.Decode(certText)
    if bl == nil {
       return nil, errors.New("Could not decode the PEM structure")
    }

    cert, err := x509.ParseCertificate(bl.Bytes)
    if err != nil {
       return nil,errors.New("ParseCertificate failed")
    }
    uname:=cert.Subject.CommonName
    return uname, nil
}



/*
 * The Invoke method is called as a result of an application request to run the Smart Contract "pizza"
 * The calling application program has also specified the particular smart contract function to be called, with arguments
 */
func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) peer.Response {

	// Retrieve the requested Smart Contract function and arguments
	function, args := APIstub.GetFunctionAndParameters()

	if function == "queryEvent" {
		return s.queryEvent(APIstub, args)
	} else if function == "queryAllEvents" {
		return s.queryAllEvents(APIstub)
	} else {
		taskEvent, err := s.GetEvent(APIstub, function)
		if err!=nil {
			return shim.Error("Invalid function name")
		}

		caller, err := s.GetCaller(APIstub)
		if err!=nil {
			return shim.Error(err.Error())
		}

		if s.CheckAccess(caller, taskEvent) {
			success, err := s.DoTask(APIstub, taskEvent)
			if err!=nil {
				return shim.Error(err.Error())
			} else if success {
				return shim.Success(nil)
			} else {
				return shim.Error("Requested function does not follow the business logic.")
			}
		} else {
			return shim.Error(caller+" do not have access to function "+function)
		}
	}
}


func (s *SmartContract) queryEvent(APIstub shim.ChaincodeStubInterface, args []string) peer.Response {

	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	eventAsBytes, err := APIstub.GetState(args[0])
	if err!=nil {
		return shim.Error(err.Error())
	}
	return shim.Success(statusAsBytes)
}


func (s *SmartContract) queryAllEvents(APIstub shim.ChaincodeStubInterface) peer.Response {

	// buffer is a JSON array containing QueryResults
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for eventID := range s.EventIDs {
		eventAsBytes, err := APIstub.GetState(eventID)
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(eventID)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(eventAsBytes))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- queryAllEvents:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}


// The main function is only relevant in unit test mode. Only included here for completeness.
func main() {

	// Create a new Smart Contract
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
