import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/user.js";
import { sendResponse } from "../../utils/responseHandler.js";

class AuthController {
  // Registers a new user

  // @route POST /api/auth/register
  async register(req, res) {
    try {
      const { username, email, password } = req.body;

      console.log(req.body);

      // Validate input
      if (!username || !email || !password) {
        return sendResponse(res, 400, false, "All fields are required.");
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendResponse(res, 400, false, "Email already registered.");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Save new user
      const newUser = new User({ username, email, password: hashedPassword });
      await newUser.save();

      return sendResponse(res, 201, true, "User registered successfully.");
    } catch (error) {
      console.log(error);
      return sendResponse(res, 500, false, "Server error.", error);
    }
  }

  /**
   * Logs in a user and generates a auth token.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @returns {Object} JSON response with success status, message, and JWT token.
   *  @route POST /api/auth/login
   */

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return sendResponse(
          res,
          400,
          false,
          "Email and password are required."
        );
      }

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return sendResponse(res, 401, false, "Invalid credentials.");
      }

      // Validate password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return sendResponse(res, 401, false, "Invalid credentials.");
      }

      // Log user data for debugging
      console.log("User found:", user);

      // Generate JWT Token with id and username
      const token = jwt.sign(
        {
          id: user._id,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: 60 * 60 * 24 } // 1 day in seconds
      );

      return sendResponse(res, 200, true, "Login successful.", {
        token,
        user: {
          id: user._id,
          username: user.username,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return sendResponse(res, 500, false, "Server error.", {
        error: error.message,
      });
    }
  }
}

export default new AuthController();
