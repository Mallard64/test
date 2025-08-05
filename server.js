const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('./')); 

app.post('/api/gemini', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const apiKey = process.env.VITE_GEMINI_API_KEY;
        
        if (apiKey) {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                return res.status(response.status).json({ 
                    error: errorData.error?.message || 'Gemini API error' 
                });
            }

            const data = await response.json();
            return res.json(data);
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'Local testing server is running!',
        endpoints: {
            gemini: 'POST /api/gemini',
            health: 'GET /'
        }
    });
});

const start = async () => {
    try {
        app.listen(port, () => {
            console.log(`Local testing server running on http://localhost:${port}`);
            console.log('Available endpoints:');
            console.log(`  GET  http://localhost:${port}/`);
            console.log(`  POST http://localhost:${port}/api/gemini`);
            console.log('');
            console.log('API Key status:', process.env.VITE_GEMINI_API_KEY ? 'Found' : 'Not found');
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
};

start();