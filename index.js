import express from "express";
import connectDB from "./utils/connection.js";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { Server } from "socket.io";
import http from "http";
import { getServerStatusMessage } from "./utils/serverStatus.js";
import SocketHandler from "./sockets/socket.js";
import mainRoutes from "./routes/main.routes.js";
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());

// Database connection
connectDB();

app.use("/api", mainRoutes);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// This allows routes to access the io instance for socket communication
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Root endpoint for server status
app.get("/", (req, res) => {
  res.send(getServerStatusMessage());
});

// Create an instance of SocketHandler
const socketHandler = new SocketHandler(io);

// Use the socket connection authentication middleware
io.use(SocketHandler.socketAuthMiddleware);

// Initialize the socket connection
socketHandler.initialize();

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
