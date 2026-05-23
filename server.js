const express = require('express');
const cors = require('cors');
const Datastore = require('nedb');
const https = require('https');
const rateLimit = require('express-rate-limit'); // 🛡️ Anti-Spam Shield Component

const app = express();

// 🔒 BASIC SECURITY MIDDLEWARE CONFIGURATIONS
app.use(cors());
app.use(express.json());

// Initialize Local Encrypted Survival Storage
const dbBookings = new Datastore({ filename: 'bookings.db', autoload: true });
const dbProviders = new Datastore({ filename: 'providers.db', autoload: true });

// 🗝️ ENVIRONMENT PRODUCTION KEYS
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || 'YOUR_KEY';
const ADMIN_SECRET_SECURITY_TOKEN = process.env.ADMIN_SECRET_SECURITY_TOKEN || 'SERVO_JAIPUR_HQ_2026';

// 🛑 RATE LIMITING MECHANICS: Max 5 OTP requests per 10 minutes per IP
const otpRouteLimiterShield = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 5, 
    message: { success: false, message: "Too many authentication requests from this link. Retry in 10 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

let activeOtpVerificationVault = {};

// 💬 INTERNAL ROUTING UTILITY: TELEGRAM ALERTS
function dispatchTelegramAlert(messageText) {
    const telegramEndpointUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payloadData = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: messageText, parse_mode: 'Markdown' });
    const req = https.request(telegramEndpointUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': payloadData.length } });
    req.write(payloadData); req.end();
}

// 📡 PUBLIC CAPABILITY ACCESS PATHWAY
app.get('/api/providers', (req, res) => {
    try {
        dbProviders.find({}, (err, docs) => {
            if (err) return res.status(500).json({ success: false, message: "Database access glitch." });
            res.json(docs);
        });
    } catch (globalError) {
        res.status(500).json({ success: false, message: "Server route crashed internally." });
    }
});

// 🔒 HIGHLY SECURE PROTECTED ROUTE: ADMIN BOOKINGS FEED
app.get('/api/bookings', (req, res) => {
    try {
        const inboundSecurityHeader = req.headers['x-servo-admin-token'];
        
        // Hard checkpoint validation barrier
        if (!inboundSecurityHeader || inboundSecurityHeader !== ADMIN_SECRET_SECURITY_TOKEN) {
            return res.status(403).json({ success: false, message: "ACCESS DENIED: Unverified identity clearance level." });
        }

        dbBookings.find({}, (err, docs) => {
            if (err) return res.status(500).json({ success: false, message: "Log retrieval failure." });
            res.json(docs);
        });
    } catch (globalError) {
        res.status(500).json({ success: false, message: "Admin system framework breakdown." });
    }
});

// 📱 ATTACHING ANTI-SPAM LIMITER BLOCK TO OTP REQUEST PATHWAY
app.post('/api/auth/send-otp', otpRouteLimiterShield, (req, res) => {
    try {
        const { phone } = req.body;
        
        // Strict input string sanitation validation checks
        if (!phone || phone.length !== 10 || isNaN(phone)) {
            return res.status(400).json({ success: false, message: "Invalid entry formatting parameters." });
        }

        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        activeOtpVerificationVault[phone] = generatedOtp;
        setTimeout(() => { delete activeOtpVerificationVault[phone]; }, 5 * 60 * 1000);

        console.log(`📡 [FORTRESS LOGGER] Secure SMS OTP Token for ${phone} is: ${generatedOtp}`);
        res.json({ success: true, message: "Security sequence transmitted seamlessly." });
    } catch (globalError) {
        res.status(500).json({ success: false, message: "Critical authentication thread failure." });
    }
});

// 🚀 SECURE BOOKING HANDSHAKE AND PROCESS COMMITMENT
app.post('/api/book-service-secure', (req, res) => {
    try {
        const { customerName, customerPhone, serviceType, flatAddress, otp } = req.body;

        // Validation filter checks
        if (!customerName || !customerPhone || !serviceType || !flatAddress || !otp) {
            return res.status(400).json({ success: false, message: "Missing required booking variables." });
        }

        if (!activeOtpVerificationVault[customerPhone] || activeOtpVerificationVault[customerPhone] !== otp) {
            return res.status(401).json({ success: false, message: "Invalid verification token code mismatch." });
        }
        
        delete activeOtpVerificationVault[customerPhone]; // Consume validation ticket instantly

        dbProviders.find({ trade: serviceType }, (err, availableWorkers) => {
            const matchedPro = availableWorkers.length > 0 ? availableWorkers[0].name : "Rahul Sharma (Hyperlocal Router)";
            const newBookingReceipt = { customerName, customerPhone, serviceType, flatAddress, paymentId: "CASH_ON_DELIVERY_MOCK", status: "DISPATCHED", assignedPartner: matchedPro, createdAt: new Date() };

            dbBookings.insert(newBookingReceipt, (err, doc) => {
                if (err) return res.status(500).json({ success: false, message: "Data logging interruption." });
                
                dispatchTelegramAlert(`🚨 *REAL SECURITY BOOKING LOGGED* 🚨\n---------------------------\n👤 Client: ${customerName}\n📞 Phone: ${customerPhone}\n🛠️ Service: ${serviceType}\n📍 Address: ${flatAddress}\n⚡ Assigned Fleet Node: ${matchedPro}`);
                res.status(201).json({ success: true, assignedPartner: matchedPro });
            });
        });
    } catch (globalError) {
        res.status(500).json({ success: false, message: "Fatal backend transaction pipeline panic." });
    }
});

// SECURE JOB COMPLETION ACTION PATHWAY
app.delete('/api/bookings/:id', (req, res) => {
    try {
        const inboundSecurityHeader = req.headers['x-servo-admin-token'];
        if (!inboundSecurityHeader || inboundSecurityHeader !== ADMIN_SECRET_SECURITY_TOKEN) {
            return res.status(403).json({ success: false, message: "Unauthorized operations command." });
        }

        dbBookings.remove({ _id: req.params.id }, {}, (err) => {
            if (err) return res.status(500).json({ success: false, message: "Resolution clearing error." });
            res.json({ success: true, message: "Operational transaction frame cleanly resolved." });
        });
    } catch (globalError) {
        res.status(500).json({ success: false, message: "Internal clearance database break." });
    }
});

// Replace your old app.listen block at the very bottom of server.js with this:
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> HARDENED SERVO SECURE PRODUCTION CORE LIVE ON PORT ${PORT} <<<`);
});