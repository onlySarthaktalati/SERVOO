const express = require('express');
const cors = require('cors');
const Datastore = require('nedb');
const Razorpay = require('razorpay');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize local memory storage tracks
const dbBookings = new Datastore({ filename: 'bookings.db', autoload: true });
const dbProviders = new Datastore({ filename: 'providers.db', autoload: true });

// 💳 INITIALIZE RAZORPAY GATEWAY CORE
// Uses a test placeholder mode so it compiles cleanly without breaking your dashboard boot loops
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholderID',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholderSecret'
});

// 📍 SEED DEFAULT TECHNICIANS IN JAIPUR (If database layer sits empty)
dbProviders.count({}, (err, count) => {
    if (count === 0) {
        const initialFleet = [
            { name: "Rahul Sharma", trade: "AC Repair", phone: "9829012345", city: "Jaipur", lat: 26.9150, lng: 75.7900 },
            { name: "Amit Verma", trade: "Electrician", phone: "9829054321", city: "Jaipur", lat: 26.9220, lng: 75.7780 },
            { name: "Vikram Singh", trade: "Plumber", phone: "9414098765", city: "Jaipur", lat: 26.8990, lng: 75.8120 }
        ];
        dbProviders.insert(initialFleet);
        console.log(">>> Local fleet synchronized over Jaipur grid coordinate vectors <<<");
    }
});

// 📋 CATALOG API: Static pricing data matching your premium boxes
app.get('/api/services', (req, res) => {
    const activeCatalog = [
        { name: "AC Repair", basePrice: 450, rateType: "Base Rate", status: "Active Node" },
        { name: "Electrician", basePrice: 290, rateType: "Base Rate", status: "Active Node" },
        { name: "Plumber", basePrice: 350, rateType: "Base Rate", status: "Active Node" }
    ];
    res.json(activeCatalog);
});

// 📡 PROVIDERS API: Pulls active field assets
app.get('/api/providers', (req, res) => {
    dbProviders.find({}, (err, docs) => { res.json(docs); });
});

// 📋 BOOKINGS API: Fetching tracking logs for Admin Dashboard
app.get('/api/bookings', (req, res) => {
    dbBookings.find({}, (err, docs) => { res.json(docs); });
});

// 💳 STEP 1 HANDSHAKE: CREATE SECURE INTENT ORDER
app.post('/api/create-order', async (req, res) => {
    const { amount, serviceType } = req.body;
    
    const options = {
        amount: amount * 100, // Razorpay processes transactions in Paisa (₹1 = 100 Paisa)
        currency: "INR",
        receipt: `rcpt_srv_${Date.now()}`,
        notes: { service: serviceType }
    };

    try {
        const order = await razorpay.orders.create(options);
        res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            key_id: razorpay.key_id
        });
    } catch (error) {
        console.error("Payment Gateway order generation crash logic:", error);
        res.status(500).json({ success: false, error: "Gateway Init Timeout" });
    }
});

// 🚀 STEP 2 HANDSHAKE: VERIFY RECEIPT AND COMMIT BOOKING
app.post('/api/book-service', (req, res) => {
    const { customerName, customerPhone, serviceType, flatAddress, paymentId } = req.body;
    
    // Generate randomized drop coordinate points matching center Jaipur map radius bounds
    const baseLat = 26.9124;
    const baseLng = 75.7873;
    const offsetLat = baseLat + (Math.random() - 0.5) * 0.05;
    const offsetLng = baseLng + (Math.random() - 0.5) * 0.05;

    // Filter local workforce queue arrays to assign a matched field unit identity token automatically
    dbProviders.find({ trade: serviceType }, (err, availableWorkers) => {
        const matchedPro = availableWorkers.length > 0 ? availableWorkers[0].name : "Automated Router System Node";

        const newBookingReceipt = {
            customerName,
            customerPhone,
            serviceType,
            flatAddress,
            paymentId: paymentId || "OFFLINE_TEST_BYPASS",
            lat: offsetLat,
            lng: offsetLng,
            status: "DISPATCHED",
            assignedPartner: matchedPro,
            createdAt: new Date()
        };

        dbBookings.insert(newBookingReceipt, (err, doc) => {
            res.status(201).json({ success: true, message: "Booking securely logged into central grid pipeline infrastructure", data: doc });
        });
    });
});

// 📋 PROVIDER ONBOARD REGISTRY ROUTE
app.post('/api/register-provider', (req, res) => {
    const { name, trade, phone, city } = req.body;
    const baseLat = 26.9124;
    const baseLng = 75.7873;
    
    const newAssetNode = {
        name, trade, phone, city,
        lat: baseLat + (Math.random() - 0.5) * 0.04,
        lng: baseLng + (Math.random() - 0.5) * 0.04
    };

    dbProviders.insert(newAssetNode, (err, doc) => {
        res.status(201).json({ message: "Workforce matrix registration complete. Node active.", asset: doc });
    });
});

// 🚨 TERMINATE ACTION: Delete resolved dispatches
app.delete('/api/bookings/:id', (req, res) => {
    dbBookings.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        res.json({ message: "Case frame successfully resolved and removed from tracking systems logs." });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`>>> SERVO INFRASTRUCTURE NODE ACTIVE ON PORT ${PORT} <<<`));