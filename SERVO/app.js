// Add this helper object right at the top of your app.js file
const SYSTEM_ADMIN_SECURITY_ROUTING_KEY = 'SERVO_JAIPUR_HQ_2026';

function pullOperationalLogisticsTelemetry() {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/bookings`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-servo-admin-token': SYSTEM_ADMIN_SECURITY_ROUTING_KEY // 🔒 Attaching access pass header
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Unauthorized security clearance.");
        return res.json();
    })
    .then(bookings => {
        const logContainer = document.getElementById('telemetryStreamTarget');
        logContainer.innerHTML = bookings.length === 0 ? '<p style="color:#444; text-align:center; font-size:13px;">No active bookings found.</p>' : '';
        bookings.forEach(b => {
            logContainer.innerHTML += `
                <div class="telemetry-pipeline-card">
                    <h4>${b.customerName} <span class="live-tag">${b.status}</span></h4>
                    <p><b>Service:</b> ${b.serviceType}<br><b>Address:</b> ${b.flatAddress}</p>
                    <button class="resolve-btn" onclick="terminateCaseLog('${b._id}')">Complete Job</button>
                </div>`;
        });
    }).catch(() => {
        triggerToastFeedback("Security validation failed. Access Denied.", true);
    });
}