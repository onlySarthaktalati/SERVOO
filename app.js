const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let activeSelectedCityHubSlug = "jaipur";
let globalCachedTechniciansListArray = []; 

// Initialize Mobile-First Map View Layout
let mainLandingLeafletMap = L.map('leafletCoreMapContainer', { zoomControl: false, dragging: !L.Browser.mobile, touchZoom: L.Browser.mobile }).setView([26.9124, 75.7873], 12);
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

// 🔑 STABLE TECHNICIAN JWT LOGIN VERIFICATION
function executeTechnicianSecureLogin(phone, password) {
    const submitBtn = document.querySelector('#frmTechSecureMobileVerify button[type="submit"]');
    if(submitBtn) { submitBtn.innerText = "Verifying Account..."; submitBtn.disabled = true; }

    fetch(`${CLOUD_BACKEND_API_LINK}/api/technicians/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password: password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            sessionStorage.setItem('servo_tech_token', data.techToken);
            sessionStorage.setItem('servo_tech_profile', JSON.stringify(data.profile));
            
            triggerToastFeedback(`🎉 Login Successful! Welcome ${data.profile.name}`);
            
            document.getElementById('divTechPhoneAuthGatewayForm').style.display = 'none';
            document.getElementById('divTechActiveWorkSpaceLayout').style.display = 'block';
            
            document.getElementById('techWelcomeHeader').innerText = data.profile.name;
            document.getElementById('lblTechSubMetadata').innerText = `Specialty: ${data.profile.skill} | Status: Online`;
            
            pullActiveTechnicianJobsRegistryLoop();
        } else {
            triggerToastFeedback(data.message || "Invalid credentials. Try again.", true);
        }
    })
    .catch(() => triggerToastFeedback("Backend waking up. Please try again in a moment.", true))
    .finally(() => { if(submitBtn) { submitBtn.innerText = "Sign In"; submitBtn.disabled = false; } });
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
        queueContainer.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#52525b; font-size:0.9rem;">📭 No active assignments right now. Standby for dispatches.</div>`;
        return;
    }
    jobsArray.forEach(job => {
        const card = document.createElement('div');
        card.style.background = "#18181b"; card.style.border = "1px solid #27272a"; card.style.padding = "20px"; card.style.borderRadius = "12px"; card.style.marginBottom = "12px";
        queueContainer.appendChild(card);
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:0.8rem; background:rgba(0,229,255,0.1); color:#00e5ff; padding:4px 8px; border-radius:4px; font-weight:700;">${job.serviceType}</span>
                <span style="font-size:0.8rem; color:#a1a1aa;">${new Date(job.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <h5 style="font-size:1.1rem; font-weight:700; margin-bottom:4px;">${job.customerName}</h5>
            <p style="color:#a1a1aa; font-size:0.9rem; line-height:1.4; margin-bottom:12px;">📍 ${job.flatAddress}</p>
            <div style="display:flex; gap:10px;">
                <a href="tel:${job.customerPhone}" style="flex:1; text-align:center; background:#27272a; color:#fff; padding:12px; border-radius:8px; font-weight:700; text-decoration:none; font-size:0.9rem;">📞 Call Client</a>
                <button onclick="executeTechnicianJobCompletion('${job._id}')" style="flex:1; background:#00e676; color:#000; padding:12px; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-size:0.9rem;">Mark Completed ✅</button>
            </div>
        `;
    });
}

function executeTechnicianJobCompletion(bookingId) {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/mutate-job-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingId, technicianName: "Completed", targetStatus: "Completed" })
    }).then(() => {
        triggerToastFeedback("Job marked completed successfully!");
        pullActiveTechnicianJobsRegistryLoop();
    });
}

// FRONTEND ACCOUNT SUBMISSION LISTENERS
document.getElementById('frmTechSecureMobileVerify').addEventListener('submit', function(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('txtTechAuthMobileField').value.trim();
    const passInput = document.getElementById('txtTechAuthPasswordField').value;
    executeTechnicianSecureLogin(phoneInput, passInput);
});

// CLIENT AUTOMATED DISPATCH INTAKE FLOW
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    cachedBookingFormData = {
        customerName: document.getElementById('bookingCustomerName').value.trim(),
        customerPhone: document.getElementById('bookingCustomerPhone').value.trim(),
        serviceType: activeSelectedServiceGlobalType,
        flatAddress: document.getElementById('bookingFlatAddress').value.trim(),
    };
    document.getElementById('bookingSubmissionForm').style.display = 'none';
    document.getElementById('bookingOtpVerificationForm').style.display = 'block';
});

document.getElementById('bookingOtpVerificationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const typedCode = document.getElementById('bookingVerifiedOtpInput').value.trim();
    const confirmBtn = document.getElementById('btnVerifyOtp');
    
    confirmBtn.innerText = "Booking Ticket...";
    confirmBtn.disabled = true;

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
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
            document.getElementById('successScreenOverlay').style.display = 'flex';
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
        } else {
            triggerToastFeedback(finalData.message || "Booking failed.", true);
            document.getElementById('bookingSubmissionForm').style.display = 'block';
            document.getElementById('bookingOtpVerificationForm').style.display = 'none';
        }
    })
    .catch(() => triggerToastFeedback("Network speed dropped. Try again.", true))
    .finally(() => {
        confirmBtn.innerText = "Confirm Booking";
        confirmBtn.disabled = false;
    });
});

// ADMIN PANEL PIPELINES
document.getElementById('frmAdminSecureAuth').addEventListener('submit', function(e) {
    e.preventDefault();
    const typedPassphrase = document.getElementById('txtAdminSecretPassphrase').value.trim();
    
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
        } else { triggerToastFeedback("Clearance Mismatch. Access Denied.", true); }
    });
});

document.getElementById('frmRegisterTechNode').addEventListener('submit', function(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('regTechName').value.trim(),
        phone: document.getElementById('regTechPhone').value.trim(),
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
            triggerToastFeedback("🎉 Account Active! Saved to Cloud Registry.");
            document.getElementById('frmRegisterTechNode').reset();
            pullLiveAggregatedBusinessMetrics();
        } else { triggerToastFeedback(data.message, true); }
    });
});

function pullLiveAggregatedBusinessMetrics() {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/dashboard-metrics`)
    .then(res => res.json())
    .then(response => {
        if (response.success) {
            document.getElementById('lblMetricsGrossRevenue').innerText = `₹${response.metrics.revenueTotal}`;
            globalCachedTechniciansListArray = response.techniciansList || []; 
            populateMetricsGridTable(response.bookingsQueue);
        }
    });
}

function populateMetricsGridTable(arr) {
    const tbody = document.getElementById('adminLiveBookingTableBody');
    if (!tbody) return; tbody.innerHTML = "";
    
    arr.forEach(booking => {
        const row = document.createElement('tr'); row.style.borderBottom = "1px solid #1a1a1e"; tbody.appendChild(row);
        
        let optionsHtmlString = `<option value="">-- Dispatch Partner --</option>`;
        globalCachedTechniciansListArray.forEach(tech => {
            if(tech.skill === booking.serviceType) {
                optionsHtmlString += `<option value="${tech.name}|Assigned" ${booking.assignedPartner === tech.name ? 'selected' : ''}>${tech.name} (${tech.skill})</option>`;
            }
        });

        row.innerHTML = `
            <td style="padding:15px 10px;"><strong>${booking.customerName}</strong><br><small style="color:#71717a;">${booking.customerPhone}</small></td>
            <td style="padding:15px 10px;"><span style="color:#00e5ff; font-weight:600;">${booking.serviceType.replace('_', ' ')}</span></td>
            <td style="padding:15px 10px; color:#d4d4d8; font-size:0.85rem;">${booking.flatAddress}</td>
            <td style="padding:15px 10px;"><span style="font-size:0.8rem; background:#27272a; padding:4px 8px; border-radius:4px; font-weight:700;">${booking.status.toUpperCase()}</span></td>
            <td style="padding:15px 10px; text-align:right;">
                <select onchange="executeServerStatusMutation('${booking._id}', this.value)" style="background:#18181b; color:#fff; border:1px solid #27272a; padding:8px; border-radius:6px; font-size:0.85rem;">
                    ${optionsHtmlString}
                </select>
            </td>
        `;
    });
}

function executeServerStatusMutation(id, val) {
    if(!val) return; const t = val.split('|');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/mutate-job-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, technicianName: t[0], targetStatus: t[1] })
    }).then(() => {
        triggerToastFeedback("Dispatched successfully!");
        pullLiveAggregatedBusinessMetrics();
    });
}

function switchToPanel(targetModeString) {
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    document.getElementById('adminDashboardPortal').style.display = 'none';
    document.getElementById('mainCoreAppWindowView').style.display = 'none';
    if (targetModeString === 'customer') document.getElementById('mainCoreAppWindowView').style.display = 'block';
    if (targetModeString === 'technician') {
        document.getElementById('technicianDashboardPanel').style.display = 'block';
        document.getElementById('divTechPhoneAuthGatewayForm').style.display = 'block';
        document.getElementById('divTechActiveWorkSpaceLayout').style.display = 'none';
    }
}

function openDispatchPrompt(token) { activeSelectedServiceGlobalType = token; document.getElementById('modalServiceTitle').innerText = `Request ${token.replace('_', ' ')}`; document.getElementById('dispatchModalWindow').style.display = 'flex'; }
function closeDispatchPrompt() { document.getElementById('dispatchModalWindow').style.display = 'none'; document.getElementById('bookingSubmissionForm').style.display = 'block'; document.getElementById('bookingOtpVerificationForm').style.display = 'none'; }
function toggleAdminLoginForm() { document.getElementById('adminLoginModal').style.display = 'flex'; }
// 🛠️ MOBILE SECURITY PASS: EASILY RE-ENABLE CUSTOMER SCREEN CLICK
function exitAdminConsole() { document.getElementById('adminDashboardPortal').style.display = 'none'; document.getElementById('mainCoreAppWindowView').style.display = 'block'; }
function triggerToastFeedback(msg, isError=false) { const b = document.createElement('div'); b.className=`custom-toast-bubble ${isError?'error-toast':''}`; b.innerText=msg; document.body.appendChild(b); setTimeout(()=>b.remove(),4000); }
document.addEventListener("DOMContentLoaded", () => { executeCityMarketplaceShift(); });