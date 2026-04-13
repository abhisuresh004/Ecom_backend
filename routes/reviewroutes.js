import express from "express";
import { verifyToken } from "../middleware.js";
import { Addreview,Getreview,Deletereview } from "../controllers/reviewcontroller.js";

const reviewrouter=express.Router();


reviewrouter.post("/add/:id",verifyToken,Addreview)
reviewrouter.get("/:productId",verifyToken,Getreview)
reviewrouter.delete("/:id",verifyToken,Deletereview)

export default reviewrouter