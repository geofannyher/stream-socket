const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const { WebcastPushConnection } = require("tiktok-live-connector");
const path = require("path");
const fs = require("fs");
const app = express();
const mp3info = require("mp3-details");
const determineOutput = require("./cekAudio.js");
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://demo-streamnew.vercel.app",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});
// app.use(express.json());

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

const getAudio = async ({ text, id_audio, userId }) => {
  console.log("audio", userId);
  try {
    // Request ke ElevenLabs API
    const result = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${id_audio}`,
      // `https://api.elevenlabs.io/v1/text-to-speech/9PT7w7JPpD5X2qcOmOEb`,
      {
        text: text,
        model_id:
          id_audio === "IMJSFL2vyX1d82ZUwle7"
            ? "eleven_turbo_v2_5"
            : "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.95,
          style: 0,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          accept: "audio/mpeg",
          "xi-api-key": "17dd999e77442c6c7e1e7733e6dd7af2",
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    // Menyimpan audio ke file lokal
    const audioBuffer = Buffer.from(result.data, "binary");
    const filePath = path.join(__dirname, userId + ".mp3");
    fs.writeFileSync(filePath, audioBuffer);

    const cloudinaryResponse = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      folder: "audio_files",
      public_id: path.parse(filePath).name,
    });

    return { status: 200, url: cloudinaryResponse.secure_url };
  } catch (error) {
    console.error("Error processing audio:", error);
    return "Failed to process audio";
  }
};
const isProcessingMap = {};

io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("authenticate", (userId) => {
    console.log("User authenticated with ID:", userId);
    socket.userId = userId;
    socket.join(userId);
    processQueue(userId);
  });

  let tiktokLiveConnection;
  // Listen to incoming TikTok username
  socket.on("startStream", (username) => {
    console.log(`Starting TikTok Live connection for: ${username}`);
    tiktokLiveConnection = new WebcastPushConnection(username, {
      enableExtendedGiftInfo: true,
    });

    // Connect to TikTok live stream
    tiktokLiveConnection
      .connect()
      .then((state) => {
        console.info(`Connected to roomId ${state.roomId}`);
        socket.emit("connectionSuccess", `Connected to room ${state.roomId}`);
      })
      .catch((err) => {
        console.error("Failed to connect", err);
        socket.emit("connectionError", err.message);
      });

    // Forward comments to the React client
    tiktokLiveConnection.on("chat", (data) => {
      socket.emit("comment", {
        username: data.uniqueId,
        comment: data.comment,
      });
    });

    // Forward gifts to the React client
    tiktokLiveConnection.on("gift", (data) => {
      socket.emit("gift", {
        username: data.uniqueId,
        gift: data.giftName,
      });
    });
  });

  // Listen to stopStream event
  socket.on("stopStream", () => {
    if (tiktokLiveConnection) {
      tiktokLiveConnection.disconnect();
      console.log("Disconnected from TikTok Live");
    }
  });

  // Disconnect handling
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (tiktokLiveConnection) {
      tiktokLiveConnection.disconnect();
    }
  });

  socket.on("audio_finished", () => {
    isProcessingMap[socket.userId] = false; // Tandai bahwa audio telah selesai diputar
    processQueue(socket.userId); // Lanjutkan pemrosesan antrian
  });
});

const processQueue = async (userId) => {
  if (isProcessingMap[userId]) {
    console.log(
      `Audio sedang diputar untuk user ${userId}, menunggu sampai selesai...`
    );
    return;
  }

  isProcessingMap[userId] = true;

  const { data, error } = await supabase
    .from("queueTable")
    .select("*")
    .eq("id_user", userId);

  if (error) {
    console.error("Error fetching data from Supabase:", error);
    isProcessingMap[userId] = false;
    return;
  }

  if (data.length > 0) {
    const dataSort = data.sort((a, b) => a.position - b.position);
    const queueItem = dataSort[0];
    const { id, text, time_start, time_end, id_audio } = queueItem;
    if (text === "ready") {
      console.log("Mengirim hanya durasi...");
      io.to(userId).emit("receive_message", {
        audio_url: "only",
        time_start: Number(time_start),
        time_end: Number(time_end),
      });
      console.log("Durasi terkirim untuk user:", userId);
      await deleteQueueItem(id);
    } else {
      try {
        const res = await getAudio({
          text,
          id_audio,
          userId,
        });

        // cek durasi audionya dari file .mp3
        const durationInfo = mp3info.load(userId + ".mp3");
        const resInfoDuration = determineOutput(durationInfo.duration);

        console.log("url", res?.url, "durasi real", durationInfo.duration);
        io.to(userId).emit("receive_message", {
          audio_url: res?.url,
          time_start: resInfoDuration.time_start,
          time_end: resInfoDuration.time_end,
        });
        console.log("Durasi terkirim untuk user:", userId);

        await deleteQueueItem(id);
      } catch (error) {
        console.error("Error uploading audio file to Cloudinary:", error);
      }
    }
    // Setelah selesai mengirim audio, tunggu sinyal `audio_finished` dari klien sebelum melanjutkan.
  } else {
    console.log("No data in queueTable");
    isProcessingMap[userId] = false;
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

// untuk tes apapun
// app.post("/info-audio", getDuration);

server.listen(5000, () => {
  console.log("Server is running on http://localhost:5000");
});
