const express = require("express");
const cors = require("cors");
const Datastore = require("nedb-promises");

const app = express();
app.use(cors());
app.use(express.json());

// Multi-collection database configuration
const providerDB = Datastore.create({ filename: "providers.db", autoload: true });
const bookingDB = Datastore.create({ filename: "bookings.db", autoload: true });

const SERVICES = [
    { id: 1, name: "Electrician", status: "High Demand", basePrice: 199, rateType: "Visiting Charge" },
    { id: 2, name: "Plumber", status: "Available", basePrice: 149, rateType: "Visiting Charge" },
    { id: 3, name: "AC Repair", status: "Critical Load", basePrice: 299, rateType: "Standard Inspection" }
];

// Pre-configured coordinates for simulation mapping markers (Default: Jaipur points)
const GEO_COORDINATES = {
    "c-1": { lat: 26.9124, lng: 75.7873 }, // Center
    "c-2": { lat: 26.8900, lng: 75.8200 }, // Sector East
    "c-3": { lat: 26.9300, lng: 75.7500 }  // Sector West
};

app.get("/api/services", (req, res) => res.json(SERVICES));

app.get("/api/providers", async (req, res) => {
    try { res.json(await providerDB.find({})); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Upgraded with coordinate mapping logic
app.post("/api/register-provider", async (req, res) => {
    try {
        const { name, trade, phone, city } = req.body;
        if (!name || !trade || !phone) return res.status(400).json({ error: "Missing telemetry parameters" });
        
        // Randomly scatter simulation nodes across the local grid layout
        const keys = Object.keys(GEO_COORDINATES);
        const randomCoords = GEO_COORDINATES[keys[Math.floor(Math.random() * keys.length)]];

        const partner = await providerDB.insert({ 
            name, trade, phone, city, 
            lat: randomCoords.lat, lng: randomCoords.lng,
            status: "Active", timestamp: new Date() 
        });
        res.status(201).json({ success: true, message: "Partner verified & mapped into active grid.", partner });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/book-service", async (req, res) => {
    try {
        const { customerName, customerPhone, serviceType, flatAddress } = req.body;
        if (!customerName || !serviceType || !flatAddress) return res.status(400).json({ error: "Booking telemetry empty" });

        const matchingPartner = await providerDB.findOne({ trade: serviceType, status: "Active" });
        
        // Pin location to map: use partner's location if available, otherwise default fallback center
        const lat = matchingPartner ? matchingPartner.lat : 26.9124;
        const lng = matchingPartner ? matchingPartner.lng : 75.7873;
        const assignedTo = matchingPartner ? matchingPartner.name : "Central Dispatch Pool";

        const booking = await bookingDB.insert({
            customerName, customerPhone, serviceType, flatAddress, lat, lng,
            assignedPartner: assignedTo, status: "DISPATCHED", bookedAt: new Date()
        });

        res.status(201).json({ success: true, message: `Booking Confirmed. Agent ${assignedTo} deployed to coordinates.`, booking });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/bookings", async (req, res) => {
    try { res.json(await bookingDB.find({})); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/bookings/:id", async (req, res) => {
    try {
        await bookingDB.remove({ _id: req.params.id }, {});
        res.json({ success: true, message: "Cleared from central monitor." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(3000, () => console.log(">>> SERVO MAP ENGINE RUNNING ON PORT 3000 <<<"));