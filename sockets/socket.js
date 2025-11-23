import jwt from "jsonwebtoken";
import Message from "../models/message.js";
import Hashtag from "../models/hashtag.model.js";

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map();
    this.typingUsers = new Map();
  }

  initialize() {
    this.io.on("connection", (socket) => {
      const userId = socket.user?.id;

      if (userId) {
        this.onlineUsers.set(userId, socket.id);
        this.io.emit("userStatus", { userId, status: "online" });
      }

      socket.on("joinChatroom", (chatroomId) => {
        this.joinChatroom(socket, chatroomId);
      });

      socket.on("sendMessage", (data) => {
        this.sendMessage(socket, data);
        if (data.receiverId) {
          this.handleTypingStatus(socket, {
            receiverId: data.receiverId,
            isTyping: false,
          });
        }
      });

      socket.on("typing", (data) => {
        this.handleTypingStatus(socket, data);
      });

      socket.on("disconnect", () => {
        this.handleDisconnect(socket);
      });
    });
  }

  joinChatroom(socket, chatroomId) {
    socket.join(chatroomId);
    const [user1, user2] = chatroomId.split("_");
    const otherUserId = socket.user?.id === user1 ? user2 : user1;
    const isOnline = this.onlineUsers.has(otherUserId);
    socket.emit("userStatus", {
      userId: otherUserId,
      status: isOnline ? "online" : "offline",
    });
  }

  /**
   * Process hashtags - create new or increment existing
   * @param {string[]} hashtagNames - Array of hashtag names (without #)
   * @returns {Promise<string[]>} - Array of hashtag ObjectIds
   */
  async processHashtags(hashtagNames) {
    if (!hashtagNames || hashtagNames.length === 0) return [];

    const hashtagIds = [];

    for (const name of hashtagNames) {
      const tagName = name.toLowerCase().trim();
      if (!tagName) continue;

      try {
        // Use findOneAndUpdate with upsert for atomic operation
        const hashtag = await Hashtag.findOneAndUpdate(
          { name: tagName },
          {
            $inc: { count: 1 },
            $setOnInsert: { name: tagName, createdAt: new Date() },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );

        hashtagIds.push(hashtag._id);
      } catch (error) {
        console.error(`Error processing hashtag "${tagName}":`, error);
      }
    }

    return hashtagIds;
  }

  /**
   * Send message with hashtag support
   */
  async sendMessage(socket, data) {
    try {
      const { text, receiverId, hashtags = [], mentions = [] } = data;
      const senderId = socket.user?.id;

      if (!text || !receiverId) {
        return socket.emit("messageError", { error: "Invalid message data" });
      }

      // Process hashtags (create/increment)
      const hashtagIds = await this.processHashtags(hashtags);

      // Generate chatroom ID
      const chatroomId =
        senderId < receiverId
          ? `${senderId}_${receiverId}`
          : `${receiverId}_${senderId}`;

      // Find or create conversation
      let conversation = await Message.findOne({
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      });

      if (!conversation) {
        conversation = new Message({
          senderId,
          receiverId,
          discussions: [],
          hashTags: [],
        });
      }

      // Create new message entry
      const newMessage = {
        senderId,
        message: text, // Plain text only
        createdAt: new Date(),
      };

      conversation.discussions.push(newMessage);

      // Add new hashtag IDs (avoid duplicates)
      if (hashtagIds.length > 0) {
        const existingIds = conversation.hashTags.map((id) => id.toString());
        const newIds = hashtagIds.filter(
          (id) => !existingIds.includes(id.toString())
        );
        conversation.hashTags.push(...newIds);
      }

      await conversation.save();

      // Emit message to chatroom
      this.io.to(chatroomId).emit("message", {
        senderId,
        receiverId,
        text, // Plain text
        hashtags,
        mentions,
        createdAt: newMessage.createdAt,
      });

      console.log(`Message sent: ${senderId} -> ${receiverId}`);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("messageError", { error: "Failed to send message" });
    }
  }

  handleTypingStatus(socket, data) {
    const { receiverId, isTyping } = data;
    const senderId = socket.user?.id;

    if (!receiverId || typeof isTyping !== "boolean") return;

    const chatroomId =
      senderId < receiverId
        ? `${senderId}_${receiverId}`
        : `${receiverId}_${senderId}`;

    const typingKey = `${senderId}_${receiverId}`;
    if (isTyping) {
      this.typingUsers.set(typingKey, true);
    } else {
      this.typingUsers.delete(typingKey);
    }

    this.io.to(chatroomId).emit("typingStatus", { userId: senderId, isTyping });
  }

  handleDisconnect(socket) {
    const userId = socket.user?.id;
    if (userId) {
      this.onlineUsers.delete(userId);
      for (const [key] of this.typingUsers) {
        if (key.startsWith(`${userId}_`)) {
          this.typingUsers.delete(key);
        }
      }
      this.io.emit("userStatus", { userId, status: "offline" });
    }
  }

  static async socketAuthMiddleware(socket, next) {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  }
}

export default SocketHandler;
