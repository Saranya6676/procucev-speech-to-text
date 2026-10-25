import { useState, useEffect } from 'react'

import './App.css'
import axios from "axios";
import SpeechRecorder from "./components/SpeechRecorder";


const speechLanguageCodes = {
  English: "en-IN",
  Tamil: "ta-IN",
  Hindi: "hi-IN",
  Malayalam: "ml-IN",
  Kannada: "kn-IN",
  Telugu: "te-IN",
  Other: "en-IN",
};

const API_URL = "http://localhost:5000/api/transcriptions";

function App() {
  const [transcriptions, setTranscriptions] = useState([]);
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("English");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Fetch all transcriptions from the backend
  const fetchTranscriptions = async () => {
    try {
      setError("");

      const response = await axios.get(API_URL);
      setTranscriptions(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Cannot connect to the backend. Check whether it is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch records when the component first loads
  useEffect(() => {
    fetchTranscriptions();
  }, []);

  // Clear the form
  const resetForm = () => {
    setTitle("");
    setTranscript("");
    setLanguage("English");
    setEditingId(null);

  };



  // Add a new transcription or update an existing one
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!transcript.trim()) {
      setError("Please enter transcription text.");
      return;
    }

    try {
      setSaving(true);


      const payload = {
        title: title.trim() || "Untitled transcription",
        transcript: transcript.trim(),
        language,
      };

      if (editingId !== null) {
        await axios.put(`${API_URL}/${editingId}`, payload);
        setMessage("Transcription updated successfully!");
      } else {
        await axios.post(API_URL, payload);
        setMessage("Transcription saved successfully!");
      }
      setTimeout(() => {
        setMessage("");
      }, 4000);
      resetForm();
      await fetchTranscriptions();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to save transcription."
      );
    } finally {
      setSaving(false);
    }
  };

  // Load a record into the form for editing
  const handleEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || "");
    setTranscript(item.transcript || "");
    setLanguage(item.language || "English");
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete a transcription
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transcription?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await axios.delete(`${API_URL}/${id}`);

      if (editingId === id) {
        resetForm();
      }

      setMessage("Transcription deleted successfully!");
      await fetchTranscriptions();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to delete transcription."
      );
    }
  };

  return (
    <main className="app">
      <header className="page-header">
        <div>
          <p className="eyebrow">TRANSCRIPTION WORKSPACE</p>
          <h1>Speech-to-Text Dashboard</h1>
          
        </div>


        <div className="record-count">
          <span>{transcriptions.length}</span>
          <small>Saved records</small>
        </div>
      </header>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{editingId !== null ? "Edit transcription" : "New transcription"}</h2>
            <p>
              {editingId !== null
                ? "Update the selected record."
                : "Enter text below to save it to your database."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meeting notes"
            />
          </div>

          <div className="form-group">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Tamil">Tamil</option>
              <option value="Hindi">Hindi</option>
              <option value="Malayalam">Malayalam</option>
              <option value="Kannada">Kannada</option>
              <option value="Telugu">Telugu</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Live speech transcription</label>


            <SpeechRecorder
              language={speechLanguageCodes[language] || "en-IN"}
              initialTranscript={transcript}
              onTranscriptChange={setTranscript}
            />
          </div>

          <div className="form-group">
            <label htmlFor="transcript">Transcription text</label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type or paste transcription text here..."
              rows={5}
              required
            />
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Update transcription"
                  : "Save transcription"}
            </button>

            {editingId !== null && (
              <button
                className="secondary-button"
                type="button"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="records-section">
        <div className="section-heading records-heading">
          <div>
            <h2>Saved transcriptions</h2>
            <p>Your records are loaded from the MySQL database.</p>
          </div>

          <button
            className="secondary-button"
            type="button"
            onClick={fetchTranscriptions}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Loading transcriptions...</div>
        ) : transcriptions.length === 0 ? (
          <div className="empty-state">
            <h3>No transcriptions yet</h3>
            <p>Save your first transcription using the form above.</p>
          </div>
        ) : (
          <div className="records-grid">
            {transcriptions.map((item) => (
              <article className="transcription-card" key={item.id}>
                <div className="card-top">
                  <span className="language-badge">
                    {item.language || "Unknown"}
                  </span>
                  <span className="record-id">#{item.id}</span>
                </div>

                <h3>{item.title || "Untitled transcription"}</h3>

                <p className="transcript-text">{item.transcript}</p>

                <div className="record-date">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString()
                    : "Date unavailable"}
                </div>

                <div className="card-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </button>

                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;


