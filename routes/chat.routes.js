import express from "express";
import { userVerify } from "../middlewares/auth.middleware.js";
import ChatroomController from "../controllers/chat/chatroom.controller.js";
const router = express.Router();

router.get("/all-users", userVerify, ChatroomController.getAllUsers);
router.get("/conversation", userVerify, ChatroomController.getConversation);
router.get("/tags/search", userVerify, ChatroomController.searchTags);
router.get("/users/search", userVerify, ChatroomController.searchUser);
router.post("/tags", userVerify, ChatroomController.createTag);

export default router;
