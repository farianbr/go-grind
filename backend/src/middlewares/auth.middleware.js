import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    // Check for token in cookies first, then in Authorization header
    let token = req.cookies.jwt;
    
    if (!token && req.headers.authorization) {
      // Check for Bearer token in Authorization header
      if (req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      }
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized - User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Error in protectRoute middleware: ", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
