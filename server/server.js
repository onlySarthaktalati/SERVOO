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
// 🏢 FEATURE 1: ADMIN CONTROL LOG-IN DIRECT BYPASS
// ==========================================
app.post('/api/admin/secure-login', async (req, res) => {
    try {
        const { secretPassphrase } = req.body;
        
        // Direct match check to prevent any cryptographic salt mismatches
        if (secretPassphrase !== "jaipur2026") {
            return res.status(401).json({ success: false, message: "Clearance Denied." });
        }
        
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET_KEY, { expiresIn: '12h' });
        return res.json({ success: true, authToken: token });
    } catch (e) { return res.status(500).json({ success: false }); }
});

// ==========================================
// 👨‍🔧 FEATURE 2: SAVE TECHNICIAN PROFILE (ADMIN CREATION)
// ==========================================
app.post('/api/technicians/auth/register', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { name, phone, password, skill, city } = req.body;

        const existingTech = await db.collection('technicians').findOne({ phone: phone.trim() });
        if (existingTech) return res.status(400).json({ success: false, message: "Phone number already registered." });

        // Salt and hash the technician password for real driver-side production authentication
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
        return res.status(201).json({ success: true, message: "Technician profile saved successfully!" });
    } catch (err) { return res.status(500).json({ success: false, message: "Database registry write fault." }); }
});

// ==========================================
// 🔑 FEATURE 3: TECHNICIAN GATEWAY LOGIN VERIFICATION
// ==========================================
app.post('/api/technicians/auth/login', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { phone, password } = req.body;

        const tech = await db.collection('technicians').findOne({ phone: phone.trim() });
        if (!tech) return res.status(444).json({ success: false, message: "Account profile not found." });

        // Cross-evaluate input text against the saved bcrypt hash string document
        const isMatch = await bcrypt.compare(password, tech.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials match." });

        // Generate the true active driver identity session token
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
    } catch (err) { return res.status(500).json({ success: false, message: "Auth validation sequence exception." }); }
});

// ==========================================
// 📥 FEATURE 4: INTAKE STORE DISPATCH TICKET
// ==========================================
app.post('/api/book-service-secure', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { customerName, customerPhone, serviceType, flatAddress, otp, targetCity } = req.body;
        if (otp !== "1234") return res.status(400).json({ success: false, message: "OTP validation code failed." });

        const newTicket = {
            customerName, customerPhone, serviceType, flatAddress,
            cityContext: targetCity || "jaipur",
            status: "Pending",
            assignedPartner: "Unassigned", // Receives technician assignment mapping
            timestamp: new Date().toISOString()
        };

        const result = await db.collection('bookings').insertOne(newTicket);
        return res.status(201).json({ success: true, bookingId: result.insertedId });
    } catch (e) { return res.status(500).json({ success: false }); }
});

// ==========================================
// 🎛️ FEATURE 5: ASSIGNMENT DISPATCH & CONSOLE METRICS
// ==========================================
app.get('/api/admin/dashboard-metrics', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const bookings = await db.collection('bookings').find({}).sort({ timestamp: -1 }).toArray();
        const technicians = await db.collection('technicians').find({}).toArray();

        // Calculate direct revenue sums based entirely on items flagged Completed
        const totalCalculatedRevenue = bookings
            .filter(b => b.status === 'Completed')
            .reduce((sum, b) => sum + (Number(b.billingAmount) || 350), 0);

        return res.json({ 
            success: true, 
            bookingsQueue: bookings, 
            techniciansList: technicians,
            metrics: { revenueTotal: totalCalculatedRevenue }
        });
    } catch (err) { return res.status(500).json({ success: false }); }
});

app.post('/api/admin/mutate-job-status', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { bookingId, technicianName, targetStatus } = req.body;
        const { ObjectId } = require('mongodb');

        // Permanently bind technician data to the targeted customer booking
        await db.collection('bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: { assignedPartner: technicianName, status: targetStatus } }
        );

        return res.json({ success: true, message: "Job dispatcher transaction executed." });
    } catch (err) { return res.status(500).json({ success: false }); }
});

// 📱 EXCLUSIVE FIELD WORKER TICKET VIEW STREAM
app.get('/api/technicians/jobs/my-tickets', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(403).json({ success: false, message: "No Authorization Token." });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET_KEY);

        const db = getDatabaseInstance();
        
        // Enforce data boundary: fetch ONLY jobs explicitly matching this user's name parameter string
        const personalJobs = await db.collection('bookings')
            .find({ assignedPartner: decoded.name })
            .sort({ timestamp: -1 })
            .toArray();

        return res.json({ success: true, queue: personalJobs });
    } catch (err) { return res.status(401).json({ success: false, message: "Session out." }); }
});

app.get('/', (req, res) => { res.send('SERVO Multi-Tenant Clean Architecture Online.'); });

const PORT = process.env.PORT || 3000;
connectToDatabasePermanentCluster().then(() => {
    app.listen(PORT, '0.0.0.0', () => { console.log(`>>> SERVO MULTI-TENANT CONSOLIDATED SERVER ON PORT ${PORT} <<<`); });
});