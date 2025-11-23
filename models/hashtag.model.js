import mongoose from "mongoose";

const HashtagSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  count: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
});

const Hashtag = mongoose.model("Hashtag", HashtagSchema);
export default Hashtag;
