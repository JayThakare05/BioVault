const express = require('express');
const cors = require('cors');
const axios = require('axios');

const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000/ai/process';
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI is not set. Add it to backend/.env');
    process.exit(1);
}

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');

app.use('/api/auth', authRoutes);
app.use('/api/transaction', transactionRoutes);

app.post('/api/trigger', async (req, res) => {
    console.log('Backend (Node/Express): Received request from Frontend');
    
    try {
        // Forward request to AI Service (FastAPI)
        console.log('Backend (Node/Express): Forwarding request to AI Service...');
        const aiResponse = await axios.post(AI_SERVICE_URL);
        
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
