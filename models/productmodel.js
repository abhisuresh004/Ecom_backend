import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
    },

    mrp: {
      type: Number,
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    brand: {
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      default: 0,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
    },

    image: [
      {
       _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true, // automatically generate unique id
      },
      url: {
        type: String,
        required: true,
      },
      },
    ],

    description: {
      type: String,
    },

    // 🖥️ Tech Specifications
    processor: {
      type: String,
    },

    ram: {
      type: String,
    },

    storage: {
      type: String,
    },

    battery: {
      type: String,
    },

    warranty: {
      type: String,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  },
);

const Products = mongoose.model("Products", productSchema);

export default Products;
