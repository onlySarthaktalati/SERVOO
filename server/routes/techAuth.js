const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabaseInstance } = require('../config/db');

const JWT_TECH_SECRET = process.env.JWT_TECH_SECRET || "SERVO_TECHNICIAN_SECURE_TOKEN_RESERVE_2026";

// 📝 1. TECHNICIAN PORTAL REGISTRATION API
router.post('/register', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { phone, password, name, skill, city } = req.body;

        if (!phone || !password || !name || !skill || !city) {
            return res.status(400).json({ success: false, message: "All mandatory profile vectors required." });
        }

        // Enforce absolute field integrity rule: check if duplicate phone exists
        const explicitCheck = await db.collection('technicians').findOne({ phone: phone.trim() });
        if (explicitCheck) {
            return res.status(400).json({ success: false, message: "This phone number is already active on SERVO." });
        }

        // Hash password securely before saving (Item 7 Scale)
        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(password, salt);

        const freshTechProfile = {
            phone: phone.trim(),
            password: encryptedPassword,
            name: name.trim(),
            skill: skill.toUpperCase(), // ELECTRICIAN, PLUMBER
            city: city.toLowerCase(),
            isOnline: false,            // Controlled via their active toggle
            isApproved: false,          // Admin must approve this profile before dispatch acts
            createdAt: new Date().toISOString()
        };

        await db.collection('technicians').insertOne(freshTechProfile);
        return res.status(201).json({ success: true, message: "Registration successful. Pending Admin approval." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Internal server registry error." });
    }
});

// 🔑 2. TECHNICIAN PORTAL LOGIN API (JWT Authentication)
router.post('/login', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { phone, password } = req.body;

        const techDoc = await db.collection('technicians').findOne({ phone: phone.trim() });
        if (!techDoc) {
            return res.status(404).json({ success: false, message: "Technician profile not found." });
        }

        // Verify if Admin has verified this profile layer yet
        if (!techDoc.isApproved) {
            return res.status(403).json({ success: false, message: "Account pending approval verification by SERVO Admin." });
        }

        // Cryptographic cross-match password evaluation
        const passesMatch = await bcrypt.compare(password, techDoc.password);
        if (!passesMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        // Issue unique cryptographic signature payload
        const techToken = jwt.sign(
            { techId: techDoc._id, phone: techDoc.phone, name: techDoc.name },
            JWT_TECH_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            techToken: techToken,
            profile: { name: techDoc.name, phone: techDoc.phone, skill: techDoc.skill }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Authentication sequence drop." });
    }
});

module.exports = router;