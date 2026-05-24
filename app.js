const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let serializedAppliancePhotoData = null;
let activeSelectedCityHubSlug = "jaipur";
let activeTechnicianProfileName = "";

// Initialize Master Map Layouts
let mainLandingLeafletMap = L.map('leafletCoreMapContainer', { zoomControl: false }).setView([26.9124, 75.7873], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mainLandingLeafletMap);
let mainLandingMarker = L.marker([26.9124, 75.7873]).addTo(mainLandingLeafletMap);

const LocalMarketplaceDataMatrix = {
    jaipur: { name: "Jaipur Hub", coords: [26.9124, 75.7873], acPrice: "₹450", elecPrice: "₹290", subZones: ['All Areas', 'Mansarovar', 'Vaishali Nagar', 'Malviya Nagar'] },
    delhi: { name: "Delhi NCR Hub", coords: [28.6139, 77.2090], acPrice: "₹590", elecPrice: "₹350", subZones: ['All Areas', 'Connaught Place', 'Gurgaon Sec-45', 'Noida Phase-2'] },
    mumbai: { name: "Mumbai Hub", coords: [19.0760, 72.8777], acPrice: "₹690", elecPrice: "₹420", subZones: ['All Areas', 'Andheri West', 'Bandra Local', 'Colaba Core'] }
};

function executeCityMarketplaceShift() {
    activeSelectedCityHubSlug = document.getElementById('ddlCitySelectorNode').value;
    const context = LocalMarketplaceDataMatrix[activeSelectedCityHubSlug];
    if (!context) return;

    document.getElementById('lblPriceAc').innerText = context.acPrice;
    document.getElementById('lblPriceElec').innerText = context.elecPrice;
    document.getElementById('lblCurrentSEOZoneBadge').innerText = context.name;

    mainLandingLeafletMap.setView(context.coords, 12);
    mainLandingMarker.setLatLng(context.coords);

    const pillContainer = document.getElementById('divSubZonePillContainer');
    pillContainer.innerHTML = "";
    context.subZones.forEach((zone, idx) => {
        const pill = document.createElement('button');
        pill.className = `location-pill ${idx === 0 ? 'active-hub' : ''}`;
        pill.innerText = zone;
        pillContainer.appendChild(pill);
    });
}

// ==========================================
// 🔑 REAL DRIVER-PARTNER AUTHENTICATION ENGINE
// ==========================================
function executeTechnicianSecureLogin(phone, password) {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/technicians/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone, password: password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            sessionStorage.setItem('servo_tech_token', data.techToken);
            sessionStorage.setItem('servo_tech_profile', JSON.stringify(data.profile));
            
            triggerToastFeedback(`Welcome back, ${data.profile.name}!`);
            
            document.getElementById('divTechPhoneAuthGatewayForm').style.display = 'none';
            document.getElementById('divTechActiveWorkSpaceLayout').style.display = 'block';
            
            document.getElementById('techWelcomeHeader').innerText = data.profile.name;
            document.getElementById('lblTechSubMetadata').innerText = `Specialty: ${data.profile.skill} | Status: Online`;
            
            pullActiveTechnicianJobsRegistryLoop();
        } else {
            triggerToastFeedback(data.message || "Invalid account login inputs.", true);
        }
    })
    .catch(() => triggerToastFeedback("Server route missing or down.", true));
}

function pullActiveTechnicianJobsRegistryLoop() {
    const techToken = sessionStorage.getItem('servo_tech_token');
    if (!techToken) return;

    fetch(`${CLOUD_BACKEND_API_LINK}/api/technicians/jobs/my-tickets`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${techToken}` }
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            renderTechnicianJobQueueGrid(response.queue);
        }
    });
}

function renderTechnicianJobQueueGrid(jobsArray) {
    const queueContainer = document.getElementById('techActiveJobsQueue');
    if (!queueContainer) return; queueContainer.innerHTML = "";
    if (jobsArray.length === 0) {
        queueContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">📭 No active assignments.</div>`;
        return;
    }
    jobsArray.forEach(job => {
        const card = document.createElement('div');
        card.style.background = "#121214"; card.style.border = "1px solid #27272a"; card.style.padding = "20px"; card.style.borderRadius = "10px";
        queueContainer.appendChild(card);
        card.innerHTML = `<h5>${job.serviceType}</h5><p>${job.flatAddress}</p><p style='color:#00e5ff; font-size:0.85rem; margin-top:4px;'>Client: ${job.customerName}</p><button onclick="executeTechnicianJobCompletion('${job._id}')" style="width:100%; background:#00e676; color:#000; padding:10px; margin-top:10px; border:none; border-radius:6px; font-weight:800; cursor:pointer;">Mark Completed ✅</button>`;
    });
}

function executeTechnicianJobCompletion(bookingId) {
    const activeAdminToken = sessionStorage.getItem('servo_admin_token');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/mutate-job-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeAdminToken}` },
        body: JSON.stringify({ bookingId: bookingId, technicianName: "Service completed", targetStatus: "Completed" })
    }).then(() => pullActiveTechnicianJobsRegistryLoop());
}

// 📱 TECHNICIAN HUB SUBMIT CAPTURE
document.getElementById('frmTechSecureMobileVerify').addEventListener('submit', function(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('txtTechAuthMobileField').value.trim();
    const passInput = document.getElementById('txtTechAuthPasswordField').value;
    executeTechnicianSecureLogin(phoneInput, passInput);
});

// ➕ ADMIN PANEL: REGISTER AND INSTANTLY APPROVE NEW HANDYMAN
document.getElementById('frmRegisterTechNode').addEventListener('submit', function(e) {
    e.preventDefault();
    const activeAdminToken = sessionStorage.getItem('servo_admin_token');
    
    const payload = {
        name: document.getElementById('regTechName').value,
        phone: document.getElementById('regTechPhone').value,
        password: document.getElementById('regTechPass').value,
        skill: document.getElementById('regTechSkill').value,
        city: document.getElementById('regTechCity').value
    };

    fetch(`${CLOUD_BACKEND_API_LINK}/api/technicians/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            triggerToastFeedback("🎉 Profile saved into MongoDB Atlas cluster!");
            document.getElementById('frmRegisterTechNode').reset();
            pullLiveAggregatedBusinessMetrics();
        } else { triggerToastFeedback(data.message, true); }
    });
});

// CORE INTERFACES HANDSHAKES
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    cachedBookingFormData = {
        customerName: document.getElementById('bookingCustomerName').value,
        customerPhone: document.getElementById('bookingCustomerPhone').value,
        serviceType: activeSelectedServiceGlobalType,
        flatAddress: document.getElementById('bookingFlatAddress').value,
    };
    document.getElementById('bookingSubmissionForm').style.display = 'none';
    document.getElementById('bookingOtpVerificationForm').style.display = 'block';
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
            targetCity: activeSelectedCityHubSlug
        })
    })
    .then(res => res.json())
    .then(finalData => {
        closeDispatchPrompt();
        if(finalData.success) {
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType;
            document.getElementById('successScreenOverlay').style.display = 'flex';
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
        }
    });
});

// ADMIN PANEL HOOKS
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
            document.getElementById('adminLoginModal').style.display = 'none';
            document.getElementById('adminDashboardPortal').style.display = 'block';
            document.getElementById('mainCoreAppWindowView').style.display = 'none';
            pullLiveAggregatedBusinessMetrics();
        } else { alert('Clearance Mismatch.'); }
    });
});

function pullLiveAggregatedBusinessMetrics() {
    const token = sessionStorage.getItem('servo_admin_token');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/dashboard-metrics`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            document.getElementById('lblMetricsGrossRevenue').innerText = `₹${response.metrics.revenueTotal}`;
            populateMetricsGridTable(response.bookingsQueue);
        }
    });
}

function populateMetricsGridTable(arr) {
    const tbody = document.getElementById('adminLiveBookingTableBody');
    if (!tbody) return; tbody.innerHTML = "";
    arr.forEach(booking => {
        const row = document.createElement('tr'); row.style.borderBottom = "1px solid #1a1a1e"; tbody.appendChild(row);
        row.innerHTML = `<td style="padding:15px 20px;"><strong>${booking.customerName}</strong></td><td style="padding:15px 20px;"><span style="color:#00e5ff;">${booking.serviceType}</span></td><td style="padding:15px 20px; color:#aaa;">${booking.flatAddress}</td><td style="padding:15px 20px;">● ${booking.status.toUpperCase()}</td><td style="padding:15px 20px; text-align:right;"><select onchange="executeServerStatusMutation('${booking._id}', this.value)" style="background:#1a1a1e; color:#fff; border:1px solid #333; padding:6px; border-radius:4px;"><option value="">-- Assign Partner --</option><option value="Amit Sharma|Assigned">Assign Amit</option></select></td>`;
    });
}

function executeServerStatusMutation(id, val) {
    if(!val) return; const t = val.split('|'); const token = sessionStorage.getItem('servo_admin_token');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/mutate-job-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bookingId: id, technicianName: t[0], targetStatus: t[1] })
    }).then(() => pullLiveAggregatedBusinessMetrics());
}

// TOGGLE PANEL CONFIGS
function switchToPanel(targetModeString) {
    document.getElementById('customerDashboardPanel').style.display = 'none';
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    document.getElementById('adminDashboardPortal').style.display = 'none';
    document.getElementById('mainCoreAppWindowView').style.display = 'none';
    if (targetModeString === 'customer') document.getElementById('customerDashboardPanel').style.display = 'block';
    if (targetModeString === 'technician') {
        document.getElementById('technicianDashboardPanel').style.display = 'block';
        document.getElementById('divTechPhoneAuthGatewayForm').style.display = 'block';
        document.getElementById('divTechActiveWorkSpaceLayout').style.display = 'none';
    }
}

function openDispatchPrompt(token) { activeSelectedServiceGlobalType = token; document.getElementById('modalServiceTitle').innerText = `Request ${token}`; document.getElementById('dispatchModalWindow').style.display = 'flex'; }
function closeDispatchPrompt() { document.getElementById('dispatchModalWindow').style.display = 'none'; }
function toggleAdminLoginForm() { document.getElementById('adminLoginModal').style.display = 'flex'; }
function exitAdminConsole() { document.getElementById('adminDashboardPortal').style.display = 'none'; document.getElementById('mainCoreAppWindowView').style.display = 'block'; }
function triggerToastFeedback(msg) { const b = document.createElement('div'); b.className='custom-toast-bubble'; b.innerText=msg; document.body.appendChild(b); setTimeout(()=>b.remove(),4000); }
function exitToMainHome() { location.reload(); }
function processLocalImagePreview() {}
document.addEventListener("DOMContentLoaded", () => { executeCityMarketplaceShift(); });