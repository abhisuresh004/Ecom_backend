import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: String,
    message: String,
    isRead: {
      type: Boolean,
      default: false,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "products",
    },
  },

  { timestamps: true },
);

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
