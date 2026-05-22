const express = require('express');
const cors = require('cors');
const Datastore = require('nedb');
const https = require('https'); // Native node engine to handle outgoing Telegram API webhooks

const app = express();
app.use(cors());
app.use(express.json());

const dbBookings = new Datastore({ filename: 'bookings.db', autoload: true });
const dbProviders = new Datastore({ filename: 'providers.db', autoload: true });

// 📡 TELEGRAM OPERATIONS CONTROL DESK PORTALS
// Using Environment variables for production hosting safety configurations
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'PASTE_YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'PASTE_YOUR_USER_ID_HERE';

// Helper Function to blast notifications onto your phone lines instantly
function dispatchTelegramAlert(messageText) {
    const telegramEndpointUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payloadData = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: messageText, parse_mode: 'Markdown' });

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': payloadData.length }
    };

    const req = https.request(telegramEndpointUrl, requestOptions, (res) => {
        res.on('data', () => {}); // Consumes data streams cleanly
    });

    req.on('error', (e) => { console.error("Telegram alert delivery timeout exception: ", e); });
    req.write(payloadData);
    req.end();
}

// Seed default technician nodes across Jaipur matrix frames
dbProviders.count({}, (err, count) => {
    if (count === 0) {
        const initialFleet = [
            { name: "Rahul Sharma", trade: "AC Repair", phone: "9829012345", city: "Jaipur", lat: 26.9150, lng: 75.7900 },
            { name: "Amit Verma", trade: "Electrician", phone: "9829054321", city: "Jaipur", lat: 26.9220, lng: 75.7780 },
            { name: "Vikram Singh", trade: "Plumber", phone: "9414098765", city: "Jaipur", lat: 26.8990, lng: 75.8120 }
        ];
        dbProviders.insert(initialFleet);
    }
});

app.get('/api/providers', (req, res) => { dbProviders.find({}, (err, docs) => { res.json(docs); }); });
app.get('/api/bookings', (req, res) => { dbBookings.find({}, (err, docs) => { res.json(docs); }); });

// 🚀 CORE DISPATCH ROUTE LINKED TO LIVE PUSH ALERTS
app.post('/api/book-service', (req, res) => {
    const { customerName, customerPhone, serviceType, flatAddress } = req.body;
    
    const baseLat = 26.9124;
    const baseLng = 75.7873;
    const offsetLat = baseLat + (Math.random() - 0.5) * 0.05;
    const offsetLng = baseLng + (Math.random() - 0.5) * 0.05;

    dbProviders.find({ trade: serviceType }, (err, availableWorkers) => {
        const matchedPro = availableWorkers.length > 0 ? availableWorkers[0].name : "Automated Router System Node";

        const newBookingReceipt = {
            customerName, customerPhone, serviceType, flatAddress,
            paymentId: "PAYID_SIMULATED_SUCCESS_TOKEN",
            lat: offsetLat, lng: offsetLng,
            status: "DISPATCHED", assignedPartner: matchedPro,
            createdAt: new Date()
        };

        dbBookings.insert(newBookingReceipt, (err, doc) => {
            // 🔥 TRIGGER ALIVE JETSTREAM TELEGRAM NOTIFICATION MESSAGE
            const formattingTelegramPayloadString = 
`🚨 *NEW INCOMING JOB COMPLETED* 🚨
--------------------------------------
👤 *Client Name:* ${customerName}
📞 *Handset Line:* ${customerPhone}
🛠️ *Required Core:* ${serviceType}
📍 *Destination Target:* ${flatAddress}
⚡ *Assigned Fleet Node:* ${matchedPro}
--------------------------------------
💻 _Check Telemetry logs on your laptop Admin HQ panel screen frame_`;

            dispatchTelegramAlert(formattingTelegramPayloadString);

            res.status(201).json({ success: true, message: "Booking securely logged and pushed to dispatch systems queue.", data: doc });
        });
    });
});

app.post('/api/register-provider', (req, res) => {
    const { name, trade, phone, city } = req.body;
    const newAssetNode = { name, trade, phone, city, lat: 26.9124 + (Math.random() - 0.5) * 0.04, lng: 75.7873 + (Math.random() - 0.5) * 0.04 };

    dbProviders.insert(newAssetNode, (err, doc) => {
        // 📡 Alert when a new provider registers
        dispatchTelegramAlert(`👷 *NEW FLEET NODE SIGN-UP*\n-------------------\nName: ${name}\nTrade Capability: ${trade}\nPhone String: ${phone}\nBase Hub: ${city}`);
        res.status(201).json({ message: "Workforce matrix registration complete. Node active.", asset: doc });
    });
});

app.delete('/api/bookings/:id', (req, res) => {
    dbBookings.remove({ _id: req.params.id }, {}, (err, numRemoved) => {
        res.json({ message: "Case frame successfully resolved." });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`>>> SERVO OPERATIONS LIVE ON PORT ${PORT} <<<`));