    event = Event{
        Type: ${Type},
        ID: ${ID},
        Name: ${Name},
        Token: ${Token},
        XORtoken: []string {},
        ANDtoken: map[string]int {${AND_token}},
        Children: []string {${Children}},
        Access: map[string]bool {${Access}},
    }
    eventAsBytes, _ = json.Marshal(event)
    APIstub.PutState(event.ID, eventAsBytes)
    EventIDs = append(EventIDs, event.ID)
    ${start_event_control}