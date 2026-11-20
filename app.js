const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com";
const BUSINESS_UPI_ID = "7300185877-2@ybl"; // 👈 Replace with your actual UPI ID

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let capturedCustomerCoords = null;
let activeSelectedCityHubSlug = "jaipur";
let globalCachedTechniciansListArray = [];

// Initialize Map
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

// ==========================================
// 📍 FEATURE 2: CAPTURE EXACT GPS PIN
// ==========================================
function captureCustomerGpsPin() {
    const btn = document.getElementById('btnCaptureGps');
    if (!navigator.geolocation) {
        triggerToastFeedback("GPS not supported on this browser.", true);
        return;
    }
    btn.innerText = "⏳ Locking GPS Coordinates...";
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            capturedCustomerCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            btn.innerText = "✅ Exact GPS Pin Locked!";
            btn.style.borderColor = "#00e676";
            btn.style.color = "#00e676";
        },
        () => {
            btn.innerText = "📍 Pin My Exact GPS Location (Optional)";
            triggerToastFeedback("Location permission denied. Text address will be used.", true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// ==========================================
// 📥 BOOKING FLOW + ARRIVAL PIN GENERATION
// ==========================================
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    cachedBookingFormData = {
        customerName: document.getElementById('bookingCustomerName').value.trim(),
        customerPhone: document.getElementById('bookingCustomerPhone').value.trim(),
        serviceType: activeSelectedServiceGlobalType,
        flatAddress: document.getElementById('bookingFlatAddress').value.trim(),
        coords: capturedCustomerCoords
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
            ...cachedBookingFormData,
            otp: typedCode,
            targetCity: activeSelectedCityHubSlug
        })
    })
    .then(res => res.json())
    .then(finalData => {
        closeDispatchPrompt();
        if(finalData.success) {
            localStorage.setItem('servo_last_phone', cachedBookingFormData.customerPhone);
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
            document.getElementById('lblGeneratedArrivalPin').innerText = finalData.arrivalPin || "----";
            document.getElementById('successScreenOverlay').style.display = 'flex';
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
            capturedCustomerCoords = null;
        } else {
            triggerToastFeedback(finalData.message || "Booking failed.", true);
            document.getElementById('bookingSubmissionForm').style.display = 'block';
            document.getElementById('bookingOtpVerificationForm').style.display = 'none';
        }
    })
    .catch(() => triggerToastFeedback("Server waking up. Please try again in 5 seconds.", true))
    .finally(() => {
        confirmBtn.innerText = "Confirm Booking";
        confirmBtn.disabled = false;
    });
});

// ==========================================
// 📍 FEATURE 1: LIVE CUSTOMER ORDER TRACKER
// ==========================================
function openTrackOrderModal() {
    document.getElementById('trackOrderModal').style.display = 'flex';
    const savedPhone = localStorage.getItem('servo_last_phone');
    if (savedPhone) {
        document.getElementById('txtTrackPhoneInput').value = savedPhone;
        fetchCustomerOrderStatus(savedPhone);
    }
}

function openTrackOrderFromSuccess() {
    document.getElementById('successScreenOverlay').style.display = 'none';
    openTrackOrderModal();
}

document.getElementById('frmTrackCustomerOrder').addEventListener('submit', function(e) {
    e.preventDefault();
    const phone = document.getElementById('txtTrackPhoneInput').value.trim();
    localStorage.setItem('servo_last_phone', phone);
    fetchCustomerOrderStatus(phone);
});

function fetchCustomerOrderStatus(phone) {
    const container = document.getElementById('divTrackOrderResults');
    container.innerHTML = `<p style="color:#a1a1aa; text-align:center; padding:20px;">Fetching live status...</p>`;

    fetch(`${CLOUD_BACKEND_API_LINK}/api/bookings/track/${phone}`)
    .then(res => res.json())
    .then(data => {
        if (!data.success || !data.orders || data.orders.length === 0) {
            container.innerHTML = `<p style="color:#71717a; text-align:center; padding:20px;">No active bookings found for ${phone}.</p>`;
            return;
        }

        container.innerHTML = "";
        const stages = ['Pending', 'Assigned', 'On the Way', 'In Progress', 'Completed'];

        data.orders.forEach(order => {
            const currentIdx = stages.indexOf(order.status);
            const partnerAssigned = order.assignedPartnerName && order.assignedPartnerName !== 'Unassigned';

            let stepperHtml = stages.map((st, idx) => `
                <div class="stepper-item ${idx <= currentIdx ? 'done' : ''}">
                    <div class="stepper-dot"></div>
                    <span>${st}</span>
                </div>
            `).join('');

            let partnerBox = partnerAssigned ? `
                <div style="background:#121214; border:1px solid #27272a; padding:12px; border-radius:10px; margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <p style="font-size:0.75rem; color:#71717a;">Assigned Expert</p>
                        <p style="font-weight:700; font-size:0.95rem;">${order.assignedPartnerName}</p>
                        <p style="font-size:0.8rem; color:#00e5ff; margin-top:2px;">Arrival PIN: <strong>${order.arrivalPin || 'N/A'}</strong></p>
                    </div>
                    ${order.assignedPartnerPhone ? `<a href="tel:${order.assignedPartnerPhone}" style="background:#00e676; color:#000; padding:8px 14px; border-radius:8px; font-weight:800; text-decoration:none; font-size:0.8rem;">📞 Call Tech</a>` : ''}
                </div>
            ` : `<p style="font-size:0.8rem; color:#eab308; margin-top:10px;">⏳ Assigning nearest verified technician...</p>`;

            const card = document.createElement('div');
            card.style.cssText = "background:#18181b; border:1px solid #27272a; padding:16px; border-radius:12px; margin-bottom:14px;";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                    <span style="color:#00e5ff; font-weight:800; font-size:0.9rem;">${order.serviceType.replace('_', ' ')}</span>
                    <span style="font-size:0.8rem; color:#a1a1aa;">₹${order.billingAmount || 290}</span>
                </div>
                <p style="font-size:0.8rem; color:#a1a1aa; margin-bottom:10px;">📍 ${order.flatAddress}</p>
                ${stepperHtml}
                ${partnerBox}
            `;
            container.appendChild(card);
        });
    })
    .catch(() => {
        container.innerHTML = `<p style="color:#ff1744; text-align:center;">Connection error. Please try again.</p>`;
    });
}

// ==========================================
// 👨‍🔧 FEATURE 3: TECHNICIAN 3-STEP WORKFLOW + MAPS + DYNAMIC QR
// ==========================================
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
            triggerToastFeedback(`🎉 Welcome ${data.profile.name}`);
            document.getElementById('divTechPhoneAuthGatewayForm').style.display = 'none';
            document.getElementById('divTechActiveWorkSpaceLayout').style.display = 'block';
            document.getElementById('techWelcomeHeader').innerText = data.profile.name;
            document.getElementById('lblTechSubMetadata').innerText = `Specialty: ${data.profile.skill} | Online`;
            pullActiveTechnicianJobsRegistryLoop();
        } else {
            triggerToastFeedback(data.message || "Invalid credentials.", true);
        }
    })
    .catch(() => triggerToastFeedback("Backend waking up. Try again in 5s.", true))
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
        if (response.success) renderTechnicianJobQueueGrid(response.queue);
    });
}

function renderTechnicianJobQueueGrid(jobsArray) {
    const queueContainer = document.getElementById('techActiveJobsQueue');
    if (!queueContainer) return; queueContainer.innerHTML = "";
    
    const activeJobs = jobsArray.filter(j => j.status !== 'Completed');
    if (activeJobs.length === 0) {
        queueContainer.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#52525b; font-size:0.9rem;">📭 No active assignments right now. Standby for dispatches.</div>`;
        return;
    }

    activeJobs.forEach(job => {
        const baseFee = job.billingAmount || (job.serviceType === 'AC_REPAIR' ? 450 : 290);
        const mapsUrl = job.coords 
            ? `https://www.google.com/maps/dir/?api=1&destination=${job.coords.lat},${job.coords.lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.flatAddress)}`;

        let stepActionHtml = "";

        if (job.status === 'Assigned') {
            stepActionHtml = `
                <button onclick="techStartTravel('${job._id}')" style="width:100%; background:#00e5ff; color:#000; padding:13px; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-size:0.9rem; margin-top:10px;">
                    🛵 Step 1: Start Travel (Notify Customer)
                </button>
            `;
        } else if (job.status === 'On the Way') {
            stepActionHtml = `
                <div style="background:#121214; border:1px solid #27272a; padding:12px; border-radius:10px; margin-top:10px;">
                    <p style="font-size:0.8rem; color:#a1a1aa; margin-bottom:8px;">Ask customer for their 4-digit Arrival PIN:</p>
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="pinInput_${job._id}" placeholder="4-Digit PIN" maxlength="4" style="margin-bottom:0; text-align:center; letter-spacing:4px; font-weight:800;">
                        <button onclick="techVerifyArrival('${job._id}')" style="background:#00e5ff; color:#000; border:none; padding:0 16px; border-radius:8px; font-weight:800; cursor:pointer; white-space:nowrap;">Verify PIN</button>
                    </div>
                </div>
            `;
        } else if (job.status === 'In Progress') {
            const initialUpi = `upi://pay?pa=${BUSINESS_UPI_ID}&pn=SERVO&am=${baseFee}&cu=INR`;
            const initialQr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(initialUpi)}`;

            stepActionHtml = `
                <div style="background:#121214; border:1px solid #27272a; border-radius:10px; padding:14px; text-align:center; margin-top:10px;">
                    <p style="font-size:0.75rem; color:#a1a1aa; margin-bottom:6px;">Final Bill Amount (Base + Spare Parts ₹)</p>
                    <input type="number" id="billInput_${job._id}" value="${baseFee}" oninput="refreshDynamicQr('${job._id}')" style="text-align:center; font-weight:800; font-size:1.1rem; margin-bottom:10px;">
                    <img id="qrImg_${job._id}" src="${initialQr}" alt="UPI QR" style="border-radius:8px; background:#fff; padding:6px; width:135px; height:135px; margin-bottom:10px;">
                    <button onclick="executeTechnicianJobCompletion('${job._id}')" style="width:100%; background:#00e676; color:#000; padding:13px; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-size:0.9rem;">
                        Payment Collected & Close Job ✅
                    </button>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.style.cssText = "background:#18181b; border:1px solid #27272a; padding:18px; border-radius:14px; margin-bottom:15px;";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:0.75rem; background:rgba(0,229,255,0.1); color:#00e5ff; padding:4px 8px; border-radius:4px; font-weight:700;">${job.serviceType}</span>
                <span style="font-size:0.75rem; background:#27272a; color:#00e676; padding:4px 8px; border-radius:4px; font-weight:700;">${job.status.toUpperCase()}</span>
            </div>
            <h5 style="font-size:1.1rem; font-weight:700; margin-bottom:4px;">${job.customerName}</h5>
            <p style="color:#a1a1aa; font-size:0.85rem; line-height:1.4; margin-bottom:12px;">📍 ${job.flatAddress}</p>
            
            <div style="display:flex; gap:8px;">
                <a href="tel:${job.customerPhone}" style="flex:1; text-align:center; background:#27272a; color:#fff; padding:10px; border-radius:8px; font-weight:700; text-decoration:none; font-size:0.85rem;">📞 Call Client</a>
                <a href="${mapsUrl}" target="_blank" style="flex:1; text-align:center; background:#27272a; color:#00e5ff; padding:10px; border-radius:8px; font-weight:700; text-decoration:none; font-size:0.85rem;">🗺️ Navigate</a>
            </div>
            ${stepActionHtml}
        `;
        queueContainer.appendChild(card);
    });
}

function refreshDynamicQr(jobId) {
    const amount = Number(document.getElementById(`billInput_${jobId}`).value) || 290;
    const upiUrl = `upi://pay?pa=${BUSINESS_UPI_ID}&pn=SERVO&am=${amount}&cu=INR`;
    document.getElementById(`qrImg_${jobId}`).src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUrl)}`;
}

function techStartTravel(bookingId) {
    const techToken = sessionStorage.getItem('servo_tech_token');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/technicians/jobs/start-travel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${techToken}` },
        body: JSON.stringify({ bookingId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            triggerToastFeedback("🛵 Customer notified you are on the way!");
            pullActiveTechnicianJobsRegistryLoop();
        }
    });
}

function techVerifyArrival(bookingId) {
    const enteredPin = document.getElementById(`pinInput_${bookingId}`).value.trim();
    const techToken = sessionStorage.getItem('servo_tech_token');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/technicians/jobs/verify-arrival`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${techToken}` },
        body: JSON.stringify({ bookingId, enteredPin })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            triggerToastFeedback("✅ Arrival PIN verified! Job started.");
            pullActiveTechnicianJobsRegistryLoop();
        } else {
            triggerToastFeedback(data.message || "Invalid PIN.", true);
        }
    });
}

function executeTechnicianJobCompletion(bookingId) {
    const finalAmount = Number(document.getElementById(`billInput_${bookingId}`).value) || 290;
    const techToken = sessionStorage.getItem('servo_tech_token');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/technicians/jobs/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${techToken}` },
        body: JSON.stringify({ bookingId, finalAmount })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            triggerToastFeedback("✅ Payment logged & job closed!");
            pullActiveTechnicianJobsRegistryLoop();
        }
    });
}

document.getElementById('frmTechSecureMobileVerify').addEventListener('submit', function(e) {
    e.preventDefault();
    executeTechnicianSecureLogin(
        document.getElementById('txtTechAuthMobileField').value.trim(),
        document.getElementById('txtTechAuthPasswordField').value
    );
});

// ==========================================
// 👑 ADMIN PANEL PIPELINES + 1-TAP WHATSAPP
// ==========================================
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
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('servo_admin_token')}`
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            triggerToastFeedback("🎉 Partner Account Active!");
            document.getElementById('frmRegisterTechNode').reset();
            pullLiveAggregatedBusinessMetrics();
        } else { triggerToastFeedback(data.message, true); }
    });
});

function pullLiveAggregatedBusinessMetrics() {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/dashboard-metrics`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('servo_admin_token')}` }
    })
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
        let assignedTechPhone = "";

        globalCachedTechniciansListArray.forEach(tech => {
            if(tech.skill === booking.serviceType) {
                const isSelected = booking.assignedPartnerName === tech.name;
                if (isSelected) assignedTechPhone = tech.phone;
                optionsHtmlString += `<option value="${tech._id}|${tech.name}|${tech.phone}|Assigned" ${isSelected ? 'selected' : ''}>${tech.name}</option>`;
            }
        });

        let waButtonHtml = "";
        if (assignedTechPhone) {
            const cleanTechPhone = assignedTechPhone.replace(/\D/g, '').slice(-10);
            const msg = encodeURIComponent(
                `🛠️ *SERVO NEW JOB DISPATCH*\n\n` +
                `*Service:* ${booking.serviceType.replace('_', ' ')}\n` +
                `*Customer:* ${booking.customerName}\n` +
                `*Phone:* ${booking.customerPhone}\n` +
                `*Address:* ${booking.flatAddress}\n\n` +
                `Open servoo.in -> Partner Hub to start travel & verify Arrival PIN.`
            );
            waButtonHtml = `<a href="https://wa.me/91${cleanTechPhone}?text=${msg}" target="_blank" style="display:inline-block; margin-top:6px; background:#00e676; color:#000; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:800; text-decoration:none;">💬 Ping Tech</a>`;
        }

        row.innerHTML = `
            <td style="padding:15px 10px;"><strong>${booking.customerName}</strong><br><small style="color:#71717a;">${booking.customerPhone}</small></td>
            <td style="padding:15px 10px;"><span style="color:#00e5ff; font-weight:600;">${booking.serviceType.replace('_', ' ')}</span></td>
            <td style="padding:15px 10px; color:#d4d4d8; font-size:0.85rem;">${booking.flatAddress}</td>
            <td style="padding:15px 10px;"><span style="font-size:0.8rem; background:#27272a; padding:4px 8px; border-radius:4px; font-weight:700;">${booking.status.toUpperCase()}</span></td>
            <td style="padding:15px 10px; text-align:right;">
                <select onchange="executeServerStatusMutation('${booking._id}', this.value)" style="background:#18181b; color:#fff; border:1px solid #27272a; padding:8px; border-radius:6px; font-size:0.85rem; margin-bottom:0;">
                    ${optionsHtmlString}
                </select>
                ${waButtonHtml}
            </td>
        `;
    });
}

function executeServerStatusMutation(id, val) {
    if(!val) return;
    const [techId, techName, techPhone, targetStatus] = val.split('|');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/mutate-job-status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('servo_admin_token')}`
        },
        body: JSON.stringify({
            bookingId: id,
            technicianId: techId,
            technicianName: techName,
            technicianPhone: techPhone,
            targetStatus: targetStatus
        })
    }).then(() => {
        triggerToastFeedback("Dispatched! Tap 'Ping Tech' to alert via WhatsApp.");
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
function exitAdminConsole() { document.getElementById('adminDashboardPortal').style.display = 'none'; document.getElementById('mainCoreAppWindowView').style.display = 'block'; }
function triggerToastFeedback(msg, isError=false) { const b = document.createElement('div'); b.className=`custom-toast-bubble ${isError?'error-toast':''}`; b.innerText=msg; document.body.appendChild(b); setTimeout(()=>b.remove(),4000); }
document.addEventListener("DOMContentLoaded", () => { executeCityMarketplaceShift(); });