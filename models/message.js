import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    discussions: [
      {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // STORE only reference IDs
    hashTags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hashtag" }],
  },
  { timestamps: true }
);

// **this is for Unique Conversation Between Two Users**
messageSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
