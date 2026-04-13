import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  addressess: [
    {
      address: String,
      pincode: Number,
      landmark: String,
      isPrimary: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

const Address = mongoose.model("Address", AddressSchema);
export default Address;
