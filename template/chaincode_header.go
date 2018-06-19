/******************************************************************************************************************
* File: chaincode_header.go
* Project: MSIT-SE Studio Project (Data61)
* Copyright: Team Unchained
* Versions:
*   1.0 March 2018 - Initial implementation by Dongliang Zhou
*   2.0 March 2018 - Added access control logic by Dongliang Zhou
*   3.0 May 2018 - Refactor to include only information derivable from BPMN so that can be templated. Dongliang Zhou
*   3.1 Jun 2018 - Transform to use token method to control task availability. Dongliang Zhou
*   3.2 Jun 2018 - Use APIstub.PutState to save EventIDs. Dongliang Zhou
*   3.3 Jun 2018 - Transform into a generalized template. Dongliang Zhou
*
* Description: This is the smart contract template to implement a BPMN.
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
    //"strconv"
    "github.com/hyperledger/fabric/core/chaincode/shim"
    "github.com/hyperledger/fabric/protos/peer"
)


// Define the Smart Contract structure
type SmartContract struct {
}


// Define the Event structure. Structure tags are used by encoding/json library
type Event struct {
    Type string \`json:"type"\`
    ID string \`json:"id"\`
    Name  string \`json:"name"\`
    Token int \`json:"token"\`
    XORtoken []string \`json:"xortoken"\`
    ANDtoken map[string]int \`json:"andtoken"\`
    Children []string \`json:"children"\`
    Access map[string]bool \`json:"access"\`
}


/*
 * The Init method is called when the Smart Contract is instantiated by the blockchain network
 */
func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) peer.Response {
    var StartIDs []string
    var EventIDs []string
    var event Event
    var eventAsBytes []byte