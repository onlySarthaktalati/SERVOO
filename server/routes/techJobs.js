const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDatabaseInstance } = require('../config/db');

const JWT_TECH_SECRET = process.env.JWT_TECH_SECRET || "SERVO_TECHNICIAN_SECURE_TOKEN_RESERVE_2026";

// Security lock middle tier to extract token parameters safely
function enforceTechGate(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ success: false, message: "Access token missing." });

    try {
        const structuralToken = authHeader.split(' ')[1];
        req.techSession = jwt.verify(structuralToken, JWT_TECH_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }
}

// 📱 3. ACTIVE ASSIGNED JOBS QUERY STREAM (Technician sees ONLY their jobs)
router.get('/my-tickets', enforceTechGate, async (req, res) => {
    try {
        const db = getDatabaseInstance();
        
        // Query database filtering by the exact technician's name/phone verified from their secure JWT token
        const personalJobQueue = await db.collection('bookings')
            .find({ assignedPartner: req.techSession.name })
            .sort({ timestamp: -1 })
            .toArray();

        return res.json({ success: true, queue: personalJobQueue });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed to pull job records stream." });
    }
});

// 🟢 4. DUTY AVAILABILITY TOGGLE STATUS ACTION
router.post('/toggle-duty', enforceTechGate, async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { statusState } = req.body; // true = Online, false = Offline

        await db.collection('technicians').updateOne(
            { phone: req.techSession.phone },
            { $set: { isOnline: statusState } }
        );

        return res.json({ success: true, message: `Duty status switched to ${statusState ? 'ONLINE' : 'OFFLINE'}.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed to process availability change." });
    }
});

module.exports = router;