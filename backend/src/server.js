
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

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
