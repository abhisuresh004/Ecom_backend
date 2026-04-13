import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  firstname: String,
  lastname: String,
  email: String,
  password: Number,
  isVerified: { type: Boolean, default: false },
  role:{
    type: String,
    enum: ['user', 'admin','blocked'],
    default: 'user'
  }
});

const User = mongoose.model("User", userSchema);
export default User;
