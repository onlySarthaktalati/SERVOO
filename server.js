const express = require('express');
const cors = require('cors');
const Datastore = require('nedb');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const dbBookings = new Datastore({ filename: 'bookings.db', autoload: true });
const dbProviders = new Datastore({ filename: 'providers.db', autoload: true });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || 'YOUR_KEY';

let activeOtpVerificationVault = {};

function dispatchTelegramAlert(messageText) {
    const telegramEndpointUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payloadData = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: messageText, parse_mode: 'Markdown' });
    const req = https.request(telegramEndpointUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': payloadData.length } });
    req.write(payloadData); req.end();
}

function sendLiveSmsOtp(targetMobile, generatedOtpCode) {
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_API_KEY}&variables_values=${generatedOtpCode}&route=otp&numbers=${targetMobile}`;
    https.get(url, (res) => {}).on('error', (e) => { console.error("SMS Engine Failure:", e); });
}

app.get('/api/providers', (req, res) => { dbProviders.find({}, (err, docs) => { res.json(docs); }); });
app.get('/api/bookings', (req, res) => { dbBookings.find({}, (err, docs) => { res.json(docs); }); });

// 📡 TRIGGER REAL SMS OTP AT BOOKING STAGE
app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.length !== 10) return res.status(400).json({ message: "Invalid handset string." });

    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    activeOtpVerificationVault[phone] = generatedOtp;
    setTimeout(() => { delete activeOtpVerificationVault[phone]; }, 5 * 60 * 1000);

    sendLiveSmsOtp(phone, generatedOtp);
    console.log(`📡 Booking Validation OTP for ${phone} is: ${generatedOtp}`);
    res.json({ success: true });
});

// 🚀 VERIFY AND IMMEDIATELY COMMIT THE BOOKING DISPATCH
app.post('/api/book-service-secure', (req, res) => {
    const { customerName, customerPhone, serviceType, flatAddress, otp } = req.body;

    // Validate the OTP before creating the booking record
    if (!activeOtpVerificationVault[customerPhone] || activeOtpVerificationVault[customerPhone] !== otp) {
        return res.status(401).json({ success: false, message: "Invalid OTP Token Mismatch." });
    }
    
    delete activeOtpVerificationVault[customerPhone]; // Clear token cleanly

    dbProviders.find({ trade: serviceType }, (err, availableWorkers) => {
        const matchedPro = availableWorkers.length > 0 ? availableWorkers[0].name : "Automated Router Node";
        const newBookingReceipt = { customerName, customerPhone, serviceType, flatAddress, paymentId: "PAYID_MOCK_SUCCESS", status: "DISPATCHED", assignedPartner: matchedPro, createdAt: new Date() };

        dbBookings.insert(newBookingReceipt, (err, doc) => {
            dispatchTelegramAlert(`🚨 *REAL WORLD DISPATCH ORDER* 🚨\n---------------------------\n👤 Client: ${customerName}\n📞 Phone: ${customerPhone}\n🛠️ Service: ${serviceType}\n📍 Address: ${flatAddress}\n⚡ Assigned Fleet: ${matchedPro}`);
            res.status(201).json({ success: true, message: "Verified job dispatched!" });
        });
    });
});

app.post('/api/register-provider', (req, res) => {
    const { name, trade, phone, city } = req.body;
    const newAssetNode = { name, trade, phone, city, lat: 26.9124, lng: 75.7873 };
    dbProviders.insert(newAssetNode, () => { res.status(201).json({ message: "Workforce node registered." }); });
});

app.delete('/api/bookings/:id', (req, res) => { dbBookings.remove({ _id: req.params.id }, {}, () => { res.json({ message: "Case resolved." }); }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`>>> SERVO LIVE ON PORT ${PORT} <<<`));