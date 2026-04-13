import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,

    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: true,
        },
        quantity: Number,
      },
    ],
    price: {
      type: Number,
      required: true,
    },
    address:{
      type:String,
      required:true
    },

    status: {
      type: String,
      enum: [
        "orderplaced",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "orderplaced",
    },
  },
  { timestamps: true },
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
