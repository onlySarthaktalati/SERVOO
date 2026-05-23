// 📡 THE CORRECT ALIGNED LINK (NO TYPOS)
const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};

// Initialize Hyperlocal Map Framework
let mapInstance = L.map('map', { zoomControl: false }).setView([26.9124, 75.7873], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
L.marker([26.9124, 75.7873]).addTo(mapInstance);

// 🧭 DRAWER CONTROL INTERFACE MECHANICS
function toggleNavigationDrawer() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
}

function scrollToSection(elementId) {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
    }
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
    }
}

// 📦 MODAL CONSOLE VISIBILITY CORE
function openDispatchPrompt(serviceTokenString) {
    activeSelectedServiceGlobalType = serviceTokenString;
    document.getElementById('modalServiceTitle').innerText = `Request ${serviceTokenString.replace('_', ' ')}`;
    document.getElementById('dispatchModalWindow').style.display = 'flex';
}

// RESTORED: Explicit close modal function matching your index.html layouts
function closeDispatchPrompt() {
    document.getElementById('dispatchModalWindow').style.display = 'none';
    document.getElementById('bookingOtpVerificationForm').style.display = 'none';
    document.getElementById('bookingSubmissionForm').style.display = 'block';
}

// 🍞 PREMIUM TOAST NOTIFICATION UTILITY
function triggerToastFeedback(messageText, isErrorState = false) {
    const container = document.getElementById('toastNotificationContainer');
    if (!container) return;
    const bubble = document.createElement('div');
    bubble.className = `custom-toast-bubble ${isErrorState ? 'error-toast' : ''}`;
    bubble.innerText = messageText;
    container.appendChild(bubble);
    setTimeout(() => { bubble.remove(); }, 4000);
}

// 📱 ACTION 1: CAPTURE DETAILS AND INITIATE HANDSHAKE
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const actionSubmitBtn = document.getElementById('btnInitiateHandshake');
    
    cachedBookingFormData = {
        customerName: document.getElementById('bookingCustomerName').value,
        customerPhone: document.getElementById('bookingCustomerPhone').value,
        serviceType: activeSelectedServiceGlobalType,
        flatAddress: document.getElementById('bookingFlatAddress').value
    };

    actionSubmitBtn.disabled = true; 
    actionSubmitBtn.innerText = "Transmitting Credentials...";

    fetch(`${CLOUD_BACKEND_API_LINK}/api/auth/send-otp`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phone: cachedBookingFormData.customerPhone })
    })
    .then(res => res.json())
    .then(serverDataResponse => {
        actionSubmitBtn.disabled = false; 
        actionSubmitBtn.innerText = "Send Verification OTP";
        if(serverDataResponse.success) {
            triggerToastFeedback("Verification code triggered! Enter '1234' to verify.");
            document.getElementById('bookingSubmissionForm').style.display = 'none';
            document.getElementById('bookingOtpVerificationForm').style.display = 'block';
        } else {
            triggerToastFeedback(serverDataResponse.message || "Authentication transmission failed.", true);
        }
    })
    .catch((err) => {
        console.error(err);
        actionSubmitBtn.disabled = false; 
        actionSubmitBtn.innerText = "Send Verification OTP";
        triggerToastFeedback("BACKEND CONNECTION OFFLINE. PLEASE RELOAD.", true);
    });
});

// 🔐 ACTION 2: VERIFY CODE AND IMMEDIATELY SHOW SUCCESS PANEL
document.getElementById('bookingOtpVerificationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const verifyBtn = document.getElementById('btnVerifyOtp');
    const typedCode = document.getElementById('bookingVerifiedOtpInput').value;
    
    verifyBtn.disabled = true; 
    verifyBtn.innerText = "Processing...";

    document.getElementById('radarScannerLayer').style.display = 'flex';

    fetch(`${CLOUD_BACKEND_API_LINK}/api/book-service-secure`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            customerName: cachedBookingFormData.customerName,
            customerPhone: cachedBookingFormData.customerPhone,
            serviceType: cachedBookingFormData.serviceType,
            flatAddress: cachedBookingFormData.flatAddress,
            otp: typedCode
        })
    })
    .then(res => res.json())
    .then(finalData => {
        verifyBtn.disabled = false; 
        verifyBtn.innerText = "Verify & Complete Booking";
        document.getElementById('radarScannerLayer').style.display = 'none';
        closeDispatchPrompt();

        if(finalData.success) {
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
            document.getElementById('lblSuccessPro').innerText = finalData.assignedPartner;
            document.getElementById('successScreenOverlay').style.display = 'flex';
            
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
        } else {
            triggerToastFeedback(finalData.message || "Verification code mismatch.", true);
        }
    })
    .catch((err) => {
        console.error(err);
        verifyBtn.disabled = false; 
        verifyBtn.innerText = "Verify & Complete Booking";
        document.getElementById('radarScannerLayer').style.display = 'none';
        closeDispatchPrompt();
        triggerToastFeedback("Connection validation timeout.", true);
    });
});
// ==========================================
// 👑 ADMINISTRATIVE DESK CORE LOGIC CORE
// ==========================================

// Global secret trigger to open admin panel directly from the browser console
window.openAdminHQ = function() {
    document.getElementById('adminDashboardPortal').style.display = 'block';
    // Hide standard app layouts
    if(document.getElementById('hero')) document.getElementById('hero').style.display = 'none';
    if(document.getElementById('services')) document.getElementById('services').style.display = 'none';
    
    fetchAdminLiveQueueRegistry();
};

window.exitAdminConsole = function() {
    document.getElementById('adminDashboardPortal').style.display = 'none';
    if(document.getElementById('hero')) document.getElementById('hero').style.display = 'block';
};

function fetchAdminLiveQueueRegistry() {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/bookings`)
        .then(res => res.json())
        .then(response => {
            if (response.success) {
                renderAdminTableData(response.data);
            }
        })
        .catch(err => console.error("Failed loading dispatch registers:", err));
}

function renderAdminTableData(bookingsArray) {
    const tbody = document.getElementById('adminLiveBookingTableBody');
    tbody.innerHTML = "";

    // Update Counters
    document.getElementById('countTotalBookings').innerText = bookingsArray.length;
    document.getElementById('countPendingBookings').innerText = bookingsArray.filter(b => b.status === "Pending").length;

    if(bookingsArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: #555;">No records found in cloud clusters.</td></tr>`;
        return;
    }

    bookingsArray.forEach(booking => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #1a1a1e";
        
        row.innerHTML = `
            <td style="padding: 15px 20px;">
                <div style="font-weight: 600;">${booking.customerName}</div>
                <div style="color: #666; font-size: 0.85rem;">${booking.customerPhone}</div>
            </td>
            <td style="padding: 15px 20px;"><span style="background: #222; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${booking.serviceType.replace('_', ' ')}</span></td>
            <td style="padding: 15px 20px; color: #ccc; font-size: 0.9rem;">${booking.flatAddress}</td>
            <td style="padding: 15px 20px;">
                <span style="color: ${getStatusColor(booking.status)}; font-weight: 700; font-size: 0.85rem; text-transform: uppercase;">
                    ● ${booking.status}
                </span>
            </td>
            <td style="padding: 15px 20px; color: #00e5ff; font-weight: 500;">${booking.assignedPartner}</td>
            <td style="padding: 15px 20px; text-align: right;">
                <select onchange="executeManualDispatch('${booking._id}', this.value)" style="background: #1a1a1e; color: #fff; border: 1px solid #333; padding: 6px; border-radius: 4px; font-size: 0.85rem; cursor: pointer;">
                    <option value="">-- Route Action --</option>
                    <option value="Amit Sharma">Assign Amit (Electrician)</option>
                    <option value="Rahul Verma">Assign Rahul (Plumber)</option>
                    <option value="Completed">Mark Completed ✅</option>
                    <option value="Cancelled">Cancel Order ❌</option>
                </select>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getStatusColor(status) {
    switch(status) {
        case 'Pending': return '#ffb300';
        case 'Assigned': return '#00e5ff';
        case 'Completed': return '#00e676';
        case 'Cancelled': return '#ff1744';
        default: return '#fff';
    }
}

window.executeManualDispatch = function(bookingId, actionValue) {
    if (!actionValue) return;

    let payload = { bookingId: bookingId };
    
    if (actionValue === "Completed" || actionValue === "Cancelled") {
        payload.technicianName = "Completed / Closed";
        payload.nextStatus = actionValue;
    } else {
        payload.technicianName = actionValue;
        payload.nextStatus = "Assigned";
    }

    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/assign-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            triggerToastFeedback("Dispatch mapping updated successfully!");
            fetchAdminLiveQueueRegistry(); // Hot reload the table data
        }
    })
    .catch(err => console.error("Dispatch operation failed:", err));
};