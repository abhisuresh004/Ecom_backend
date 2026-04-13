import express from "express";
import {
  getAlluser,
  getUserbyId,
  blockuser,
  unblockuser,
  deleteUser,
} from "../controllers/admincontroller/admincontroller.js";
import {
  addProduct,
  updateproduct,
  deleteProduct,
} from "../controllers/productcontrollers.js";

import { addCategories,updatecategories,Deletecategories,Getcategories } from "../controllers/admincontroller/categorycontroller.js";
import{updateOrderStatus,getAllOrders,getOrderanalytics,getOrdersperday,getOrderadminById}from "../controllers/ordercontrollers.js"
import { Getallreview,DeleteAllreview,Getadminreview } from "../controllers/reviewcontroller.js";
import { getDashboardData,getRevenueanalytics,getTopProducts } from "../controllers/admincontroller/analyticscontroller.js";
import { verifyToken, adminOnly } from "../middleware.js";
import upload from "../uploadmiddleware.js";

const adminrouter = express.Router();
// user management
adminrouter.get("/users", verifyToken, adminOnly, getAlluser);
adminrouter.get("/users/:id", verifyToken, adminOnly, getUserbyId);
adminrouter.put("/users/block/:id", verifyToken, adminOnly, blockuser);
adminrouter.put("/users/unblock/:id", verifyToken, adminOnly, unblockuser);
adminrouter.delete("/users/:id", verifyToken, adminOnly, deleteUser);

// product management
adminrouter.post("/product", verifyToken, adminOnly,upload.array("image",5) ,addProduct);
adminrouter.put("/product/:id",verifyToken,adminOnly,upload.array("image",5),updateproduct)
adminrouter.delete("/product/:id", verifyToken, adminOnly, deleteProduct);

// category management

adminrouter.post("/category", verifyToken, adminOnly, addCategories);
adminrouter.get("/category", Getcategories);
adminrouter.put("/category/:id", verifyToken, adminOnly, updatecategories);
adminrouter.delete("/category/:id", verifyToken, adminOnly, Deletecategories);

// order management

adminrouter.get("/order", verifyToken, adminOnly, getAllOrders);
adminrouter.get("/order/analytics", verifyToken, adminOnly, getOrderanalytics);
adminrouter.get("/order/perday", verifyToken, adminOnly, getOrdersperday);
adminrouter.get("/order/:id", verifyToken, adminOnly, getOrderadminById);
adminrouter.put("/order/:id", verifyToken, adminOnly, updateOrderStatus);

// review management

adminrouter.get("/review", verifyToken, adminOnly, Getallreview);
adminrouter.get("/review/:productId", verifyToken, adminOnly,Getadminreview );
adminrouter.delete("/review/:id", verifyToken, adminOnly, DeleteAllreview);

// analytics management

adminrouter.get("/analytics/dashboard", verifyToken, adminOnly, getDashboardData);
adminrouter.get("/analytics/revenue", verifyToken, adminOnly, getRevenueanalytics);
adminrouter.get("/analytics/top-products", verifyToken, adminOnly, getTopProducts);



export default adminrouter;
