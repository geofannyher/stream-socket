const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const { RealtimeClient } = require("@supabase/realtime-js");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    // origin: "http://localhost:3000",
    origin: "https://demo-streamnew.vercel.app",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

cloudinary.config({
  cloud_name: "dp8ita8x5",
  api_key: "198973278215278",
  api_secret: "ivPD6juN2AkJkTOWh-kyRDBxKsw",
});

// Supabase setup
const supabaseUrl = "https://qdrrapmfxjaelbjhhhzx.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnJhcG1meGphZWxiamhoaHp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE2MzA5MTIsImV4cCI6MjAzNzIwNjkxMn0.hi4ZfzeX96zJgTx7ah4WU6iD_9wTMEpY1e8LC3YGqXA";
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Server is running");
});

io.on("connection", (socket) => {
  console.log("a user connected");

  processQueue();

  socket.on("send_message", async ({ audio_url }) => {
    console.log(audio_url);
  });

  socket.on("audio_finished", () => {
    processQueue();
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const processQueue = async () => {
  // Ambil data pertama dari antrian
  const { data, error } = await supabase
    .from("queueTable")
    .select("*")
    .order("id", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Error fetching data from Supabase:", error);
    return;
  }
  if (data.length > 0) {
    const queueItem = data[0];
    const { id, text, time_start, time_end } = queueItem;
    const nextJsApiUrl = "https://demo-streamnew.vercel.app/api/audio";
    try {
      const response = await axios.post(
        nextJsApiUrl,
        { text },
        { responseType: "arraybuffer" }
      );

      // Tentukan lokasi file sementara
      const filePath = path.join(__dirname, "output.mp3");
      fs.writeFileSync(filePath, response.data);

      const cloudinaryResponse = await cloudinary.uploader.upload(filePath, {
        resource_type: "auto",
        folder: "audio_files",
        public_id: path.parse(filePath).name,
      });

      const audioUrl = cloudinaryResponse.secure_url;

      io.emit("receive_message", { audio_url: audioUrl, time_start, time_end });

      const { data: deletedData, error: deleteError } = await supabase
        .from("queueTable")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Error deleting data from Supabase:", deleteError);
      }

      console.log("Data processed and deleted successfully");
    } catch (error) {
      console.error("Error uploading audio file to Cloudinary:", error);
    }
  } else {
    console.log("No data in queueTable");
  }
};

server.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});
