import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Proxy for Ollama
app.post('/ollama/api/chat', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:11434/api/chat', req.body, {
            responseType: 'stream'
        });
        response.data.pipe(res);
    } catch (error) {
        console.error('Ollama Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to connect to Ollama' });
    }
});

// Configure Multer for uploads
const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// --- Knowledge Base System ---
import Fuse from 'fuse.js';

// Simple JSON storage
const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.json');
let knowledgeBase = [];

// Load knowledge on startup
if (fs.existsSync(KNOWLEDGE_FILE)) {
    try {
        knowledgeBase = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf-8'));
        console.log(`📚 Loaded ${knowledgeBase.length} knowledge entries`);
    } catch (e) {
        console.error("Failed to load knowledge base:", e);
    }
} else {
    fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify([]));
}

// Endpoint to learn (User Correction)
app.post('/api/knowledge/learn', (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) {
        return res.status(400).json({ error: 'Missing question or answer' });
    }

    const newEntry = {
        id: Date.now().toString(),
        question: question.trim(),
        answer: answer.trim(),
        timestamp: new Date().toISOString()
    };

    knowledgeBase.push(newEntry);

    // Persist
    try {
        fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(knowledgeBase, null, 2));
        console.log(`🧠 Learned: "${question}" -> "${answer}"`);
        res.json({ success: true, entry: newEntry });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save knowledge' });
    }
});

// Endpoint to search (RAG)
app.get('/api/knowledge/search', (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);

    // Configure Fuse for fuzzy matching
    // We look in both question (higher weight) and answer
    const fuse = new Fuse(knowledgeBase, {
        keys: [
            { name: 'question', weight: 0.7 },
            { name: 'answer', weight: 0.3 }
        ],
        threshold: 0.4, // 0.0=exact match, 1.0=match anything
        includeScore: true
    });

    const results = fuse.search(query);
    // Return top 3 matches
    const items = results.slice(0, 3).map(r => r.item);

    res.json(items);
});

// Transcription Endpoint
app.post('/api/transcribe', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const scriptPath = path.join(__dirname, 'transcribe.py');
    const audioPath = req.file.path;

    // Run python script
    const pythonProcess = spawn('python3', [scriptPath, audioPath]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
        // CLEANUP: Delete the uploaded file after processing
        fs.unlink(audioPath, (err) => {
            if (err) console.error("Failed to delete temp file:", err);
        });

        if (code !== 0) {
            console.error(`Python script exited with code ${code}: ${errorString}`);
            return res.status(500).json({ error: 'Transcription failed', details: errorString });
        }

        try {
            const jsonResponse = JSON.parse(dataString);
            res.json(jsonResponse);
        } catch (e) {
            console.error("Failed to parse Python output:", dataString);
            res.status(500).json({ error: 'Invalid response from transcriber' });
        }
    });
});

// --- Web Search Endpoint ---
app.post('/api/web-search', express.json(), (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Missing query" });

    const scriptPath = path.join(__dirname, 'web_search.py');

    // Spawn python script
    const pythonProcess = spawn('python3', [scriptPath, query]);

    let dataBuffer = '';
    let errorBuffer = '';

    pythonProcess.stdout.on('data', (data) => dataBuffer += data.toString());
    pythonProcess.stderr.on('data', (data) => errorBuffer += data.toString());

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Web search failed: ${errorBuffer}`);
            return res.status(500).json({ error: "Search failed", details: errorBuffer });
        }
        try {
            const results = JSON.parse(dataBuffer);
            res.json(results);
        } catch (e) {
            res.status(500).json({ error: "Failed to parse search results" });
        }
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
