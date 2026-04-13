import { addToCart ,getCart,updateCart,removeFromCart } from "../controllers/cartcontrollers.js";
import express from "express";
import { verifyToken } from "../middleware.js";
const cartrouter = express.Router();

cartrouter.post("/add",verifyToken, addToCart);
cartrouter.put("/items/:productId",verifyToken, updateCart);
cartrouter.delete("/items/:productId",verifyToken, removeFromCart);
cartrouter.get("/items",verifyToken,getCart);

export default cartrouter;
