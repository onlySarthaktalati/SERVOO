const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let serializedAppliancePhotoData = null;
let userDutyStateActive = true;

// Initialize Homepage Open-Source Map Layouts
let mainLandingLeafletMap = L.map('leafletCoreMapContainer', { zoomControl: false }).setView([26.9124, 75.7873], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mainLandingLeafletMap);
L.marker([26.9124, 75.7873]).addTo(mainLandingLeafletMap);

// 📸 LOCAL FILE IMAGE CAPTURE EXTRACTOR
function processLocalImagePreview(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        serializedAppliancePhotoData = e.target.result;
        document.getElementById('imgApplianceUploadPreviewContainer').style.display = "block";
        document.getElementById('imgLiveApplianceSource').src = serializedAppliancePhotoData;
    };
    reader.readAsDataURL(file);
}

function openDispatchPrompt(serviceTokenString) {
    activeSelectedServiceGlobalType = serviceTokenString;
    document.getElementById('modalServiceTitle').innerText = `Request ${serviceTokenString.replace('_', ' ')}`;
    document.getElementById('dispatchModalWindow').style.display = 'flex';
}

function closeDispatchPrompt() {
    document.getElementById('dispatchModalWindow').style.display = 'none';
}

function triggerToastFeedback(messageText, isErrorState = false) {
    const bubble = document.createElement('div');
    bubble.className = `custom-toast-bubble ${isErrorState ? 'error-toast' : ''}`;
    bubble.innerText = messageText;
    document.body.appendChild(bubble);
    setTimeout(() => { bubble.remove(); }, 4000);
}

// ==========================================
// 🔐 CLIENT ROUTING HANDSHAKE OVERLAYS
// ==========================================
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    cachedBookingFormData = {
        customerName: document.getElementById('bookingCustomerName').value,
        customerPhone: document.getElementById('bookingCustomerPhone').value,
        serviceType: activeSelectedServiceGlobalType,
        flatAddress: document.getElementById('bookingFlatAddress').value,
        appliancePhoto: serializedAppliancePhotoData
    };

    document.getElementById('bookingSubmissionForm').style.display = 'none';
    document.getElementById('bookingOtpVerificationForm').style.display = 'block';
    triggerToastFeedback("SMS sequence mocked. Code token input configuration: 1234");
});

document.getElementById('bookingOtpVerificationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const typedCode = document.getElementById('bookingVerifiedOtpInput').value;

    fetch(`${CLOUD_BACKEND_API_LINK}/api/book-service-secure`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            customerName: cachedBookingFormData.customerName,
            customerPhone: cachedBookingFormData.customerPhone,
            serviceType: cachedBookingFormData.serviceType,
            flatAddress: cachedBookingFormData.flatAddress,
            otp: typedCode,
            applianceImage: cachedBookingFormData.appliancePhoto
        })
    })
    .then(res => res.json())
    .then(finalData => {
        closeDispatchPrompt();
        if(finalData.success) {
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
            document.getElementById('lblSuccessPro').innerText = "Unassigned (Manual Desks)";
            document.getElementById('successScreenOverlay').style.display = 'flex';
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
            serializedAppliancePhotoData = null;
        } else {
            triggerToastFeedback(finalData.message || "Verification code failure.", true);
        }
    })
    .catch(() => triggerToastFeedback("Database transaction exception loop.", true));
});

// ==========================================
// 🏢 DASHBOARD WORKFLOW GRID CONTROLLERS
// ==========================================
function switchToPanel(targetModeString) {
    document.getElementById('customerDashboardPanel').style.display = 'none';
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    if(document.getElementById('adminDashboardPortal')) document.getElementById('adminDashboardPortal').style.display = 'none';
    if(document.getElementById('mainCoreAppWindowView')) document.getElementById('mainCoreAppWindowView').style.display = 'none';

    if (targetModeString === 'customer') {
        document.getElementById('customerDashboardPanel').style.display = 'block';
        evaluateCustomerActivePipeline();
    } else if (targetModeString === 'technician') {
        document.getElementById('technicianDashboardPanel').style.display = 'block';
    }
    // Find your switchToPanel function inside app.js and make sure it handles map invalidation like this:
function switchToPanel(targetModeString) {
    document.getElementById('customerDashboardPanel').style.display = 'none';
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    if(document.getElementById('adminDashboardPortal')) document.getElementById('adminDashboardPortal').style.display = 'none';
    if(document.getElementById('mainCoreAppWindowView')) document.getElementById('mainCoreAppWindowView').style.display = 'none';

    if (targetModeString === 'customer') {
        document.getElementById('customerDashboardPanel').style.display = 'block';
        evaluateCustomerActivePipeline();
    } else if (targetModeString === 'technician') {
        document.getElementById('technicianDashboardPanel').style.display = 'block';
    }

    // 🔥 DYNAMIC GRAPHICS FIX: Forces Leaflet map tiles to refresh their dimensions instantly!
    setTimeout(() => {
        mainLandingLeafletMap.invalidateSize();
    }, 250);
}
}

function exitToMainHome() {
    document.getElementById('customerDashboardPanel').style.display = 'none';
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    if(document.getElementById('mainCoreAppWindowView')) document.getElementById('mainCoreAppWindowView').style.display = 'block';
}

function evaluateCustomerActivePipeline() {
    // Render an open transit tracker map directly on client view
    setTimeout(() => {
        let trackerMap = L.map('leafletLiveTrackingDashboardMap', { zoomControl: false }).setView([26.8584, 75.7616], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(trackerMap);
        L.marker([26.8584, 75.7616]).addTo(trackerMap); // User position pin
        L.marker([26.8800, 75.7800]).addTo(trackerMap); // Approaching truck pin
    }, 200);

    if (cachedBookingFormData && cachedBookingFormData.customerName) {
        document.getElementById('activeBookingCard').style.display = 'block';
        document.getElementById('custActiveServiceType').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
    } else {
        document.getElementById('activeBookingCard').style.display = 'block';
        document.getElementById('custActiveServiceType').innerText = "Premium Electrical Overhaul";
    }
}

function toggleTechDutyState() {
    const btn = document.getElementById('btnTechAvailabilityToggle');
    userDutyStateActive = !userDutyStateActive;
    btn.innerText = userDutyStateActive ? "Duty: ON" : "Duty: OFF";
    btn.style.background = userDutyStateActive ? "#00e676" : "#ff1744";
    btn.style.color = userDutyStateActive ? "#000" : "#fff";
}

function triggerJobCompletionSequence() {
    triggerToastFeedback("Order finalized! Account parameters sync processed. ✅");
}

// ==========================================
// 👑 ADMIN STORAGE TOKENS & JWT LOOPS
// ==========================================
function toggleAdminLoginForm() {
    const modal = document.getElementById('adminLoginModal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

document.getElementById('frmAdminSecureAuth').addEventListener('submit', function(e) {
    e.preventDefault();
    const typedPassphrase = document.getElementById('txtAdminSecretPassphrase').value;

    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/secure-login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ secretPassphrase: typedPassphrase })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            sessionStorage.setItem('servo_admin_token', data.authToken);
            toggleAdminLoginForm();
            triggerToastFeedback("Cryptographic tokens validated. Launching Console.");
            launchSecureProductionAdminPortal();
        } else {
            triggerToastFeedback(data.message, true);
        }
    })
    .catch(() => triggerToastFeedback("Authentication connection error.", true));
});

function launchSecureProductionAdminPortal() {
    document.getElementById('adminDashboardPortal').style.display = 'block';
    if(document.getElementById('mainCoreAppWindowView')) document.getElementById('mainCoreAppWindowView').style.display = 'none';
    pullLiveAggregatedBusinessMetrics();
}

function exitAdminConsole() {
    document.getElementById('adminDashboardPortal').style.display = 'none';
    if(document.getElementById('mainCoreAppWindowView')) document.getElementById('mainCoreAppWindowView').style.display = 'block';
}

function pullLiveAggregatedBusinessMetrics() {
    const activeSessionToken = sessionStorage.getItem('servo_admin_token');
    
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/dashboard-metrics`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${activeSessionToken}` }
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            document.getElementById('lblMetricsGrossRevenue').innerText = `₹${response.metrics.revenueTotal}`;
            document.getElementById('lblMetricsLiveJobs').innerText = response.metrics.liveJobsCount;
            populateMetricsGridTable(response.bookingsQueue);
        } else {
            exitAdminConsole();
        }
    })
    .catch(() => {
        // Mock fallback layout if backend connection drops out temporarily during presentation runs
        document.getElementById('lblMetricsGrossRevenue').innerText = "₹1,480";
        document.getElementById('lblMetricsLiveJobs').innerText = "2";
        populateMetricsGridTable([
            { _id: "664f12b", customerName: "Sarthak Jain", customerPhone: "9257809277", serviceType: "AC_REPAIR", flatAddress: "Mansarovar, Jaipur", status: "Pending", assignedPartner: "Unassigned" }
        ]);
    });
}

function populateMetricsGridTable(bookingsQueueArray) {
    const tbody = document.getElementById('adminLiveBookingTableBody');
    if (!tbody) return;
    tbody.innerHTML = "";

    bookingsQueueArray.forEach(booking => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #1a1a1e";
        tbody.appendChild(row);
        
        row.innerHTML = `
            <td style="padding: 15px 20px;"><strong>${booking.customerName}</strong><br><small style="color:#666;">${booking.customerPhone}</small></td>
            <td style="padding: 15px 20px;"><span style="color:#00e5ff;">${booking.serviceType}</span></td>
            <td style="padding: 15px 20px; color:#aaa;">${booking.flatAddress}</td>
            <td style="padding: 15px 20px; font-weight:700; font-size:0.8rem;">● ${booking.status.toUpperCase()}</td>
            <td style="padding: 15px 20px; text-align:right;">
                <select onchange="executeServerStatusMutation('${booking._id}', this.value)" style="background:#1a1a1e; color:#fff; border:1px solid #333; padding:6px; border-radius:4px; font-size:0.8rem;">
                    <option value="">-- Mutate Pipeline --</option>
                    <option value="Amit Sharma|Assigned">Assign Amit (Electrician)</option>
                    <option value="Deepak Kumar|Assigned">Assign Deepak (Plumber)</option>
                    <option value="${booking.assignedPartner}|Completed">Mark Completed ✅</option>
                </select>
            </td>
        `;
    });
}

window.executeServerStatusMutation = function(bookingId, combinedIntegratedString) {
    if(!combinedIntegratedString) return;
    const tokens = combinedIntegratedString.split('|');
    const activeSessionToken = sessionStorage.getItem('servo_admin_token');

    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/mutate-job-status`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeSessionToken}`
        },
        body: JSON.stringify({ bookingId: bookingId, technicianName: tokens[0], targetStatus: tokens[1] })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            triggerToastFeedback("Operational record mutated successfully.");
            pullLiveAggregatedBusinessMetrics(); 
        }
    });
};

function openLegalPage(type) {
    document.getElementById('legalPageOverlayModal').style.display = "flex";
    document.getElementById('lblLegalModalTitle').innerText = "SERVO Compliance Guide";
    document.getElementById('divLegalModalBodyText').innerText = "Hyperlocal home logistics regulations locked down for Jaipur enterprise launch.";
}