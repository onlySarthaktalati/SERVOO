require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { connectToDatabasePermanentCluster, getDatabaseInstance } = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET_KEY = process.env.JWT_SECRET || "SERVO_CORE_SECRET_2026";

// 🛡️ ADMIN JWT VERIFICATION MIDDLEWARE
function verifyAdminToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ success: false, message: "Admin clearance token missing." });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        if (decoded.role !== 'admin') throw new Error("Invalid role");
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Admin session expired. Please log in again." });
    }
}

// ==========================================
// 🏢 1. ADMIN PLATFORM CLEARANCE
// ==========================================
app.post('/api/admin/secure-login', async (req, res) => {
    try {
        const { secretPassphrase } = req.body;
        if (!secretPassphrase || secretPassphrase.trim() !== "jaipur2026") {
            return res.status(401).json({ success: false, message: "Clearance Mismatch." });
        }
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET_KEY, { expiresIn: '12h' });
        return res.json({ success: true, authToken: token });
    } catch (e) {
        return res.status(500).json({ success: false, message: "Internal server gate exception." });
    }
});

// ==========================================
// 👨‍🔧 2. TECHNICIAN REGISTRATION (ADMIN ONLY)
// ==========================================
app.post('/api/technicians/auth/register', verifyAdminToken, async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { name, phone, password, skill, city } = req.body;

        if (!name || !phone || !password || !skill) {
            return res.status(400).json({ success: false, message: "All partner parameters required." });
        }

        const formattedPhone = phone.trim();
        const existingTech = await db.collection('technicians').findOne({ phone: formattedPhone });
        if (existingTech) {
            return res.status(400).json({ success: false, message: "This mobile number is already registered." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newTech = {
            name: name.trim(),
            phone: formattedPhone,
            password: hashedPassword,
            skill: skill.toUpperCase(),
            city: city ? city.toLowerCase() : "jaipur",
            createdAt: new Date().toISOString()
        };

        await db.collection('technicians').insertOne(newTech);
        return res.status(201).json({ success: true, message: "Technician credentials stored safely." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database registry write failure." });
    }
});

// ==========================================
// 🔑 3. TECHNICIAN JWT LOGIN
// ==========================================
app.post('/api/technicians/auth/login', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ success: false, message: "Missing login parameters." });
        }

        const tech = await db.collection('technicians').findOne({ phone: phone.trim() });
        if (!tech) return res.status(404).json({ success: false, message: "Account profile not found." });

        const isMatch = await bcrypt.compare(password, tech.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials match." });

        const techToken = jwt.sign(
            { techId: tech._id.toString(), phone: tech.phone, name: tech.name },
            JWT_SECRET_KEY,
            { expiresIn: '30d' }
        );

        return res.json({
            success: true,
            techToken: techToken,
            profile: { id: tech._id.toString(), name: tech.name, phone: tech.phone, skill: tech.skill }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Authentication engine error." });
    }
});

// ==========================================
// 📥 4. CUSTOMER BOOKING + GPS + ARRIVAL PIN
// ==========================================
app.post('/api/book-service-secure', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { customerName, customerPhone, serviceType, flatAddress, otp, targetCity, coords } = req.body;

        if (otp !== "1234") {
            return res.status(400).json({ success: false, message: "OTP validation failed." });
        }

        // Generate 4-digit Arrival Verification PIN for customer safety
        const arrivalPin = Math.floor(1000 + Math.random() * 9000).toString();
        const baseFee = serviceType.toUpperCase() === 'AC_REPAIR' ? 450 : 290;

        const newTicket = {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            serviceType: serviceType.toUpperCase(),
            flatAddress: flatAddress.trim(),
            coords: coords || null, // { lat, lng } if GPS shared
            cityContext: targetCity || "jaipur",
            status: "Pending",
            arrivalPin: arrivalPin,
            billingAmount: baseFee,
            assignedPartnerId: "Unassigned",
            assignedPartnerName: "Unassigned",
            assignedPartnerPhone: "",
            timestamp: new Date().toISOString()
        };

        const result = await db.collection('bookings').insertOne(newTicket);
        return res.status(201).json({
            success: true,
            bookingId: result.insertedId.toString(),
            arrivalPin: arrivalPin
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: "Failed to commit service ticket." });
    }
});

// ==========================================
// 📍 5. PUBLIC CUSTOMER ORDER TRACKER
// ==========================================
app.get('/api/bookings/track/:phone', async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const cleanPhone = req.params.phone.trim();
        const orders = await db.collection('bookings')
            .find({ customerPhone: cleanPhone })
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        return res.json({ success: true, orders });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Unable to fetch order status." });
    }
});

// ==========================================
// 🎛️ 6. ADMIN METRICS & DISPATCH MUTATIONS
// ==========================================
app.get('/api/admin/dashboard-metrics', verifyAdminToken, async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const bookings = await db.collection('bookings').find({}).sort({ timestamp: -1 }).toArray();
        const technicians = await db.collection('technicians').find({}).project({ password: 0 }).toArray();

        const realRevenueTotal = bookings
            .filter(b => b.status === 'Completed')
            .reduce((sum, b) => sum + (Number(b.billingAmount) || 290), 0);

        return res.json({
            success: true,
            bookingsQueue: bookings,
            techniciansList: technicians,
            metrics: { revenueTotal: realRevenueTotal }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Metrics streaming error." });
    }
});

app.post('/api/admin/mutate-job-status', verifyAdminToken, async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { bookingId, technicianId, technicianName, technicianPhone, targetStatus } = req.body;

        if (!bookingId || !targetStatus) {
            return res.status(400).json({ success: false, message: "Missing target parameters." });
        }

        const updatePayload = { status: targetStatus };
        if (technicianName) {
            updatePayload.assignedPartnerName = technicianName;
            updatePayload.assignedPartnerId = technicianId || "Direct_Mutation";
            updatePayload.assignedPartnerPhone = technicianPhone || "";
        }

        await db.collection('bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: updatePayload }
        );

        return res.json({ success: true, message: "Dispatch updated." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Dispatch update failed." });
    }
});

// ==========================================
// 📱 7. TECHNICIAN TICKETS & 3-STEP WORKFLOW
// ==========================================
app.get('/api/technicians/jobs/my-tickets', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(403).json({ success: false, message: "Missing token." });
        }

        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET_KEY);
        const db = getDatabaseInstance();

        const personalJobs = await db.collection('bookings')
            .find({ assignedPartnerName: decoded.name })
            .sort({ timestamp: -1 })
            .toArray();

        return res.json({ success: true, queue: personalJobs });
    } catch (err) {
        return res.status(401).json({ success: false, message: "Session expired." });
    }
});

// Step 1: Technician starts travel -> updates customer tracker to "On the Way"
app.post('/api/technicians/jobs/start-travel', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(403).json({ success: false });
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET_KEY);

        const { bookingId } = req.body;
        const db = getDatabaseInstance();

        await db.collection('bookings').updateOne(
            { _id: new ObjectId(bookingId), assignedPartnerName: decoded.name },
            { $set: { status: "On the Way" } }
        );
        return res.json({ success: true, message: "Status updated: On the Way!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed to update travel status." });
    }
});

// Step 2: Technician verifies customer's 4-digit Arrival PIN -> "In Progress"
app.post('/api/technicians/jobs/verify-arrival', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(403).json({ success: false });
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET_KEY);

        const { bookingId, enteredPin } = req.body;
        const db = getDatabaseInstance();

        const job = await db.collection('bookings').findOne({
            _id: new ObjectId(bookingId),
            assignedPartnerName: decoded.name
        });

        if (!job) return res.status(404).json({ success: false, message: "Job not found." });
        if (job.arrivalPin !== enteredPin.trim()) {
            return res.status(400).json({ success: false, message: "Incorrect Arrival PIN. Ask customer for their 4-digit code." });
        }

        await db.collection('bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: { status: "In Progress" } }
        );
        return res.json({ success: true, message: "Arrival verified! Job started." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "PIN verification error." });
    }
});

// Step 3: Technician logs final bill (with spare parts) & closes job -> "Completed"
app.post('/api/technicians/jobs/complete', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(403).json({ success: false });
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET_KEY);

        const { bookingId, finalAmount } = req.body;
        const db = getDatabaseInstance();

        await db.collection('bookings').updateOne(
            { _id: new ObjectId(bookingId), assignedPartnerName: decoded.name },
            { $set: { status: "Completed", billingAmount: Number(finalAmount) || 290 } }
        );
        return res.json({ success: true, message: "Job closed & revenue logged!" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Failed to close ticket." });
    }
});

app.get('/', (req, res) => { res.send('SERVO Production Kernel Online. Engine Grade Stable.'); });

const PORT = process.env.PORT || 3000;
connectToDatabasePermanentCluster().then(() => {
    app.listen(PORT, '0.0.0.0', () => { console.log(`>>> SERVO KERNEL LIVE ON PORT ${PORT} <<<`); });
});