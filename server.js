const express = require("express");
const cors = require("cors");
const Datastore = require("nedb-promises");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize two isolated local database storage sets
const providerDB = Datastore.create({ filename: "providers.db", autoload: true });
const bookingDB = Datastore.create({ filename: "bookings.db", autoload: true });

const SERVICES = [
    { id: 1, name: "Electrician", status: "High Demand", basePrice: 199, rateType: "Visiting Charge" },
    { id: 2, name: "Plumber", status: "Available", basePrice: 149, rateType: "Visiting Charge" },
    { id: 3, name: "AC Repair", status: "Critical Load", basePrice: 299, rateType: "Standard Inspection" }
];

// 1. Core Meta Services Endpoint
app.get("/api/services", (req, res) => res.json(SERVICES));

// 2. Fetch All Registered Workers
app.get("/api/providers", async (req, res) => {
    try { res.json(await providerDB.find({})); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Register a Field Partner
app.post("/api/register-provider", async (req, res) => {
    try {
        const { name, trade, phone, city, experience } = req.body;
        if (!name || !trade || !phone) return res.status(400).json({ error: "Missing telemetry" });
        
        const partner = await providerDB.insert({ name, trade, phone, city, experience, status: "Active", timestamp: new Date() });
        res.status(201).json({ success: true, message: "Partner verified & deployed.", partner });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Create a Live Dispatch Booking Request
app.post("/api/book-service", async (req, res) => {
    try {
        const { customerName, customerPhone, serviceType, flatAddress } = req.body;
        if (!customerName || !serviceType || !flatAddress) return res.status(400).json({ error: "Booking metadata empty" });

        // Automated dispatch matchmaking logic: find an active partner on the roster
        const matchingPartner = await providerDB.findOne({ trade: serviceType, status: "Active" });
        const assignedTo = matchingPartner ? matchingPartner.name : "System Dispatch Pool";

        const booking = await bookingDB.insert({
            customerName, customerPhone, serviceType, flatAddress,
            assignedPartner: assignedTo, status: "DISPATCHED", bookedAt: new Date()
        });

        res.status(201).json({ success: true, message: `Booking Confirmed. Agent ${assignedTo} deployed.`, booking });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Fetch All Live Bookings (For Admin Radar)
app.get("/api/bookings", async (req, res) => {
    try { res.json(await bookingDB.find({})); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Delete a Database Booking Record (Clear Admin Dashboard logs)
app.delete("/api/bookings/:id", async (req, res) => {
    try {
        await bookingDB.remove({ _id: req.params.id }, {});
        res.json({ success: true, message: "Cleared from central monitor." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3000, () => console.log(">>> SERVO BACKEND CORE ONLINE ON PORT 3000 <<<"));