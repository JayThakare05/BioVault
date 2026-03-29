const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.post('/api/trigger', async (req, res) => {
    console.log('Backend (Node/Express): Received request from Frontend');
    
    try {
        // Forward request to AI Service (FastAPI)
        console.log('Backend (Node/Express): Forwarding request to AI Service...');
        const aiResponse = await axios.post('http://localhost:8000/ai/process');
        
        console.log('Backend (Node/Express): Received response from AI Service');
        res.status(200).json({
            message: 'Pipeline complete!',
            ai_service_response: aiResponse.data
        });
    } catch (error) {
        console.error('Backend (Node/Express): Error calling AI Service:', error.message);
        res.status(500).json({ error: 'Failed to communicate with AI Service' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
