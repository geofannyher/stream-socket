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
    // origin: "http://localhost:3000",
    origin: "https://demo-streamnew.vercel.app",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

cloudinary.config({
  cloud_name: "dcd1jeldi",
  api_key: "677169959341991",
  api_secret: "9sGegD3sMGpuR9_mi1NFlTdJrTI",
});

// Supabase setup
const supabaseUrl = "https://raudgqgetssjclogeaex.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdWRncWdldHNzamNsb2dlYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjMxMDIwOTAsImV4cCI6MjAzODY3ODA5MH0.32lHuM9Q_yuFK19HoqhfjX4Urr5xeXy5UVvTdbl8p9o";

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Server is running");
});

let isProcessing = false; // Flag untuk melacak status pemrosesan

// Mendeteksi perubahan pada Supabase
supabase
  .channel("schema-db-changes")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
    },
    () => {
      if (!isProcessing) {
        processQueue();
      }
    }
  )
  .subscribe();

console.log("status", isProcessing);
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("audio_finished", () => {
    isProcessing = false; // Tandai bahwa audio telah selesai diputar
    processQueue(); // Lanjutkan pemrosesan antrian
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const processQueue = async () => {
  if (isProcessing) {
    console.log("masih proses, tunggu sebentar..."); // Jangan proses jika ada pemrosesan yang sedang berjalan
  }

  isProcessing = true; // Tandai bahwa pemrosesan sedang berjalan

  const { data, error } = await supabase
    .from("queueTable")
    .select("*")
    .order("id", { ascending: true })
    .limit(1); // Ambil data pertama dari antrian
  if (error) {
    console.error("Error fetching data from Supabase:", error);
    isProcessing = false; // Reset flag jika terjadi kesalahan
    return;
  }
  if (data.length > 0) {
    const queueItem = data[0];
    const { id, text, time_start, time_end, queue_num } = queueItem;

    if (text === "ready") {
      //   const timeData = [
      //     {
      //       time_start_video: 80,
      //       time_end_video: 90,
      //     },
      //     {
      //       time_start_video: 100,
      //       time_end_video: 120,
      //     },
      //   ];

      //   const randomIndex = Math.floor(Math.random() * timeData.length);
      //   const { time_end_video, time_start_video } = timeData[randomIndex];
      console.log(time_start, time_end);
      io.emit("receive_message", {
        audioUrl: null,
        time_start: Number(time_start),
        time_end: Number(time_end),
      });

      await deleteQueueItem(id); // Hapus item setelah diproses
    } else {
      try {
        // const nextJsApiUrl = "http://localhost:3000/api/audio";
        const nextJsApiUrl = "https://demo-streamnew.vercel.app/api/audio";
        const response = await axios.post(
          nextJsApiUrl,
          { text },
          { responseType: "arraybuffer" }
        );
        const filePath = path.join(__dirname, "output.mp3");
        fs.writeFileSync(filePath, response.data);
        const cloudinaryResponse = await cloudinary.uploader.upload(filePath, {
          resource_type: "auto",
          folder: "audio_files",
          public_id: path.parse(filePath).name,
        });
        const audioUrl = cloudinaryResponse.secure_url;
        console.log(time_start, time_end, "ini teks");

        io.emit("receive_message", {
          audio_url: audioUrl,
          time_start,
          time_end,
        });

        await deleteQueueItem(id); // Hapus item setelah diproses
      } catch (error) {
        console.error("Error uploading audio file to Cloudinary:", error);
      }
    }
  } else {
    console.log("No data in queueTable");
    isProcessing = false; // Reset flag jika tidak ada data
  }
};

// Fungsi untuk menghapus item dari queueTable
const deleteQueueItem = async (id) => {
  const { error: deleteError } = await supabase
    .from("queueTable")
    .delete()
    .eq("id", id);
  if (deleteError) {
    console.error("Error deleting data from Supabase:", deleteError);
  }
  console.log("Data processed and deleted successfully");
};

server.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});
