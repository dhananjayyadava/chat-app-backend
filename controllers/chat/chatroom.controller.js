import mongoose from "mongoose";
import User from "../../models/user.js";
import { sendResponse } from "../../utils/responseHandler.js";
import Message from "../../models/message.js";
import Hashtag from "../../models/hashtag.model.js";

class ChatroomController {
  // Get conversation between current user and another user
  //   GET /api/chat/conversation
  async getConversation(req, res) {
    try {
      const senderId = req.user.id;
      const { receiverId } = req.query;

      if (!receiverId) {
        return res.status(400).json({ message: "Receiver ID is required" });
      }

      // Find conversation between the two users
      const conversation = await Message.findOne({
        senderId: { $in: [senderId, receiverId] },
        receiverId: { $in: [senderId, receiverId] },
      });

      if (!conversation) {
        return res.json({ discussions: [] });
      }

      // Return discussions array
      return res.json({ discussions: conversation.discussions });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET /api/chat/all-users
  async getAllUsers(req, res) {
    try {
      const users = await User.find({ _id: { $ne: req.user?.id } }).select(
        "-password"
      ); // Exclude logged-in user
      sendResponse(res, 200, true, "Users retrieved successfully", users);
    } catch (error) {
      console.error("Error fetching users:", error);
      sendResponse(res, 500, false, "Internal server error");
    }
  }
  // @mention search
  async searchUser(req, res) {
    try {
      const { q } = req.query;
      const currentUserId = req.user.id;

      const searchQuery = { _id: { $ne: currentUserId } };

      if (q?.trim()) {
        searchQuery.$or = [
          { username: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ];
      }

      const users = await User.find(searchQuery)
        .select("_id username email avatar")
        .limit(10)
        .lean();

      res.json({ success: true, results: users });
    } catch (error) {
      console.error("User search error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // create or increment hashtag
  async createTag(req, res) {
    try {
      const { name } = req.body;
      const tagName = name.toLowerCase().trim();

      const hashtag = await Hashtag.findOneAndUpdate(
        { name: tagName },
        {
          $inc: { count: 1 },
          $setOnInsert: { name: tagName },
        },
        {
          upsert: true,
          new: true,
        }
      );
      res.json({ success: true, hashtag });
    } catch (error) {
      console.error("Tag create error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // search hashtag suggestions
  async searchTags(req, res) {
    try {
      const { q } = req.query;

      const searchQuery = q?.trim()
        ? { name: { $regex: q, $options: "i" } }
        : {};

      const tags = await Hashtag.find(searchQuery)
        .select("_id name count")
        .sort({ count: -1 })
        .limit(10)
        .lean();

      res.json({ success: true, results: tags });
    } catch (error) {
      console.error("Tag search error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

export default new ChatroomController();
