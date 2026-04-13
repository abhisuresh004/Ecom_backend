import Address from "../models/addressmodel.js";
import { verifyToken } from "../middleware.js";
import { Addaddress,getaddress,updateaddress,deleteaddress } from "../controllers/addresscontroller.js";
import express from "express";

const addressrouter = express.Router();

addressrouter.get("/address",verifyToken,getaddress)
addressrouter.post("/address",verifyToken,Addaddress)
addressrouter.put("/address/:addressId",verifyToken,updateaddress)
addressrouter.delete("/address",verifyToken,deleteaddress)


export default addressrouter