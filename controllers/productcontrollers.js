import Notification from "../models/notificationmodel.js";
import Products from "../models/productmodel.js";
import Review from "../models/reviewmodel.js";
import mongoose from "mongoose";

export const addProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      category,
      quantity,
      sku,
      mrp,
      warranty,
      processor,
      ram,
      storage,
      battery,
      brand,
    } = req.body;

    const imageurls = req.files.map(
      (file) => `http://localhost:5000/uploads/${file.filename}`,
    );

    const formattedImages = imageurls.map((url) => ({
      url: url,
    }));

    const existingsku = await Products.findOne({ sku: sku });
    if (existingsku) {
      res.status(409).json({
        message: "sku must be unique",
      });
    }

    const productDetails = new Products({
      name,
      price,
      description,
      image: formattedImages,
      category,
      quantity,
      sku,
      mrp,
      warranty,
      processor,
      ram,
      storage,
      battery,
      brand,
    });

    await productDetails.save();

    res.status(201).json({
      message: "Product added successfully",
      product: productDetails,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to add product",
      error: err.message,
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { search, category, brand, sort, minPrice, maxPrice, isFeatured } =
      req.query;

    let filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (isFeatured && isFeatured === "true") {
      filter.isFeatured = isFeatured;
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }

    if (brand) {
      filter.brand = { $regex: brand, $options: "i" };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    let sortOption = {};

    if (sort === "price_asc") {
      sortOption.price = 1;
    } else if (sort === "price_desc") {
      sortOption.price = -1;
    } else if (sort === "newest") {
      sortOption.createdAt = -1;
    }

    const products = await Products.find(filter)
      .populate("category")
      .sort(sortOption);
    if (products.length < -1) {
      res.status(404).json({ message: "No data Found" });
    }
    res.status(200).json(products);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to retrieve products", error: err.message });
  }
};

export const getProductsbyid = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Products.findById(id);
    const reviewData = await Review.findOne({ product: id }).populate(
      "reviews.user",
      "username",
    );

    res.status(200).json({ product, reviewData });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to retrieve product", error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await Products.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to delete product", error: err.message });
  }
};

export const updateproduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,

      category,
      quantity,
      sku,
      mrp,
      warranty,
      processor,
      ram,
      storage,
      battery,
      isFeatured,
      brand,
    } = req.body;

    const { id } = req.params;
    const existingProduct = await Products.findById(id);

    const image =
      req.files && req.files.length > 0
        ? req.files.map(
            (file) => `http://localhost:5000/uploads/${file.filename}`,
          )
        : existingProduct.image.map((img) => img.url);

    const formattedImages = image.map((url) => ({
      url: url,
    }));

    const product = await Products.findByIdAndUpdate(
      id,
      {
        name,
        price,
        description,
        image: formattedImages,
        category,
        quantity,
        sku,
        mrp,
        warranty,
        processor,
        ram,
        storage,
        battery,
        isFeatured,
        brand,
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    res.status(200).json({ message: "Product updated successfully", product });

    if (product.quantity >= 6) {
      if (product.quantity >= 6) {
        await Notification.deleteMany({
          product: id,
          title: { $in: ["Low Stock Alert", "Out of Stock"] },
        });
      }
    }
  } catch (e) {
    res.json({ message: e.message });
  }
};
