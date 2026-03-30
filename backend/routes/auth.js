const express = require('express');
const router = express.Router();
const CryptoJS = require('crypto-js');
const User = require('../models/User');

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    throw new Error('SECRET_KEY is not set. Add it to backend/.env');
}

// Encrypt string helper
const encrypt = (text) => CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
const decrypt = (hash) => {
    const bytes = CryptoJS.AES.decrypt(hash, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, fullName, biometricData, faceBiometricData, walletAddress, privateKey } = req.body;
        
        let existingUser = await User.findOne({ 
            $or: [{ username }, { email }]
        });
        if (existingUser) {
            return res.status(400).json({ error: existingUser.username === username ? 'Username taken' : 'Email taken' });
        }

        const encryptedPrivateKey = privateKey ? encrypt(privateKey) : null;

        const newUser = new User({
            username,
            email,
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

// Request Reset Link (Email verification)
router.post('/reset-request', async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();

        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email are required' });
        }

        const user = await User.findOne({
            username: { $regex: new RegExp('^' + username + '$', 'i') }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Legacy compatibility: if no email was stored historically, bind provided recovery email.
        if (!user.email) {
            user.email = email;
            await user.save();
        }

        if ((user.email || '').toLowerCase() !== email) {
            return res.status(404).json({ error: 'User not found with this email' });
        }

        // In a real app with Firebase enabled, you'd do:
        // const actionCodeSettings = { url: 'https://biovault.ngrok-free.dev/reset-biometrics' };
        // await admin.auth().generateSignInWithEmailLink(email, actionCodeSettings);

        console.log(`[FIREBASE SIMULATION] Recovery link sent to ${email} for user ${username}`);
        res.status(200).json({ message: 'Reset email sent!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send reset link' });
    }
});

// Reset Biometrics (Request)
// This would be called by the frontend after Firebase email link verification
router.post('/reset-biometrics', async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const biometricData = req.body.biometricData;
        const faceBiometricData = req.body.faceBiometricData;
        const firebaseToken = req.body.firebaseToken;

        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email are required' });
        }

        if (!biometricData && !faceBiometricData) {
            return res.status(400).json({ error: 'At least one biometric value is required' });
        }

        // 1. In a real app, verify 'firebaseToken' using firebase-admin SDK here
        // const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        // if (decodedToken.email !== email) throw new Error("Email mismatch");

        // 2. Find user and update
        const user = await User.findOne({
            username: { $regex: new RegExp('^' + username + '$', 'i') },
            email: { $regex: new RegExp('^' + email + '$', 'i') }
        });
        if (!user) return res.status(404).json({ error: 'User not found with this email' });

        if (biometricData) user.biometricData = biometricData;
        if (faceBiometricData) user.faceBiometricData = faceBiometricData;

        await user.save();

        res.status(200).json({ message: 'Biometrics updated successfully' });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: 'Failed to reset biometrics' });
    }
});

module.exports = router;
