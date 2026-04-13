import { addToWishlist,getWishlist,removeFromWishlist } from "../controllers/wishlistcontrollers.js";
import express from "express";
import { verifyToken } from "../middleware.js";
const wishlistrouter = express.Router();

wishlistrouter.post("/add",verifyToken, addToWishlist);
wishlistrouter.get("/items",verifyToken,getWishlist);
wishlistrouter.delete("/items/:productId",verifyToken, removeFromWishlist);

export default wishlistrouter;