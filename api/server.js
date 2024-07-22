const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Change this to your client's origin
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Server is running");
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("send_message", ({ audio_url, video_url }) => {
    console.log(audio_url, video_url);
    io.emit("receive_message", { audio_url, video_url });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
