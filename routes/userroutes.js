import express from "express";
import { registerUser,LoginUser,getUserProfile,UpdateProfile,verifyOTP,Resendotp } from "../controllers/usercontrollers.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/resend-otp", Resendotp);
router.post("/verify-otp", verifyOTP);
router.post("/login", LoginUser);
router.get("/profile",verifyToken, getUserProfile);
router.put("/profile",verifyToken, UpdateProfile);

export default router;