    err := s.StartEvent(APIstub, StartIDs)
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
            for _, childID := range targetEvent.Children {
                err := s.PropagateToken(APIstub, childID, targetEvent.ID)
                if err!=nil {
                    return false, err
                }
            }
            return true, nil
        } else if len(targetEvent.XORtoken)>0 {
            for i,xorID := range targetEvent.XORtoken {
                xor, err := s.GetEvent(APIstub, xorID)
                if err!=nil {
                    return false, err
                }
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
    targetEvent, err := s.GetEvent(APIstub, targetEventID)
    if err!=nil {
        return err
    }

    if targetEvent.Type == "task" {
        targetEvent.Token += 1
        s.PutEvent(APIstub, targetEvent)
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
            s.PutEvent(APIstub, targetEvent)
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
    targetEvent, _ := s.GetEvent(APIstub, targetEventID)
    if targetEvent.Type == "task" {
        targetEvent.XORtoken = append(targetEvent.XORtoken, xorID)
        s.PutEvent(APIstub, targetEvent)
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
        return Event{}, err
    }
    targetEvent := Event{}
    json.Unmarshal(eventAsBytes, &targetEvent)
    return targetEvent,nil
}


func (s *SmartContract) PutEvent(APIstub shim.ChaincodeStubInterface, event Event) {
    eventAsBytes,_ := json.Marshal(event)
    APIstub.PutState(event.ID, eventAsBytes)
}


func (s *SmartContract) GetCaller(APIstub shim.ChaincodeStubInterface) (string,string,error) {
    // GetCreator returns marshaled serialized identity of the client
    creatorByte,_:= APIstub.GetCreator()
    certStart := bytes.IndexAny(creatorByte, "-----BEGIN")
    if certStart == -1 {
       return "","",errors.New("No certificate found")
    }
    certText := creatorByte[certStart:]
    bl, _ := pem.Decode(certText)
    if bl == nil {
       return "","", errors.New("Could not decode the PEM structure")
    }

    cert, err := x509.ParseCertificate(bl.Bytes)
    if err != nil {
       return "","",errors.New("ParseCertificate failed")
    }
    caller:=cert.Subject.CommonName
    domainStart := strings.Index(caller,"@")
    if domainStart == -1 {
        return "","", errors.New("Could not parce certificate domain")
    }
    user := caller[:domainStart+1]
    domain := caller[domainStart+1:]
    return user,domain, nil
}


/*
 * The Invoke method is called as a result of an application request to run the Smart Contract
 * The calling application program has also specified the particular smart contract function to be called
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
        // At the moment, we only care about the caller's domain
        _, caller, err := s.GetCaller(APIstub)
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
    return shim.Success(eventAsBytes)
}


func (s *SmartContract) queryAllEvents(APIstub shim.ChaincodeStubInterface) peer.Response {

    // buffer is a JSON array containing QueryResults
    var buffer bytes.Buffer
    buffer.WriteString("[")
    var EventIDs []string
    EventIDsAsBytes, _ := APIstub.GetState("EventIDs")
    json.Unmarshal(EventIDsAsBytes, &EventIDs)
    bArrayMemberAlreadyWritten := false
    for _, eventID := range EventIDs {
        eventAsBytes, err := APIstub.GetState(eventID)
        if err != nil {
            return shim.Error(err.Error())
        }
        // Add a comma before array members, suppress it for the first array member
        if bArrayMemberAlreadyWritten == true {
            buffer.WriteString(",")
        }
        buffer.WriteString("{\\"Key\\":")
        buffer.WriteString("\\"")
        buffer.WriteString(eventID)
        buffer.WriteString("\\"")
        buffer.WriteString(", \\"Record\\":")
        // Record is a JSON object, so we write as-is
        buffer.WriteString(string(eventAsBytes))
        buffer.WriteString("}")
        bArrayMemberAlreadyWritten = true
    }
    buffer.WriteString("]")
    fmt.Printf("- queryAllEvents:\\n%s\\n", buffer.String())
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
