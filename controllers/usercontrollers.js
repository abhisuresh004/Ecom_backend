import User from "../models/user.js";
import OTP from "../models/otpmodel.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import process from "process";
import dotenv from "dotenv";
import Address from "../models/addressmodel.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (JWT_SECRET) {
  console.log("JWT_SECRET is " + JWT_SECRET);
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.email_user,
    pass: process.env.email_pass,
  },
});



export const registerUser = async (req, res) => {
  const { username, firstname, lastname, email, password } = req.body;
  const userDetails = new User({
    username,
    firstname,
    lastname,
    email,
    password,
  });
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already exists" });
  }
  await userDetails.save();

  const otp = generateOTP();
  console.log("Generated OTP for user " + email + ": " + otp);

  const otpEntry = new OTP({
    email: email,
    otp: otp,
  });
  await otpEntry.save();

  await transport.sendMail({
    from: process.env.email_user,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
  });

  res
    .status(200)
    .json({ message: "User registered successfully, OTP sent to email" });
};

export const LoginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    console.log("User not found with email: " + email);
    return res.status(404).json({ message: "User not found" });
  }
  if (user.password !== password) {
    console.log("Invalid credentials");
    return res.status(401).json({ message: "Invalid credentials" });
  }
  if (!user.isVerified) {
    console.log("User email not verified: " + email);
    return res.status(403).json({ message: "Email not verified" });
  }
  if (user.role === "blocked") {
    return res.status(403).json({ message: "You have been blocked by admin" });
  }

  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {});
  const userdata = user.toObject();
  delete userdata.password;
  res.status(200).json({ message: "Login successful", token, userdata });
};

export const getUserProfile = async (req, res) => {
  const userId = req.user.userId;
  console.log(userId);
  const user = await User.findById(userId).select("-password");
  const address=await Address.findOne({userId});
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res
    .status(200)
    .json({ message: "User profile retrieved successfully", user,address });
};

export const UpdateProfile = async (req, res) => {
  const userId = req.user.userId;
  const { username, firstname, lastname, email, password } = req.body;

  const updatedFields = {};
  if (username) updatedFields.username = username;
  if (firstname) updatedFields.firstname = firstname;
  if (lastname) updatedFields.lastname = lastname;
  if (email) updatedFields.email = email;
  if (password) updatedFields.password = password;

  const user = await User.findByIdAndUpdate(userId, updatedFields, {
    new: true,
  }).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({ message: "User profile updated successfully", user });
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  console.log("Verifying OTP for email:" + email + ", OTP: " + otp);
  const otpentry = await OTP.findOne({ email });
  if (!otpentry) {
    return res.status(400).json({ message: "Expired OTP" });
  }
  if (otpentry.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  await User.updateOne({ email }, { isVerified: true });
  await OTP.deleteOne({ email, otp });
  res.status(200).json({ message: "OTP verified successfully" });
};

export const Resendotp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingOTP = await OTP.findOne({ email });
    if (existingOTP) {
      return res.status(400).json({ message: "OTP already sent" });
    }

    const otp = generateOTP();
    const otpentry = new OTP({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await otpentry.save();

    await transport.sendMail({
      from: process.env.email_user,
      to: email,
      subject: "Your OTP Code",
      text: `Your New OTP is ${otp}. It will expire in 10 minutes.`,
    });

    res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

