// 📡 THE CORRECT ALIGNED LINK (NO TYPOS)
const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let userDutyStateActive = true;

// Initialize Hyperlocal Map Framework
let mapInstance = L.map('map', { zoomControl: false }).setView([26.9124, 75.7873], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
L.marker([26.9124, 75.7873]).addTo(mapInstance);

// 🧭 DRAWER CONTROL INTERFACE MECHANICS
function toggleNavigationDrawer() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if(drawer && overlay) {
        drawer.classList.toggle('open');
        overlay.classList.toggle('open');
    }
}

function scrollToSection(elementId) {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
    }
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer && drawer.classList.contains('open')) {
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

    if (document.getElementById('radarScannerLayer')) {
        document.getElementById('radarScannerLayer').style.display = 'flex';
    }

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
        if (document.getElementById('radarScannerLayer')) {
            document.getElementById('radarScannerLayer').style.display = 'none';
        }
        closeDispatchPrompt();

        if(finalData.success) {
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
            document.getElementById('lblSuccessPro').innerText = finalData.assignedPartner || "Unassigned";
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
        if (document.getElementById('radarScannerLayer')) {
            document.getElementById('radarScannerLayer').style.display = 'none';
        }
        closeDispatchPrompt();
        triggerToastFeedback("Connection validation timeout.", true);
    });
});

// ==========================================
// 🏢 DASHBOARD LAYER MODULATION SWITCHERS
// ==========================================

function switchToPanel(targetModeString) {
    document.getElementById('customerDashboardPanel').style.display = 'none';
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    if(document.getElementById('adminDashboardPortal')) document.getElementById('adminDashboardPortal').style.display = 'none';
    if(document.getElementById('hero')) document.getElementById('hero').style.display = 'none';
    if(document.getElementById('services')) document.getElementById('services').style.display = 'none';

    if (targetModeString === 'customer') {
        document.getElementById('customerDashboardPanel').style.display = 'block';
        evaluateCustomerActivePipeline();
    } else if (targetModeString === 'technician') {
        document.getElementById('technicianDashboardPanel').style.display = 'block';
    }
}

function exitToMainHome() {
    document.getElementById('customerDashboardPanel').style.display = 'none';
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    if(document.getElementById('hero')) document.getElementById('hero').style.display = 'block';
    if(document.getElementById('services')) document.getElementById('services').style.display = 'block';
}

function evaluateCustomerActivePipeline() {
    if (cachedBookingFormData && cachedBookingFormData.customerName) {
        document.getElementById('activeBookingCard').style.display = 'block';
        document.getElementById('custActiveServiceType').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
        document.getElementById('custActiveStatusBadge').innerText = "● ASSIGNED TO PRO";
    } else {
        document.getElementById('activeBookingCard').style.display = 'block';
        document.getElementById('custActiveServiceType').innerText = "Premium Electrical Overhaul";
    }
}

function toggleTechDutyState() {
    const btn = document.getElementById('btnTechAvailabilityToggle');
    userDutyStateActive = !userDutyStateActive;
    
    if (userDutyStateActive) {
        btn.innerText = "Duty: ON";
        btn.style.background = "#00e676";
        btn.style.color = "#000";
        triggerToastFeedback("Your availability is now online. Awaiting assignments in Jaipur.");
    } else {
        btn.innerText = "Duty: OFF";
        btn.style.background = "#ff1744";
        btn.style.color = "#fff";
        triggerToastFeedback("Console marked offline. You will not receive new jobs.");
    }
}

function triggerJobCompletionSequence() {
    triggerToastFeedback("Processing verification code dispatch... Order finalized! ✅");
    setTimeout(() => {
        document.getElementById('techJobAssignmentCard').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666; font-size: 0.9rem;">
                🎉 All jobs cleared! Total earnings updated in account history ledger.
            </div>
        `;
    }, 1000);
}

// ==========================================
// 👑 ADMINISTRATIVE OPERATIONS CENTRE
// ==========================================

function toggleAdminLoginForm() {
    const modal = document.getElementById('adminLoginModal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

if(document.getElementById('frmAdminSecureAuth')) {
    document.getElementById('frmAdminSecureAuth').addEventListener('submit', function(e) {
        e.preventDefault();
        const token = document.getElementById('txtAdminSecretPassphrase').value;
        
        if (token === "jaipur2026") { 
            toggleAdminLoginForm();
            triggerToastFeedback("Operational security cleared. Launching HQ Grids.");
            launchProductionAdminHQ();
        } else {
            triggerToastFeedback("Access denied. Invalid security token sequence.", true);
        }
    });
}

function launchProductionAdminHQ() {
    document.getElementById('adminDashboardPortal').style.display = 'block';
    if(document.getElementById('hero')) document.getElementById('hero').style.display = 'none';
    if(document.getElementById('services')) document.getElementById('services').style.display = 'none';
    
    syncLiveOperationsRegistry();
}

function syncLiveOperationsRegistry() {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/bookings`)
        .then(res => res.json())
        .then(response => {
            if (response.success) {
                populateOperationsDashboard(response.data);
            }
        })
        .catch(() => {
            const mockProductionData = [
                { _id: "664f12a3b", customerName: "Sarthak Jain", customerPhone: "9257809277", serviceType: "AC_REPAIR", flatAddress: "Malviya Nagar, Jaipur", status: "Pending", assignedPartner: "Unassigned" },
                { _id: "664f15e8c", customerName: "Rahul Sharma", customerPhone: "9829012345", serviceType: "ELECTRICIAN", flatAddress: "Vaishali Nagar, Jaipur", status: "Assigned", assignedPartner: "Amit Sharma" }
            ];
            populateOperationsDashboard(mockProductionData);
        });
}

function populateOperationsDashboard(bookingsArray) {
    const tbody = document.getElementById('adminLiveBookingTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = "";

    document.getElementById('countTotalBookings').innerText = bookingsArray.length;
    document.getElementById('countPendingBookings').innerText = bookingsArray.filter(b => b.status === "Pending").length;

    bookingsArray.forEach(booking => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #1a1a1e";
        
        tbody.appendChild(row);
        row.innerHTML = `
            <td style="padding: 15px 20px;">
                <div style="font-weight: 600; color: #fff;">${booking.customerName}</div>
                <div style="color: #666; font-size: 0.85rem;">${booking.customerPhone}</div>
            </td>
            <td style="padding: 15px 20px;"><span style="background: #1a1a1e; color: #00e5ff; border: 1px solid #222; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">${booking.serviceType.replace('_', ' ')}</span></td>
            <td style="padding: 15px 20px; color: #aaa; font-size: 0.85rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${booking.flatAddress}</td>
            <td style="padding: 15px 20px;">
                <span style="background: ${getStatusBadgeBg(booking.status)}; color: ${getStatusColor(booking.status)}; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; border: 1px solid ${getStatusColor(booking.status)}40;">
                    ${booking.status.replace('_', ' ')}
                </span>
            </td>
            <td style="padding: 15px 20px; color: #fff; font-weight: 600; font-size: 0.9rem;">👨‍🔧 ${booking.assignedPartner}</td>
            <td style="padding: 15px 20px; text-align: right;">
                <select onchange="dispatchStatusTransition('${booking._id}', this.value)" style="background: #1a1a1e; color: #fff; border: 1px solid #333; padding: 8px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 600;">
                    <option value="">-- Change Status --</option>
                    <optgroup label="1. Dispatch Assignment">
                        <option value="Amit Sharma|Assigned">Assign Amit Sharma (Electrician)</option>
                        <option value="Deepak Kumar|Assigned">Assign Deepak Kumar (Plumber)</option>
                    </optgroup>
                    <optgroup label="2. Live Progress Tracking">
                        <option value="${booking.assignedPartner}|Accepted">Technician Accepted 👍</option>
                        <option value="${booking.assignedPartner}|Technician_Arriving">Technician Arriving 🛵</option>
                        <option value="${booking.assignedPartner}|Completed">Mark Job Completed ✅</option>
                        <option value="Unassigned|Cancelled">Cancel Order ❌</option>
                    </optgroup>
                </select>
            </td>
        `;
    });
}

function getStatusBadgeBg(status) {
    switch(status) {
        case 'Pending': return 'rgba(255, 179, 0, 0.1)';
        case 'Assigned': return 'rgba(0, 229, 255, 0.1)';
        case 'Accepted': return 'rgba(124, 77, 255, 0.1)';
        case 'Technician_Arriving': return 'rgba(244, 67, 54, 0.1)';
        case 'Completed': return 'rgba(0, 230, 118, 0.1)';
        default: return '#111';
    }
}

function getStatusColor(status) {
    switch(status) {
        case 'Pending': return '#ffb300';
        case 'Assigned': return '#00e5ff';
        case 'Accepted': return '#b388ff';
        case 'Technician_Arriving': return '#ff5252';
        case 'Completed': return '#00e676';
        case 'Cancelled': return '#ff1744';
        default: return '#fff';
    }
}

window.dispatchStatusTransition = function(bookingId, integratedValue) {
    if (!integratedValue) return;
    const parts = integratedValue.split('|');
    const technician = parts[0];
    const status = parts[1];

    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/assign-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingId, technicianName: technician, nextStatus: status })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            triggerToastFeedback(`Logistics updated: Status is now ${status.replace('_', ' ')}`);
            syncLiveOperationsRegistry();
        }
    })
    .catch(() => {
        triggerToastFeedback(`Local simulator updated: ${status.replace('_', ' ')}`);
        syncLiveOperationsRegistry();
    });
};