const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { protect } = require('../middleware/authMiddleware');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper to check API Key
const checkApiKey = (res) => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        res.status(500).json({ 
            error: 'OpenAI API Key is missing or not configured. Please add your key to the backend .env file.' 
        });
        return false;
    }
    return true;
};

// Generate Text (GPT)
router.post('/generate-text', protect, async (req, res) => {
    const { prompt, currentData } = req.body;

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!checkApiKey(res)) return;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant for an SNS card generator. Generate 2 distinct sets of speaker details based on the prompt. Return ONLY a JSON object with a 'results' field containing an array of 2 objects, each with 'name', 'designation', and 'company' fields."
                },
                {
                    role: "user",
                    content: `Current data: ${JSON.stringify(currentData)}. Prompt: ${prompt}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        console.log('GPT Response:', content);
        const generatedData = JSON.parse(content);
        res.json(generatedData.results || []);
    } catch (err) {
        console.error('OpenAI GPT Error Details:', err.message || err);
        res.status(500).json({ 
            error: `OpenAI GPT Error: ${err.message || 'Unknown error'}`,
            details: err.response?.data || null
        });
    }
});

// Generate Background (DALL-E)
router.post('/generate-background', protect, async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!checkApiKey(res)) return;

    try {
        console.log('Generating Background 1...');
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A professional, high-quality, abstract or thematic background for a speaker's social media card. Prompt: ${prompt}. Aspect ratio: 1:1. Style: modern, premium web design style.`,
            n: 1,
            size: "1024x1024",
        });

        console.log('Generating Background 2...');
        const response2 = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Another professional background variation for a speaker's social media card. Prompt: ${prompt}. Aspect ratio: 1:1. Style: modern, premium web design style.`,
            n: 1,
            size: "1024x1024",
        });

        res.json([response.data[0].url, response2.data[0].url]);
    } catch (err) {
        console.error('OpenAI DALL-E Error Details:', err.message || err);
        res.status(500).json({ 
            error: `OpenAI DALL-E Error: ${err.message || 'Unknown error'}`,
            details: err.response?.data || null
        });
    }
});

// chat-assistant (Iterative Design)
router.post('/chat-assistant', protect, async (req, res) => {
    const { message, currentState, history = [] } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });
    if (!checkApiKey(res)) return;

    try {
        console.log('Chat Assistant request received:', message);
        console.log('Current State:', JSON.stringify(currentState));
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert SNS Card Designer. You help users design professional speaker cards.
                    The card has the following state structure:
                    - elements: { name, designation, company, [custom_key]: { text, color, fontSize, fontFamily, fontWeight [300-800], textDecoration [none, underline, overline, capitalize, uppercase], letterSpacing [number], isCustom: true } }
                    - positions: { photo, name, designation, company, [custom_key]: { x, y } } (each has: x, y as 0-1 percentages)
                    - background: (image URL or hex color)
                    - bgPosition: ('center', 'top', 'bottom', 'left', 'right')
                    - bgOverlay: { color, opacity [0-1] }
                    - photoSettings: { size } (use 400-600 for typical resolutions, scale up for larger canvases)
                    
                    The canvas can be in various formats:
                    - Square (1080x1080)
                    - Portrait (1080x1350)
                    - Landscape (1280x720)
                    - Story (1080x1920)
                    
                    When the user asks for changes, respond with a JSON object containing:
                    1. "message": Your friendly conversational reply.
                    2. "updates": A partial object containing ONLY changed fields (elements, positions, background, bgPosition, bgOverlay, photoSettings).
                    
                    Design Rules:
                    - If the background is busy or bright, use a dark \`bgOverlay\` (e.g., #000000 with 0.4 opacity) to ensure text legibility.
                    - You can add NEW text elements by creating unique keys starting with 'custom_' in both \`elements\` and \`positions\`.
                    - Use premium typography: Montserrat/Poppins for modern, Playfair Display for elegant.
                    
                    Example response:
                    {
                      "message": "I've updated the theme to a premium gold and black look!",
                      "updates": {
                        "elements": {
                          "name": { "color": "#FFD700" },
                          "designation": { "color": "#FFFFFF" }
                        },
                        "background": "#000000"
                      }
                    }
                    
                    Always return valid JSON.`
                },
                ...history,
                {
                    role: "user",
                    content: `Current State: ${JSON.stringify(currentState)}. User Request: ${message}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content);
        res.json(result);
    } catch (err) {
        console.error('Chat Assistant Error details:', err);
        const statusCode = err.status || 500;
        const errorMessage = err.message || 'An unknown error occurred in the AI Chat Assistant.';
        
        // Return structured error to frontend
        res.status(statusCode).json({ 
            error: errorMessage,
            type: err.type || 'api_error'
        });
    }
});

module.exports = router;
