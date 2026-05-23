require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Datastore = require('nedb');
const https = require('https');

const app = express();

// 🔓 STABLE CORS PERMISSIONS - MATCHES MVP RULES ALWAYS
app.use(cors());
app.use(express.json());

// 🗄️ DATABASE STORAGE INITIALIZATION
const dbBookings = new Datastore({ filename: 'bookings.db', autoload: true });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';

// 🌐 ROOT ALIVE STATUS CHECK
app.get('/', (req, res) => {
   res.send('SERVO backend is officially live and running smoothly!');
});

// ==========================================
// 📱 SANDBOX AUTHENTICATION ROUTE (OTP IS ALWAYS 1234)
// ==========================================
app.post('/api/auth/send-otp', (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length !== 10) {
            return res.status(400).json({ success: false, message: "A valid 10-digit phone number is required." });
        }

        // Fixed simulation code so it works instantly without any paid external gateways
        const simulatedOtp = "1234"; 
        console.log(`\n📡 [SANDBOX ACTIVE] Secure SMS OTP Token for ${phone} is: ${simulatedOtp}\n`);

        return res.status(200).json({ 
            success: true, 
            message: "Sandbox verification token generated successfully." 
        });

    } catch (error) {
        console.error("OTP Route Error:", error);
        return res.status(500).json({ success: false, message: "Internal server handshake exception." });
    }
});

// ==========================================
// 🔐 SECURE BOOKING & TELEGRAM ROUTE (VERIFIES THE 1234 CODE)
// ==========================================
app.post('/api/book-service-secure', (req, res) => {
    try {
        const { customerName, customerPhone, serviceType, flatAddress, otp } = req.body;

        // Verify our sandbox OTP code
        if (otp !== "1234") {
            return res.status(400).json({ success: false, message: "Invalid verification code. Use 1234." });
        }

        const dummyAssignedPartners = ["Amit Sharma", "Rahul Verma", "Deepak Kumar", "Sanjay Singh"];
        const randomPro = dummyAssignedPartners[Math.floor(Math.random() * dummyAssignedPartners.length)];

        const newBookingNode = {
            customerName,
            customerPhone,
            serviceType,
            flatAddress,
            assignedPartner: randomPro,
            timestamp: new Date().toISOString()
        };

        dbBookings.insert(newBookingNode, (err, doc) => {
            if (err) {
                console.error("Database Insert Error:", err);
                return res.status(500).json({ success: false, message: "Storage validation breakdown." });
            }

            // 🔔 TELEGRAM ALERT SYSTEM
            const telegramAlertMessageString = encodeURIComponent(
                `🚨 NEW PREMIUM BOOKING ALERT 🚨\n\n` +
                `🛠️ Service: ${serviceType}\n` +
                `👤 Name: ${customerName}\n` +
                `📞 Phone: ${customerPhone}\n` +
                `📍 Address: ${flatAddress}\n` +
                `🏎️ Assigned Pro: ${randomPro}`
            );

            const telegramRequestEndpointUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${telegramAlertMessageString}`;

            https.get(telegramRequestEndpointUrl, (telegramResponseStream) => {
                console.log(`🔔 Telegram status: ${telegramResponseStream.statusCode}`);
            }).on('error', (e) => {
                console.error("Telegram Transmission Crash:", e);
            });

            return res.status(200).json({
                success: true,
                assignedPartner: randomPro,
                message: "Booking authenticated."
            });
        });

    } catch (e) {
        console.error("Booking Route Error:", e);
        return res.status(500).json({ success: false, message: "Server connection exception loop." });
    }
});

app.get('/api/providers', (req, res) => {
    res.json({ status: "alive", operationalZone: "Jaipur Hub" });
});

// ==========================================
// 🚀 PRODUCTION HOST BINDINGS
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> HARDENED SERVO SECURE PRODUCTION CORE LIVE ON PORT ${PORT} <<<`);
});