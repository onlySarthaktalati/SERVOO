require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectToDatabasePermanentCluster, getDatabaseInstance } = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET_KEY = process.env.JWT_SECRET || "SERVO_CORE_SECRET_2026";

// ==========================================
// 🏢 FEATURE 1: ADMIN SECURE PLATFORM AUTH
// ==========================================
const HARDENED_ADMIN_HASH = "$2a$10$X7GvK9U1mXb7t8H7uCqO9uxW/5gA67uI.Vv6.865F2xRk98t/V3m6"; // jaipur2026

app.post('/api/admin/secure-login', async (req, res) => {
    try {
        const { secretPassphrase } = req.body;
        const isValid = await bcrypt.compare(secretPassphrase, HARDENED_ADMIN_HASH);
        if (!isValid) return res.status(401).json({ success: false, message: "Clearance Denied." });
        
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET_KEY, { expiresIn: '12h' });
        return res.json({ success: true, authToken: token });
    } catch (e) { return res.status(500).json({ success: false }); }
});

// ==========================================
// 👨‍🔧 FEATURE 2: SAVE TECHNICIAN ACCOUNT (ADMIN SIDE)
// ==========================================
app.post('/api/technicians/auth/register', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { name, phone, password, skill, city } = req.body;

        const existingTech = await db.collection('technicians').findOne({ phone: phone.trim() });
        if (existingTech) return res.status(400).json({ success: false, message: "Phone number already registered." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newTech = {
            name: name.trim(),
            phone: phone.trim(),
            password: hashedPassword,
            skill: skill.toUpperCase(),
            city: city.toLowerCase(),
            createdAt: new Date().toISOString()
        };

        await db.collection('technicians').insertOne(newTech);
        return res.status(201).json({ success: true, message: "Technician created successfully!" });
    } catch (err) { return res.status(500).json({ success: false, message: "DB write error." }); }
});

// ==========================================
// 🔑 FEATURE 3: TECHNICIAN LOGIN VERIFICATION (PHONE + PASS)
// ==========================================
app.post('/api/technicians/auth/login', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { phone, password } = req.body;

        const tech = await db.collection('technicians').findOne({ phone: phone.trim() });
        if (!tech) return res.status(404).json({ success: false, message: "Account not found." });

        const isMatch = await bcrypt.compare(password, tech.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials." });

        // Generate a real JWT token for the driver session
        const techToken = jwt.sign(
            { techId: tech._id, phone: tech.phone, name: tech.name },
            JWT_SECRET_KEY,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            techToken: techToken,
            profile: { name: tech.name, phone: tech.phone, skill: tech.skill }
        });
    } catch (err) { return res.status(500).json({ success: false, message: "Auth fault." }); }
});

// ==========================================
// 📥 FEATURE 4: CUSTOMER APP DISPATCH INTAKE
// ==========================================
app.post('/api/book-service-secure', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { customerName, customerPhone, serviceType, flatAddress, otp, targetCity } = req.body;
        if (otp !== "1234") return res.status(400).json({ success: false, message: "Invalid OTP." });

        const newTicket = {
            customerName, customerPhone, serviceType, flatAddress,
            cityContext: targetCity || "jaipur",
            status: "Pending",
            assignedPartner: "Unassigned", // Stores technician's Name or ID when assigned
            timestamp: new Date().toISOString()
        };

        const result = await db.collection('bookings').insertOne(newTicket);
        return res.status(201).json({ success: true, bookingId: result.insertedId });
    } catch (e) { return res.status(500).json({ success: false }); }
});

// ==========================================
// 🎛️ FEATURE 5: ASSIGN JOBS & METRICS STREAM
// ==========================================
app.get('/api/admin/dashboard-metrics', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const bookings = await db.collection('bookings').find({}).sort({ timestamp: -1 }).toArray();
        const technicians = await db.collection('technicians').find({}).toArray();

        return res.json({ success: true, bookingsQueue: bookings, techniciansList: technicians });
    } catch (err) { return res.status(500).json({ success: false }); }
});

app.post('/api/admin/mutate-job-status', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { bookingId, technicianName, targetStatus } = req.body;
        const { ObjectId } = require('mongodb');

        // Store technician ID or Name flat on the booking document
        await db.collection('bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: { assignedPartner: technicianName, status: targetStatus } }
        );

        return res.json({ success: true, message: "Job assigned successfully." });
    } catch (err) { return res.status(500).json({ success: false }); }
});

// 📱 TECHNICIAN JOB STREAM ENDPOINT (Sees ONLY his jobs)
app.get('/api/technicians/jobs/my-tickets', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(403).json({ success: false });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET_KEY);

        const db = getDatabaseInstance();
        const personalJobs = await db.collection('bookings')
            .find({ assignedPartner: decoded.name })
            .sort({ timestamp: -1 })
            .toArray();

        return res.json({ success: true, queue: personalJobs });
    } catch (err) { return res.status(401).json({ success: false }); }
});

app.get('/', (req, res) => { res.send('SERVO Clean Kernel Engine Live.'); });

const PORT = process.env.PORT || 3000;
connectToDatabasePermanentCluster().then(() => {
    app.listen(PORT, '0.0.0.0', () => { console.log(`>>> SERVO RUNNING ON PORT ${PORT} <<<`); });
});