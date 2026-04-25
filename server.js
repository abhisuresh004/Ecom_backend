import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import router from "./routes/userroutes.js";
import productrouter from "./routes/productroutes.js";
import cartrouter from "./routes/cartroute.js";
import orderrouter from "./routes/Orderroute.js";
import wishlistrouter from "./routes/wishlistroute.js";
import adminrouter from "./routes/adminroute.js";
import reviewrouter from "./routes/reviewroutes.js";
import notirouter from "./routes/notificationroute.js";
import addressrouter from "./routes/addressroute.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/users", router);
app.use("/api", productrouter);
app.use("/api/cart", cartrouter);
app.use("/api/orders", orderrouter);
app.use("/api/wishlist", wishlistrouter);
app.use("/api/admin", adminrouter);
app.use("/api/review", reviewrouter);
app.use("/api", notirouter);
app.use("/api", addressrouter);

app.use("/uploads", express.static("uploads"));

// Connect to MongoDB

mongoose
  .connect(
    "mongodb://abhi:abhi123@ac-ddmv3tj-shard-00-00.tohxsdv.mongodb.net:27017,ac-ddmv3tj-shard-00-01.tohxsdv.mongodb.net:27017,ac-ddmv3tj-shard-00-02.tohxsdv.mongodb.net:27017/ecommerce?ssl=true&replicaSet=atlas-vm9y9t-shard-0&authSource=admin&retryWrites=true&w=majority",
  )
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
