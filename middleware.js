import jwt from "jsonwebtoken";
import process from "process";
import dotenv from "dotenv";


dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      console.log(req.user);
      next();
    } catch (err) {
      return res.status(401).json(err);
    }
  } else {
    return res.status(401).json({ message: "Authorization header missing" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
};

