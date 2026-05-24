const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let serializedAppliancePhotoData = null;
let userDutyStateActive = true;
let activeTechnicianProfileName = "";
let selectedHubCityToken = "jaipur";

// Initialize Leaflet Mapping Modules
let mainLandingLeafletMap = L.map('leafletCoreMapContainer', { zoomControl: false }).setView([26.9124, 75.7873], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mainLandingLeafletMap);
let mainLandingMarker = L.marker([26.9124, 75.7873]).addTo(mainLandingLeafletMap);

const StateWiseMarketplaceDatabase = {
    jaipur: {
        name: "Jaipur Hub", coords: [26.9124, 75.7873], acPrice: "₹450", elecPrice: "₹290",
        seoTitle: "SERVO | Top AC Repair & Doorstep Electricians in Jaipur",
        seoDesc: "Verified home repairs in Jaipur city. Book professional mechanics across Mansarovar, Vaishali, and Malviya Nagar.",
        subZones: ['All Areas', 'Mansarovar', 'Vaishali Nagar', 'Malviya Nagar'],
        technicians: ["Amit Sharma", "Deepak Kumar"]
    },
    delhi: {
        name: "Delhi NCR Hub", coords: [28.6139, 77.2090], acPrice: "₹590", elecPrice: "₹350",
        seoTitle: "Emergency Handyman & AC Repair Specialists New Delhi | SERVO",
        seoDesc: "Premium home maintenance services in New Delhi. On-demand doorstep mechanics dispatched instantly.",
        subZones: ['All Areas', 'Connaught Place', 'Gurgaon Sec-45', 'Noida Phase-2'],
        technicians: ["Rajesh Kumar", "Suresh Pal"]
    },
    mumbai: {
        name: "Mumbai Hub", coords: [19.0760, 72.8777], acPrice: "₹690", elecPrice: "₹420",
        seoTitle: "Best Home Repair Services & Appliance Fixing Mumbai | SERVO",
        seoDesc: "Background-checked home mechanics operating across Mumbai Metro zones for instant deployment.",
        subZones: ['All Areas', 'Andheri West', 'Bandra West', 'Colaba Matrix'],
        technicians: ["Milind Gade", "Chetan Shinde"]
    }
};

const TechnicianAvatarAssetDatabase = {
    "Amit Sharma": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=100&h=100&q=80",
    "Deepak Kumar": "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=100&h=100&q=80"
};

function executeCityMarketplaceShift() {
    selectedHubCityToken = document.getElementById('ddlCitySelectorNode').value;
    const context = StateWiseMarketplaceDatabase[selectedHubCityToken];
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

    const techSelectContainer = document.getElementById('divTechSelectorList');
    techSelectContainer.innerHTML = "";
    context.technicians.forEach(techName => {
        const btn = document.createElement('button');
        btn.style.background = "#18181b"; btn.style.padding = "14px"; btn.className = "location-pill";
        btn.style.width = "100%"; btn.innerHTML = `<strong>${techName}</strong>`;
        btn.onclick = () => initializeTechnicianSession(techName);
        techSelectContainer.appendChild(btn);
    });
}

const LocalNotificationPipelineChannel = new BroadcastChannel('servo_push_simulation_matrix_2026');
LocalNotificationPipelineChannel.onmessage = function(event) {
    if (event.data.actionType === "PUSH_ALERT") {
        triggerToastFeedback(`🔔 NOTIFICATION: ${event.data.title}\n${event.data.body}`);
        if (event.data.assignedTechName && document.getElementById('lblCustTrackedTechName')) {
            document.getElementById('lblCustTrackedTechName').innerText = event.data.assignedTechName;
        }
    }
};

function processLocalImagePreview(inputElement) {
    const file = inputElement.files[0]; if (!file) return;
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
function closeDispatchPrompt() { document.getElementById('dispatchModalWindow').style.display = 'none'; }

function triggerToastFeedback(messageText, isErrorState = false) {
    const bubble = document.createElement('div');
    bubble.className = `custom-toast-bubble ${isErrorState ? 'error-toast' : ''}`;
    bubble.innerText = messageText; document.body.appendChild(bubble);
    setTimeout(() => { bubble.remove(); }, 4000);
}

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
            applianceImage: serializedAppliancePhotoData,
            targetCity: selectedHubCityToken
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
            serializedAppliancePhotoData = null;
        }
    })
    .catch(() => surfaceActiveNetworkInterruptionBanner());
});

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
}

function exitToMainHome() {
    document.getElementById('customerDashboardPanel').style.display = 'none';
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    if(document.getElementById('mainCoreAppWindowView')) document.getElementById('mainCoreAppWindowView').style.display = 'block';
}

function evaluateCustomerActivePipeline() {
    // Read dynamic user bookings from live MongoDB collection registry vectors
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/bookings`)
        .then(res => res.json())
        .then(res => {
            const container = document.getElementById('customerPastBookingsContainer');
            container.innerHTML = "";
            res.bookingsQueue.forEach(booking => {
                const row = document.createElement('div');
                row.style.background = "#121214"; row.style.padding = "15px"; row.style.borderRadius = "8px"; row.style.marginBottom = "10px";
                row.innerHTML = `<strong>${booking.serviceType}</strong> - ${booking.status} <span style="float:right; color:#00e5ff;">₹${booking.billingAmount}</span>`;
                container.appendChild(row);
            });
        });
}

function openTechnicianIdentityGate() { document.getElementById('techIdentitySelectionModal').style.display = 'flex'; }

function initializeTechnicianSession(selectedTechNameString) {
    document.getElementById('techIdentitySelectionModal').style.display = 'none';
    activeTechnicianProfileName = selectedTechNameString;
    document.getElementById('techWelcomeHeader').innerText = `Console: ${activeTechnicianProfileName}`;
    switchToPanel('technician');
    pullActiveTechnicianJobsRegistryLoop();
}

function pullActiveTechnicianJobsRegistryLoop() {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/bookings`)
        .then(res => res.json())
        .then(response => {
            if (response.success) {
                const targetedTechJobs = response.bookingsQueue.filter(job => job.assignedPartner === activeTechnicianProfileName);
                renderTechnicianJobQueueGrid(targetedTechJobs);
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
        card.innerHTML = `
            <h5>${job.serviceType}</h5><p>${job.flatAddress}</p>
            <button onclick="executeTechnicianJobCompletion('${job._id}')" style="width:100%; background:#00e676; color:#000; padding:10px; margin-top:10px; border:none; border-radius:6px; font-weight:800; cursor:pointer;">Mark Completed ✅</button>
        `;
    });
}

function toggleTechDutyState() { triggerToastFeedback("Duty updated inside live session storage parameters."); }

function executeTechnicianJobCompletion(bookingId) {
    const activeSessionToken = sessionStorage.getItem('servo_admin_token');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/mutate-job-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeSessionToken}` },
        body: JSON.stringify({ bookingId: bookingId, technicianName: activeTechnicianProfileName, targetStatus: "Completed" })
    })
    .then(() => {
        pullActiveTechnicianJobsRegistryLoop();
    });
}

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
            toggleAdminLoginForm(); launchSecureProductionAdminPortal();
        }
    });
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
        }
    });
}

function populateMetricsGridTable(bookingsQueueArray) {
    const tbody = document.getElementById('adminLiveBookingTableBody');
    if (!tbody) return; tbody.innerHTML = "";
    bookingsQueueArray.forEach(booking => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #1a1a1e"; tbody.appendChild(row);
        row.innerHTML = `
            <td style="padding: 15px 20px;"><strong>${booking.customerName}</strong></td>
            <td style="padding: 15px 20px;"><span>${booking.serviceType}</span></td>
            <td style="padding: 15px 20px;">${booking.flatAddress}</td>
            <td style="padding: 15px 20px;">● ${booking.status.toUpperCase()}</td>
            <td style="padding: 15px 20px; text-align:right;">
                <select onchange="executeServerStatusMutation('${booking._id}', this.value)" style="background:#1a1a1e; color:#fff; border:1px solid #333; padding:6px; border-radius:4px;">
                    <option value="">-- Assign --</option>
                    <option value="Amit Sharma|Assigned">Assign Amit</option>
                    <option value="Deepak Kumar|Assigned">Assign Deepak</option>
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeSessionToken}` },
        body: JSON.stringify({ bookingId: bookingId, technicianName: tokens[0], targetStatus: tokens[1] })
    })
    .then(() => { pullLiveAggregatedBusinessMetrics(); });
};

function validateIndianPhoneField(el) { el.style.borderColor = "#333"; }
function surfaceActiveNetworkInterruptionBanner() { document.getElementById('globalNetworkErrorBanner').style.display = "flex"; }
function retryLastNetworkOperation() { location.reload(); }
document.addEventListener("DOMContentLoaded", () => { executeCityMarketplaceShift(); });
// ADD TO THE BOTTOM OF APP.JS
document.getElementById('frmRegisterTechNode').addEventListener('submit', function(e) {
    e.preventDefault();
    const activeSessionToken = sessionStorage.getItem('servo_admin_token');
    
    const payload = {
        techName: document.getElementById('regTechName').value,
        techPhone: document.getElementById('regTechPhone').value,
        techSkill: document.getElementById('regTechSkill').value,
        techCity: document.getElementById('regTechCity').value
    };

    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/register-technician`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeSessionToken}`
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.success) {
            triggerToastFeedback("🎉 Pro Saved Successfully into MongoDB permanent cloud logs!");
            document.getElementById('frmRegisterTechNode').reset();
        } else {
            triggerToastFeedback(data.message, true);
        }
    });
});