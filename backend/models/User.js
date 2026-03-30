const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    pin: { type: String, required: true }, // Ideally hashed/encrypted
    biometricData: { type: String }, // To store fingerprint credential ID
    faceBiometricData: { type: String }, // To store face ID credential
    points: { type: Number, default: 1000 },
    walletAddress: { type: String },
    privateKey: { type: String } // Stored encrypted
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
