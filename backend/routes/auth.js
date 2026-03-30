const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const User = require('../models/User');

const SECRET_KEY = process.env.SECRET_KEY || 'biovault_super_secret';

// Encrypt string helper
const encrypt = (text) => CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
const decrypt = (hash) => {
    const bytes = CryptoJS.AES.decrypt(hash, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, fullName, biometricData, faceBiometricData, walletAddress, privateKey } = req.body;
        
        let existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ error: 'Username already taken' });

        const encryptedPrivateKey = privateKey ? encrypt(privateKey) : null;

        const newUser = new User({
            username,
            fullName,
            pin: 'biometric_secured', // Legacy placeholder if schema requires it, though ideally we update the schema
            biometricData,
            faceBiometricData,
            walletAddress,
            privateKey: encryptedPrivateKey
        });

        await newUser.save();

        res.status(201).json({ 
            message: 'User registered successfully', 
            user: { 
                username, 
                fullName, 
                points: newUser.points, 
                walletAddress 
            } 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login using Biometrics
router.post('/login', async (req, res) => {
    try {
        const { username, biometricData, faceBiometricData } = req.body;

        // Case-insensitive lookup for safety
        const user = await User.findOne({ username: { $regex: new RegExp('^' + username + '$', 'i') } });
        
        if (!user) return res.status(401).json({ error: 'Invalid username or biometric' });

        let authenticated = false;

        if (biometricData) {
            // WebAuthn/Fingerprint check
            if (user.biometricData && user.biometricData === biometricData) authenticated = true;
        } 
        
        if (!authenticated && faceBiometricData) {
            // Face ID check - comparing the AI descriptor string
            if (user.faceBiometricData && user.faceBiometricData === faceBiometricData) authenticated = true;
        }

        if (!authenticated) return res.status(401).json({ error: 'Invalid biometric verification' });

        res.status(200).json({ 
            message: 'Login successful', 
            user: { 
                username: user.username, 
                fullName: user.fullName, 
                points: user.points, 
                walletAddress: user.walletAddress 
            } 
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Secure authentication processing failed' });
    }
});

// Profile route - ensure user can only access their OWN profile if authenticated (simplified for this demo)
router.get('/profile/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // In a real app, you would check a session/token here
        res.status(200).json({
            username: user.username,
            fullName: user.fullName,
            points: user.points,
            walletAddress: user.walletAddress
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
