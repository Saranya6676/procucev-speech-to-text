
const express = require("express");
const cors = require("cors");
const db = require("./config/db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Test backend
app.get("/", (req, res) => {
  res.send("Speech-to-Text Backend is running!");
});

// GET: Fetch all transcriptions
app.get("/api/transcriptions", (req, res) => {
  const sql = "SELECT * FROM transcriptions ORDER BY created_at DESC";

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
});

// POST: Save a new transcription
app.post("/api/transcriptions", (req, res) => {
  const { title, transcript, language } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({
      message: "Transcript is required",
    });
  }

  const sql = `
    INSERT INTO transcriptions (title, transcript, language)
    VALUES (?, ?, ?)
  `;

  db.query(
    sql,
    [
      title || "Untitled transcription",
      transcript,
      language || "auto",
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        message: "Transcription saved successfully",
        id: result.insertId,
      });
    }
  );
});

// PUT: Update a transcription
app.put("/api/transcriptions/:id", (req, res) => {
  const { title, transcript, language } = req.body;
  const { id } = req.params;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({
      message: "Transcript is required",
    });
  }

  const sql = `
    UPDATE transcriptions
    SET title = ?, transcript = ?, language = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [title || "Untitled transcription", transcript, language || "auto", id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Transcription not found",
        });
      }

      res.json({ message: "Transcription updated successfully" });
    }
  );
});

// DELETE: Delete a transcription
app.delete("/api/transcriptions/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    "DELETE FROM transcriptions WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: "Transcription not found",
        });
      }

      res.json({ message: "Transcription deleted successfully" });
    }
  );
}); 


 // Create a short-lived Gemini token for the frontend
app.post("/api/gemini/token", async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      message: "Gemini API key is not configured",
    });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(
          Date.now() + 30 * 60 * 1000
        ).toISOString(),
        newSessionExpireTime: new Date(
          Date.now() + 60 * 1000
        ).toISOString(),
        liveConnectConstraints: {
          model: "gemini-3.5-transcribe-live",
          config: {
            responseModalities: ["TEXT"],
            inputAudioTranscription: {
              languageCodes: [],
            },
          },
        },
      },
    });

    res.json({ token: token.name });
  } catch (error) {
    console.error("Gemini token error:", error.message);

    res.status(500).json({
      message: "Could not create Gemini session token",
    });
  }
});


// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
