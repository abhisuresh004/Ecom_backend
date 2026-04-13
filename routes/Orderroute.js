import { placeOrder,getOrders,getOrderdetailsById,cancelOrder,updateOrder,Orderfromcart } from "../controllers/ordercontrollers.js";
import express from "express";
import { verifyToken } from "../middleware.js";
const orderrouter = express.Router();

orderrouter.post("/place",verifyToken, placeOrder);
orderrouter.post("/place/cart",verifyToken, Orderfromcart);


orderrouter.get("/myorders",verifyToken, getOrders);
orderrouter.get("/:id",verifyToken, getOrderdetailsById);
orderrouter.patch("/:id",verifyToken, cancelOrder);
orderrouter.put("/:id",verifyToken,updateOrder)










export default orderrouter;