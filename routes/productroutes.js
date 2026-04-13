import express from "express";
import {
  getProducts,
  getProductsbyid,
} from "../controllers/productcontrollers.js";

const productrouter = express.Router();

productrouter.get("/products", getProducts);
productrouter.get("/product/:id", getProductsbyid);

export default productrouter;
