func (s *SmartContract) createOrder(APIstub shim.ChaincodeStubInterface) peer.Response {
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
func (s *SmartContract) confirmOrder(APIstub shim.ChaincodeStubInterface) peer.Response {
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
func (s *SmartContract) cancelOrder(APIstub shim.ChaincodeStubInterface) peer.Response {
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
