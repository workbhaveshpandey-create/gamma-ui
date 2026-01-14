import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Proxy for Ollama (optional, but good to have)
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

// Search Endpoint using DuckDuckGo HTML (No API key needed)
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        console.log(`Searching for: ${query}`);

        // Use html.duckduckgo.com/html/ (works better with POST or accurate headers)
        // Switch to POST to mimic form submission which is often more reliable
        const searchUrl = `https://html.duckduckgo.com/html/`;

        try {
            const response = await axios.post(searchUrl,
                new URLSearchParams({ q: query }).toString(),
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Origin': 'https://html.duckduckgo.com',
                        'Referer': 'https://html.duckduckgo.com/'
                    }
                }
            );

            const $ = cheerio.load(response.data);
            const results = [];

            $('.result').each((i, element) => {
                if (i >= 5) return false; // Limit to top 5 results

                const title = $(element).find('.result__title a').text().trim();
                const link = $(element).find('.result__title a').attr('href');
                const snippet = $(element).find('.result__snippet').text().trim();

                if (title && link) {
                    results.push({
                        title,
                        link,
                        snippet
                    });
                }
            });

            console.log(`Found ${results.length} results`);

            // Fallback: If no results found, try lite.duckduckgo.com
            if (results.length === 0) {
                console.log("No results from HTML version, trying Lite version...");
                // Note: Lite version logic would go here, but let's stick to this for now
                // Usually robust headers fix it.
            }

            res.json({ results });

        } catch (innerError) {
            // Try a simple fallback to GET request if POST fails (sometimes simple is better)
            console.warn("POST failed, trying GET fallback...");
            const simpleUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const response = await axios.get(simpleUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const results = [];
            $('.result').each((i, element) => {
                if (i >= 5) return false;
                const title = $(element).find('.result__title a').text().trim();
                const link = $(element).find('.result__title a').attr('href');
                const snippet = $(element).find('.result__snippet').text().trim();
                if (title && link) {
                    results.push({ title, link, snippet });
                }
            });
            res.json({ results });
        }

    } catch (error) {
        console.error('Search request failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            // console.error('Data:', error.response.data); // Too verbose to log usually
        }
        res.status(500).json({ error: 'Failed to fetch search results' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
