import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { sendResponse } from "../utils/responseHandler.js";
import dotenv from "dotenv";
dotenv.config();

export const userVerify = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return sendResponse(res, 403, false, "You are not authenticated");
    }
    const token = authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decodedToken.id);
    if (!user) {
      return sendResponse(res, 403, false, "User not found");
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Error verifying customer:", error);
    return sendResponse(res, 401, false, { action: "logout" });
  }
};
