const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
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

  socket.on("send_message", async ({ audio_url }) => {
    console.log(audio_url);
    // io.emit("receive_message", { audio_url, time_start, time_end });
    // Setelah mengirim pesan, hapus dari antrian
    // try {
    //   const { data, error } = await supabase
    //     .from("queueTable")
    //     .select("*")
    //     .order("id", { ascending: true })
    //     .limit(1);

    //   if (error) throw error;

    //   if (data && data.length > 0) {
    //     const item = data[0];
    //     await supabase.from("queueTable").delete().eq("id", item.id);
    //     console.log(`Item with id ${item.id} removed from queueTable`);
    //   }
    // } catch (error) {
    //   console.error("Error removing item from queueTable:", error.message);
    // }
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
    const nextJsApiUrl = "http://localhost:3000/api/audio";
    try {
      const response = await axios.post(
        nextJsApiUrl,
        { text },
        { responseType: "arraybuffer" }
      );

      // Tentukan lokasi file sementara
      const filePath = path.join(__dirname, "output.mp3");
      fs.writeFileSync(filePath, response.data);

      // Unggah ke Cloudinary
      const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
        resource_type: "auto",
      });

      fs.unlinkSync(filePath);
      // Kirim URL audio ke klien melalui Socket.IO

      io.emit("receive_message", {
        audio_url: cloudinaryResult?.secure_url,
        time_start,
        time_end,
      });

      // Hapus data dari antrian setelah diproses
      await supabase.from("queueTable").delete().eq("id", id);
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
};

setInterval(processQueue, 10000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
