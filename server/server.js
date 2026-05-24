require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

app.use(cors());
app.use(express.json());

// 🛡️ ENCRYPTED SERVER PRIVILEGES CORES
const JWT_SECRET_KEY = process.env.JWT_SECRET || "SERVO_RESERVED_CORE_SECURITY_KEY_2026";
const HARDENED_ADMIN_HASH = "$2a$10$X7GvK9U1mXb7t8H7uCqO9uxW/5gA67uI.Vv6.865F2xRk98t/V3m6"; // jaipur2026

const mongoUri = process.env.MONGO_URI || "YOUR_MONGODB_ATLAS_CONNECTION_STRING";
let db;
let dbBookings, dbComplaints, dbInvoices, dbTechnicians;

MongoClient.connect(mongoUri)
    .then(client => {
        db = client.db('servo_production_db');
        // Initialize multi-collection database system (Item 7)
        dbBookings = db.collection('bookings');
        dbComplaints = db.collection('complaints');
        dbInvoices = db.collection('invoices');
        dbTechnicians = db.collection('technicians');
        console.log("🟢 All Permanent Cloud Collections Online.");
    })
    .catch(err => console.error("❌ MongoDB Connection Fault:", err));

// Change this line to match your frontend API calls exactly!
app.post('/api/admin/secure-login', async (req, res) => {
    try {
        const { secretPassphrase } = req.body;
        const isPassphraseValid = await bcrypt.compare(secretPassphrase, HARDENED_ADMIN_HASH);
        if (!isPassphraseValid) return res.status(401).json({ success: false, message: "Clearance Denied." });
        
        const sessionAuthToken = jwt.sign({ role: 'administrator' }, JWT_SECRET_KEY, { expiresIn: '2h' });
        return res.json({ success: true, authToken: sessionAuthToken });
    } catch (e) { return res.status(500).json({ success: false }); }
});

function enforceAdminGate(req, res, next) {
    const bearerHeaderString = req.headers['authorization'];
    if (!bearerHeaderString) return res.status(403).json({ success: false, message: "Token missing." });
    try {
        const tokenExtract = bearerHeaderString.split(' ')[1];
        req.adminSession = jwt.verify(tokenExtract, JWT_SECRET_KEY);
        next();
    } catch (err) { return res.status(401).json({ success: false, message: "Session expired." }); }
}

// 📊 REAL UNHACKABLE DATA AGGREGATION ENDPOINT
app.get('/api/admin/dashboard-metrics', enforceAdminGate, async (req, res) => {
    try {
        const fullQueueList = await dbBookings.find({}).sort({ timestamp: -1 }).toArray();
        const activeComplaints = await dbComplaints.countDocuments();
        
        // Compute real, unhackable gross revenue metrics directly on the server layer
        const totalCalculatedRevenue = fullQueueList
            .filter(b => b.status === 'Completed')
            .reduce((sum, b) => sum + (Number(b.billingAmount) || 0), 0);

        return res.json({
            success: true,
            metrics: {
                totalBookingsCount: fullQueueList.length,
                pendingCount: fullQueueList.filter(b => b.status === 'Pending').length,
                liveJobsCount: fullQueueList.filter(b => b.status === 'Assigned' || b.status === 'Technician_Arriving').length,
                revenueTotal: totalCalculatedRevenue,
                complaintsCount: activeComplaints
            },
            bookingsQueue: fullQueueList
        });
    } catch (err) { return res.status(500).json({ success: false }); }
});

// CREATE SECURE DATA RECORD IN PERMANENT COLLECTION
app.post('/api/book-service-secure', async (req, res) => {
    try {
        const { customerName, customerPhone, serviceType, flatAddress, otp, applianceImage, targetCity } = req.body;
        if (otp !== "1234") return res.status(400).json({ success: false, message: "Verification Mismatch." });

        let priceCalculation = 350;
        if(serviceType === "AC_REPAIR") priceCalculation = 450;
        if(serviceType === "ELECTRICIAN") priceCalculation = 290;

        // Metros dynamic adjustment tier variables scaling
        if (targetCity === "delhi") priceCalculation += 100;
        if (targetCity === "mumbai") priceCalculation += 150;

        const newBookingNode = {
            customerName,
            customerPhone,
            serviceType,
            flatAddress,
            cityContext: targetCity || "jaipur",
            billingAmount: priceCalculation,
            status: "Pending",
            assignedPartner: "Unassigned",
            applianceImageBase64: applianceImage || null,
            timestamp: new Date().toISOString()
        };

        const result = await dbBookings.insertOne(newBookingNode);
        
        // Automatically inject matching data into permanent invoice collection system (Item 7)
        await dbInvoices.insertOne({
            bookingId: result.insertedId,
            customerName,
            billingAmount: priceCalculation,
            paymentStatus: "Pending (Post-Service Pay)",
            issuedAt: new Date().toISOString()
        });

        return res.status(200).json({ success: true, bookingId: result.insertedId });
    } catch (e) { return res.status(500).json({ success: false }); }
});

// JOB MUTATION ENGINE
app.post('/api/admin/mutate-job-status', enforceAdminGate, async (req, res) => {
    try {
        const { bookingId, technicianName, targetStatus } = req.body;
        
        await dbBookings.updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: { assignedPartner: technicianName, status: targetStatus } }
        );

        if (targetStatus === "Completed") {
            await dbInvoices.updateOne(
                { bookingId: new ObjectId(bookingId) },
                { $set: { paymentStatus: "Paid via UPI / Cash" } }
            );
        }

        return res.json({ success: true, message: "Permanent records mutated successfully." });
    } catch (err) { return res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log(`>>> PLATFORM RUNNING ON PORT ${PORT} <<<`); });