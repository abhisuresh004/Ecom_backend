import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: String,
  otp: Number,
 createdAt:{
  type:Date,
  default:Date.now,
  expires:30 // OTP expires after 10 minutes
 }
});

const OTP = mongoose.model("OTP", otpSchema);
export default OTP;