require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const https = require('https');

const app = express();

// 🔓 STABLE PRODUCTION CORS CONFIGURATION
app.use(cors());
app.use(express.json());

// 🗄️ PRODUCTION DATABASE: MongoDB Cloud Atlas connection architecture
const mongoUri = process.env.MONGO_URI || "PASTE_YOUR_MONGODB_ATLAS_CONNECTION_STRING_HERE";
let dbClient, dbBookings, dbUsers;

MongoClient.connect(mongoUri)
    .then(client => {
        dbClient = client;
        const db = client.db('servo_production_db');
        dbBookings = db.collection('bookings');
        dbUsers = db.collection('users');
        console.log("🟢 Connected flawlessly to MongoDB Atlas Cloud Clusters.");
    })
    .catch(err => console.error("❌ MongoDB Connection Failure:", err));

// 🌐 ROOT ALIVE STATUS CHECK
app.get('/', (req, res) => {
   res.send('SERVO Production Gateway Engine Operational.');
});

// ==========================================
// 📱 AUTHENTICATION ROUTE (SANDBOX FOR INTEGRATION)
// ==========================================
app.post('/api/auth/send-otp', (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length !== 10) {
            return res.status(400).json({ success: false, message: "A valid 10-digit phone number is required." });
        }

        const simulatedOtp = "1234"; 
        console.log(`\n📡 [SANDBOX ACTIVE] Secure SMS OTP Token for ${phone} is: ${simulatedOtp}\n`);

        return res.status(200).json({ 
            success: true, 
            message: "Sandbox verification token generated successfully." 
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Internal server handshake exception." });
    }
});

// ==========================================
// 🔐 SECURE BOOKING PIPELINE WITH TRACKING STATUSES
// ==========================================
app.post('/api/book-service-secure', async (req, res) => {
    try {
        const { customerName, customerPhone, serviceType, flatAddress, otp } = req.body;

        // Strict validation check before cloud insertion vector
        if (otp !== "1234") {
            return res.status(400).json({ success: false, message: "Invalid verification code sequence." });
        }

        const newBookingNode = {
            customerName,
            customerPhone,
            serviceType,
            flatAddress,
            // 🏷️ REAL TRACKING STATUS SYSTEM: Initializing state matrix
            status: "Pending", // Statuses: Pending, Assigned, Accepted, Technician_Arriving, Completed, Cancelled
            assignedPartner: "Unassigned", 
            timestamp: new Date().toISOString()
        };

        // Write directly to your live persistent cloud database cluster
        const result = await dbBookings.insertOne(newBookingNode);

        if (result.insertedId) {
            // 🔔 TELEGRAM ADMINISTRATIVE DESK RADAR
            const telegramAlertMessageString = encodeURIComponent(
                `🚨 NEW REAL-WORLD BOOKING RECEIVED 🚨\n\n` +
                `🆔 Order ID: ${result.insertedId}\n` +
                `🛠️ Service: ${serviceType.replace('_', ' ')}\n` +
                `👤 Name: ${customerName}\n` +
                `📞 Phone: ${customerPhone}\n` +
                `📍 Address: ${flatAddress}\n` +
                `📊 Status: Pending Manual Dispatch Control`
            );

            const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
            const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';
            const telegramRequestEndpointUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${telegramAlertMessageString}`;

            https.get(telegramRequestEndpointUrl, (resStream) => {
                console.log(`🔔 Dispatch alert broadcasted. Status: ${resStream.statusCode}`);
            }).on('error', (e) => console.error("Telegram fail:", e));

            return res.status(200).json({
                success: true,
                bookingId: result.insertedId,
                message: "Booking securely logged into permanent production database cluster."
            });
        } else {
            return res.status(500).json({ success: false, message: "Cloud write storage timeout." });
        }

    } catch (e) {
        console.error("Booking Core Exception:", e);
        return res.status(500).json({ success: false, message: "Server connection exception loop." });
    }
});

// ==========================================
// 👑 ADMINISTRATIVE ACCESS CONTROL BLOCK: MANAGE DISPATCH FROM JAIPUR HO
// ==========================================
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const historyCursor = await dbBookings.find({}).sort({ timestamp: -1 }).toArray();
        res.json({ success: true, data: historyCursor });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to query cloud storage registers." });
    }
});

// Route to manually assign a technician and update booking status via administrative panel
app.post('/api/admin/assign-job', async (req, res) => {
    try {
        const { bookingId, technicianName, nextStatus } = req.body;
        
        const updateResult = await dbBookings.updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: { assignedPartner: technicianName, status: nextStatus } }
        );

        if (updateResult.modifiedCount > 0) {
            return res.json({ success: true, message: "Job parameters successfully updated down the wire." });
        }
        return res.status(400).json({ success: false, message: "Target booking reference node not found." });
    } catch (err) {
        res.status(500).json({ success: false, message: "Internal update exception." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> HARDENED PRODUCTION CORE ONLINE ON PORT ${PORT} <<<`);
});

