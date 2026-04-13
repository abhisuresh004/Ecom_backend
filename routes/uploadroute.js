import express from "express";
import upload from "../uploadmiddleware.js";

const uploadrouter = express.Router();

uploadrouter.post("/upload", upload.single("image"), (req, res) => {
  res.json({
    success: true,
    imageUrl: `http://localhost:5000/uploads/${req.file.filename}`,
  });
});

export default uploadrouter;