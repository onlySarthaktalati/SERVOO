const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDatabaseInstance } = require('../config/db');
const { enforceAdminGate } = require('../middleware/auth');

// 📊 1. BOOKING DASHBOARD METRICS ENDPOINT
router.get('/dashboard-metrics', enforceAdminGate, async (req, res) => {
    try {
        const db = getDatabaseInstance();
        
        // Fetch all bookings from MongoDB permanently
        const fullQueueList = await db.collection('bookings').find({}).sort({ timestamp: -1 }).toArray();
        const activeComplaints = await db.collection('complaints').countDocuments();
        
        // Compute real total sales from completed jobs
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
    } catch (err) {
        return res.status(500).json({ success: false, message: "Error loading management dashboard data." });
    }
});

// 👨‍🔧 2. ASSIGN TECHNICIAN AND CHANGE STATUS ENDPOINT
router.post('/mutate-job-status', enforceAdminGate, async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { bookingId, technicianName, targetStatus } = req.body;
        
        // Update booking details permanently in the database
        await db.collection('bookings').updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: { assignedPartner: technicianName, status: targetStatus } }
        );

        // If job is finished, update invoice collection to paid status
        if (targetStatus === "Completed") {
            await db.collection('invoices').updateOne(
                { bookingId: new ObjectId(bookingId) },
                { $set: { paymentStatus: "Paid via UPI / Cash" } }
            );
        }

        return res.json({ success: true, message: "Booking status updated successfully." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Error completing database status update." });
    }
});

// 👨‍🔧 3. NEW SECURE LOCAL TECHNICIAN REGISTRATION
router.post('/register-technician', enforceAdminGate, async (req, res) => {
    try {
        const db = getDatabaseInstance();
        const { techName, techPhone, techSkill, techCity } = req.body;

        const existingTech = await db.collection('technicians').findOne({ techPhone: techPhone });
        if (existingTech) {
            return res.status(400).json({ success: false, message: "This phone number is already registered." });
        }

        const newTechnicianNode = {
            name: techName,
            phone: techPhone,
            skill: techSkill.toUpperCase(), // ELECTRICIAN or PLUMBER
            city: techCity.toLowerCase(),   // jaipur, delhi, mumbai
            status: "Available",            
            bookingsCompleted: 0,
            rating: 5.0,
            registeredAt: new Date().toISOString()
        };

        await db.collection('technicians').insertOne(newTechnicianNode);
        return res.json({ success: true, message: `Successfully registered ${techName} to the database!` });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Database registration error." });
    }
});

module.exports = router;