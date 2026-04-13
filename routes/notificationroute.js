import express from "express";
import { verifyToken } from "../middleware.js";
import {
  getNotifications,
  marksAsread,
} from "../controllers/noticontrollers.js";

const notirouter = express.Router();

notirouter.get("/notifications", verifyToken, getNotifications);
notirouter.put("/notifications/:id", verifyToken, marksAsread);

export default notirouter;
