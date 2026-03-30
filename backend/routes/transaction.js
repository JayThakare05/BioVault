const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Transfer points
router.post('/transfer', async (req, res) => {
    try {
        const { fromUsername, toUsername, amount } = req.body;

        if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

        const sender = await User.findOne({ username: fromUsername });
        const receiver = await User.findOne({ username: toUsername });

        if (!sender) return res.status(404).json({ error: 'Sender not found' });
        if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

        if (sender.points < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Perform transfer
        sender.points -= amount;
        receiver.points += amount;

        // Save users
        await sender.save();
        await receiver.save();

        res.status(200).json({ 
            message: 'Transfer successful', 
            remainingBalance: sender.points 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user points history / balances (simulated via total pts)
router.get('/balance/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.status(200).json({ points: user.points });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
