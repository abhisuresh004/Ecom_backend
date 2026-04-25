import express from "express";
import {
  getProducts,
  getProductsbyid,
} from "../controllers/productcontrollers.js";
import { getTopProducts } from "../controllers/admincontroller/analyticscontroller.js";

const productrouter = express.Router();

productrouter.get("/products", getProducts);
productrouter.get("/product/:id", getProductsbyid);
productrouter.get("/analytics/top-products", getTopProducts);

export default productrouter;
