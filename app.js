const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let serializedAppliancePhotoData = null;
let googleHomepageMapInstance = null;

// ==========================================
// 🗺️ GOOGLE MAPS INDEPENDENT LOADING ANCHOR (Item 10)
// ==========================================
function initProductionMapsMatrix() {
    const jaipurCenterCoordinates = { lat: 26.9124, lng: 75.7873 };
    if (document.getElementById('googleCoreMapDisplayAnchor')) {
        googleHomepageMapInstance = new google.maps.Map(document.getElementById('googleCoreMapDisplayAnchor'), {
            zoom: 12,
            center: jaipurCenterCoordinates,
            disableDefaultUI: true
        });
        new google.maps.Marker({ position: jaipurCenterCoordinates, map: googleHomepageMapInstance });
    }
}

// 📸 FILE payLOAD STRING DECODER MAPPING (Item 19)
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
// 🔐 BACKEND HANDSHAKE ROUTING CONTEXT (Unhackable Verification)
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
    triggerToastFeedback("Sandbox security sequence initialized. Code is 1234.");
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
            document.getElementById('lblSuccessPro').innerText = "Unassigned (Pending Review)";
            document.getElementById('successScreenOverlay').style.display = 'flex';
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
            serializedAppliancePhotoData = null;
        } else {
            triggerToastFeedback(finalData.message || "Verification mismatch.", true);
        }
    })
    .catch(() => triggerToastFeedback("Communication loop dropped.", true));
});

// ==========================================
// 👑 ADMINISTRATIVE PRIVILEGES & SESSION STORAGE PIPELINES (Unhackable Admin)
// ==========================================
function toggleAdminLoginForm() {
    const modal = document.getElementById('adminLoginModal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

document.getElementById('frmAdminSecureAuth').addEventListener('submit', function(e) {
    e.preventDefault();
    const typedPassphrase = document.getElementById('txtAdminSecretPassphrase').value;

    // Send password straight to backend for isolation review
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/secure-login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ secretPassphrase: typedPassphrase })
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            // Lock the secure token inside session storage variables away from global scripts
            sessionStorage.setItem('servo_admin_token', data.authToken);
            toggleAdminLoginForm();
            triggerToastFeedback("Cryptographic tokens validated. Launching Command Console.");
            launchSecureProductionAdminPortal();
        } else {
            triggerToastFeedback(data.message, true);
        }
    })
    .catch(() => triggerToastFeedback("Security validation node connection error.", true));
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
    
    // Inject secure JWT tokens programmatically straight up into the validation headers mapping
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/dashboard-metrics`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${activeSessionToken}` }
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            // Populate true metrics directly from the cloud calculation registers
            document.getElementById('lblMetricsGrossRevenue').innerText = `₹${response.metrics.revenueTotal}`;
            document.getElementById('lblMetricsLiveJobs').innerText = response.metrics.liveJobsCount;
            document.getElementById('lblMetricsComplaints').innerText = response.metrics.complaintsCount;
            
            populateMetricsGridTable(response.bookingsQueue);
        } else {
            triggerToastFeedback("Session validation expired. Please re-authenticate.", true);
            exitAdminConsole();
        }
    })
    .catch(() => triggerToastFeedback("Failed connecting to business metrics aggregation engines.", true));
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
                    <option value="${booking.assignedPartner}|Completed">Mark Job Completed ✅</option>
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
            pullLiveAggregatedBusinessMetrics(); // Hot refresh backend aggregation data loops
        }
    });
};

function openLegalPage(type) {
    document.getElementById('legalPageOverlayModal').style.display = "flex";
    document.getElementById('lblLegalModalTitle').innerText = type === 'privacy' ? "Privacy Policy Statement" : "Terms & Operational Use Guidelines";
    document.getElementById('divLegalModalBodyText').innerText = "SERVO Hyperlocal Residential Compliance Protocols active for Jaipur Region.";
}