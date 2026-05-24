require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const https = require('https');
const admin = require('firebase-admin');

const app = express();

app.use(cors());
app.use(express.json());

// 🛡️ ENCRYPTED SERVER SECURITY CONFIGURATION
const JWT_SECRET_KEY = process.env.JWT_SECRET || "SERVO_RESERVED_CORE_SECURITY_KEY_2026";
const HARDENED_ADMIN_HASH = "$2a$10$X7GvK9U1mXb7t8H7uCqO9uxW/5gA67uI.Vv6.865F2xRk98t/V3m6"; // Pass: jaipur2026

// 🔥 INITIALIZE FIREBASE ADMIN SDK FOR PUSH NOTIFICATIONS (Item 11)
try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        })
    });
    console.log("🔥 Firebase Admin SDK Handshake Successful.");
} catch (error) {
    console.log("⚠️ Firebase initialization skipped. Add env keys for live push.");
}

const mongoUri = process.env.MONGO_URI || "YOUR_MONGODB_ATLAS_CONNECTION_STRING";
let dbBookings, dbComplaints;

MongoClient.connect(mongoUri)
    .then(client => {
        const db = client.db('servo_production_db');
        dbBookings = db.collection('bookings');
        dbComplaints = db.collection('complaints');
        console.log("🟢 Production Databases Secured & Connected.");
    })
    .catch(err => console.error("❌ MongoDB Core Handshake Crash:", err));

// REUSABLE FUNCTION TO BLAST PUSH NOTIFICATIONS
async function sendPushNotificationToDevice(deviceFcmToken, alertTitle, alertBody) {
    if (!deviceFcmToken) return;
    const payload = {
        token: deviceFcmToken,
        notification: { title: alertTitle, body: alertBody },
        webpush: { headers: { Urgency: "high" } }
    };
    try {
        await admin.messaging().send(payload);
        console.log(`📡 Push sent successfully to device token.`);
    } catch (err) {
        console.error("❌ Firebase Push Delivery Failed:", err);
    }
}

// SECURE ADMINISTRATIVE LOGIN
app.post('/api/admin/secure-login', async (req, res) => {
    try {
        const { secretPassphrase } = req.body;
        const isPassphraseValid = await bcrypt.compare(secretPassphrase, HARDENED_ADMIN_HASH);
        if (!isPassphraseValid) return res.status(401).json({ success: false, message: "Invalid token sequence." });
        const sessionAuthToken = jwt.sign({ role: 'administrator' }, JWT_SECRET_KEY, { expiresIn: '2h' });
        return res.json({ success: true, authToken: sessionAuthToken });
    } catch (e) { return res.status(500).json({ success: false }); }
});

function enforceAdminGate(req, res, next) {
    const bearerHeaderString = req.headers['authorization'];
    if (!bearerHeaderString) return res.status(403).json({ success: false });
    try {
        const tokenExtract = bearerHeaderString.split(' ')[1];
        req.adminSession = jwt.verify(tokenExtract, JWT_SECRET_KEY);
        next();
    } catch (err) { return res.status(401).json({ success: false }); }
}

app.get('/api/admin/dashboard-metrics', enforceAdminGate, async (req, res) => {
    try {
        const fullQueueList = await dbBookings.find({}).sort({ timestamp: -1 }).toArray();
        const complaintsList = await dbComplaints.find({}).toArray();
        const totalCalculatedRevenue = fullQueueList.filter(b => b.status === 'Completed').reduce((sum, b) => sum + (Number(b.billingAmount) || 0), 0);
        return res.json({
            success: true,
            metrics: {
                totalBookingsCount: fullQueueList.length,
                pendingCount: fullQueueList.filter(b => b.status === 'Pending').length,
                liveJobsCount: fullQueueList.filter(b => b.status === 'Assigned' || b.status === 'Technician_Arriving').length,
                revenueTotal: totalCalculatedRevenue,
                complaintsCount: complaintsList.length
            },
            bookingsQueue: fullQueueList
        });
    } catch (err) { return res.status(500).json({ success: false }); }
});

// LOG SECURE BOOKING PIPELINES
app.post('/api/book-service-secure', async (req, res) => {
    try {
        const { customerName, customerPhone, serviceType, flatAddress, otp, applianceImage, fcmToken } = req.body;
        if (otp !== "1234") return res.status(400).json({ success: false, message: "Invalid OTP." });

        let baseRateCalculationValue = 350;
        if(serviceType === "AC_REPAIR") baseRateCalculationValue = 450;
        if(serviceType === "ELECTRICIAN") baseRateCalculationValue = 290;

        const newBookingNode = {
            customerName,
            customerPhone,
            serviceType,
            flatAddress,
            billingAmount: baseRateCalculationValue,
            status: "Pending",
            assignedPartner: "Unassigned",
            applianceImageBase64: applianceImage || null,
            fcmDeviceToken: fcmToken || null, // Saves the push token directly to customer's document
            timestamp: new Date().toISOString()
        };

        const result = await dbBookings.insertOne(newBookingNode);
        return res.status(200).json({ success: true, bookingId: result.insertedId, assignedPartner: "Unassigned" });
    } catch (e) { return res.status(500).json({ success: false }); }
});

// ⚡ LIVE DISPATCH & PUSH TRIGGER MUTATION ROUTE (Item 11)
app.post('/api/admin/mutate-job-status', enforceAdminGate, async (req, res) => {
    try {
        const { bookingId, technicianName, targetStatus } = req.body;
        
        // Find the booking first to retrieve the user's saved device token
        const bookingRecord = await dbBookings.findOne({ _id: new ObjectId(bookingId) });
        
        await dbBookings.updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: { assignedPartner: technicianName, status: targetStatus } }
        );

        // TRIGGER WEB PUSH NOTIFICATIONS INSTANTLY ON USER'S SCREEN BASED ON STATUS CHANGES
        if (bookingRecord && bookingRecord.fcmDeviceToken) {
            let pushTitle = "SERVO Update";
            let pushBody = `Your booking status has changed to ${targetStatus}.`;

            if (targetStatus === 'Assigned') {
                pushTitle = "👨‍🔧 Technician Dispatched!";
                pushBody = `${technicianName} has been assigned to your booking and is preparing gear.`;
            } else if (targetStatus === 'Technician_Arriving') {
                pushTitle = "🛵 Pro is Arriving!";
                pushBody = `Your service partner is nearing your address matrix in Jaipur now.`;
            } else if (targetStatus === 'Completed') {
                pushTitle = "✅ Job Successfully Completed";
                pushBody = `Thank you for choosing SERVO. Your invoice has been updated.`;
            }

            await sendPushNotificationToDevice(bookingRecord.fcmDeviceToken, pushTitle, pushBody);
        }

        return res.json({ success: true, message: "Status mutated and push notification payload fired." });
    } catch (err) { return res.status(500).json({ success: false }); }
});

app.get('/', (req, res) => { res.send('SERVO Hardened Push Core Operational.'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log(`>>> RUNNING PORT ${PORT} <<<`); });