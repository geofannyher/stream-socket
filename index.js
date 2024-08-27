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

const getAudio = async ({ text, id_audio }) => {
  try {
    // Request ke ElevenLabs API
    const result = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${id_audio}`,
      {
        text: text,
        model_id: "eleven_multilingual_v2",
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
          "xi-api-key": "YOUR_ELEVENLABS_API_KEY",
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    // Menyimpan audio ke file lokal
    const audioBuffer = Buffer.from(result.data, "binary");
    const filePath = path.join(__dirname, "output.mp3");
    fs.writeFileSync(filePath, audioBuffer);
    return 200;
  } catch (error) {
    console.error("Error processing audio:", error);
    return "Failed to process audio";
  }
};

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
    console.log("Audio sedang diputar, menunggu sampai selesai..."); // Jangan proses jika ada pemrosesan yang sedang berjalan
    return; // Keluar dari fungsi untuk menunggu sampai audio selesai
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
  console.log(data);
  if (data.length > 0) {
    const queueItem = data[0];
    const { id, text, time_start, time_end, id_audio } = queueItem;
    if (text === "ready") {
      console.log("Mengirim audio...");
      io.emit("receive_message", {
        audio_url: "only",
        time_start: Number(time_start),
        time_end: Number(time_end),
      });
      await deleteQueueItem(id);
    } else {
      try {
        const res = await getAudio({ text, id_audio });
        if (res !== 200) {
          console.log(res);
          return;
        }
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
        await deleteQueueItem(id);
      } catch (error) {
        console.error("Error uploading audio file to Cloudinary:", error);
      }
    }
    // Setelah selesai mengirim audio, tunggu sinyal `audio_finished` dari klien sebelum melanjutkan.
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
