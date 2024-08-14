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
  cloud_name: "dp8ita8x5",
  api_key: "198973278215278",
  api_secret: "ivPD6juN2AkJkTOWh-kyRDBxKsw",
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
let isAudioPlaying = false; // Flag untuk melacak status audio

supabase
  .channel("schema-db-changes")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
    },
    (payload) => {
      console.log(payload);
      processQueue();
    }
  )
  .subscribe();

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("audio_finished", () => {
    isAudioPlaying = false;
    processQueue();
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const processQueue = async () => {
  if (isAudioPlaying) {
    console.log("Audio sedang diputar, menunggu hingga selesai...");
    return;
  }
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
    const { id, text, time_start, time_end, queue_num } = queueItem;
    if (text === "ready") {
      const videoLinks = {
        m: [
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1722247337/npdp8uckup8kmvmirenw.mp4",
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1718191923/ykws3r5kce7gh7huvl00.mp4",
        ],
        p: [
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1718247858/mlfrh9zx2jq5sg1ypb5m.mp4",
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1717599946/re63hcu3f2mvalhepxou.mp4",
        ],
        i: [
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1718247858/mlfrh9zx2jq5sg1ypb5m.mp4",
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1717599946/re63hcu3f2mvalhepxou.mp4",
        ],
        n: [
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1718247858/mlfrh9zx2jq5sg1ypb5m.mp4",
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1717599946/re63hcu3f2mvalhepxou.mp4",
        ],
        r: [
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1718247858/mlfrh9zx2jq5sg1ypb5m.mp4",
          "https://res.cloudinary.com/dp8ita8x5/video/upload/v1717599946/re63hcu3f2mvalhepxou.mp4",
        ],
      };
      // Inisialisasi randomVieoUrl dengan default kosong
      const randomIndex = Math.floor(
        Math.random() * videoLinks[queue_num].length
      );

      io.emit("receive_message", {
        video_url: videoLinks[queue_num][randomIndex],
        audioUrl: null,
        time_start,
        time_end,
      });
      const { error: deleteError } = await supabase
        .from("queueTable")
        .delete()
        .eq("id", id);
      if (deleteError) {
        console.error("Error deleting data from Supabase:", deleteError);
      }
      isAudioPlaying = true;
      console.log("Data processed and deleted successfully");
    } else {
      // const nextJsApiUrl = "http://localhost:3000/api/audio";
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
        io.emit("receive_message", {
          audio_url: audioUrl,
          time_start,
          time_end,
        });
        const { error: deleteError } = await supabase
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
    }
  } else {
    console.log("No data in queueTable");
  }
};

server.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});
