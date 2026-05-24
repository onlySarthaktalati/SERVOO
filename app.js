const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let serializedAppliancePhotoData = null;
let userDutyStateActive = true;
let activeTechnicianProfileName = "";
let selectedMarketplaceCityToken = "jaipur"; // Default Fallback

// Initialize Master Map System Variables
let mainLandingLeafletMap = L.map('leafletCoreMapContainer', { zoomControl: false }).setView([26.9124, 75.7873], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mainLandingLeafletMap);
let mainLandingMarker = L.marker([26.9124, 75.7873]).addTo(mainLandingLeafletMap);

// ==========================================
// 🌍 MULTI-CITY LOGISTICS REGISTRY ENGINES (Item 12 Pivot)
// ==========================================
const GlobalCityMarketplaceMatrix = {
    jaipur: {
        name: "Jaipur Hub",
        coords: [26.9124, 75.7873],
        acPrice: "₹450", elecPrice: "₹290",
        seoTitle: "SERVO | Best Electricians, Plumbers & AC Repair in Jaipur",
        seoDesc: "Get premium background-verified technicians in Jaipur directly at your doorstep within 45 minutes.",
        subZones: ['All Hubs', 'Mansarovar', 'Vaishali Nagar', 'Malviya Nagar'],
        technicians: [
            { name: "Amit Sharma", role: "Electrician" },
            { name: "Deepak Kumar", role: "Plumber" }
        ]
    },
    delhi: {
        name: "Delhi NCR Hub",
        coords: [28.6139, 77.2090],
        acPrice: "₹590", elecPrice: "₹350", // Higher dynamic Tier Pricing rules for Metros
        seoTitle: "Emergency Electricians & AC Repair in Delhi NCR | SERVO",
        seoDesc: "Professional doorstep home repairs across Delhi, Gurgaon, and Noida in 45 minutes flat.",
        subZones: ['All Hubs', 'Connaught Place', 'Gurgaon Sec-45', 'Noida Phase-2'],
        technicians: [
            { name: "Rajesh Kumar", role: "Electrician" },
            { name: "Suresh Pal", role: "Plumber" }
        ]
    },
    mumbai: {
        name: "Mumbai Central Hub",
        coords: [19.0760, 72.8777],
        acPrice: "₹650", elecPrice: "₹390",
        seoTitle: "Premium On-Demand Plumbers & Home Repair Mumbai | SERVO",
        seoDesc: "Top background-verified home maintenance specialists across Mumbai Metro zones.",
        subZones: ['All Hubs', 'Andheri West', 'Bandra Local', 'Colaba Matrix'],
        technicians: [
            { name: "Milind Gade", role: "Electrician" },
            { name: "Chetan Shinde", role: "Plumber" }
        ]
    }
};

function bootstrapMarketplaceZone(citySlugKey) {
    selectedMarketplaceCityToken = citySlugKey;
    const cityConfig = GlobalCityMarketplaceMatrix[citySlugKey];
    if (!cityConfig) return;

    // 1. Clear Gatekeeper View Overlay
    document.getElementById('servoGlobalCityGatekeeperModal').style.display = 'none';

    // 2. Adjust pricing metrics labels based on city Tier arrays
    document.getElementById('lblPriceAc').innerText = cityConfig.acPrice;
    document.getElementById('lblPriceElec').innerText = cityConfig.elecPrice;

    // 3. Mutate header status badges and crawler parameters
    document.getElementById('lblCurrentSEOZoneBadge').innerText = `📍 ${cityConfig.name}: All Hubs`;
    document.getElementById('dynamicAppSEOTitle').innerText = cityConfig.seoTitle;
    document.getElementById('dynamicAppSEODesc').setAttribute('content', cityConfig.seoDesc);

    // 4. Center-pan mapping matrices over target city limits
    mainLandingLeafletMap.setView(cityConfig.coords, 12);
    mainLandingMarker.setLatLng(cityConfig.coords);

    // 5. Build neighborhood sub-zone sub-pills dynamically
    const pillContainer = document.getElementById('divSubZonePillContainer');
    pillContainer.innerHTML = "";
    cityConfig.subZones.forEach((zone, idx) => {
        const pill = document.createElement('button');
        pill.className = `location-pill ${idx === 0 ? 'active-hub' : ''}`;
        pill.innerText = zone;
        pill.onclick = () => {
            document.querySelectorAll('.location-pill').forEach(p => p.classList.remove('active-hub'));
            pill.classList.add('active-hub');
            document.getElementById('lblCurrentSEOZoneBadge').innerText = `📍 ${cityConfig.name}: ${zone}`;
        };
        pillContainer.appendChild(pill);
    });

    // 6. Bind technician authorization select options dynamically to avoid profile cross leaks
    const techSelectContainer = document.getElementById('divTechSelectorList');
    techSelectContainer.innerHTML = "";
    cityConfig.technicians.forEach(tech => {
        const btn = document.createElement('button');
        btn.className = "city-grid-btn";
        btn.style.background = "#18181b"; btn.style.padding = "14px";
        btn.innerHTML = `<div><strong>${tech.name}</strong> <p style="font-size:0.7rem; color:#666;">${tech.role}</p></div> <span>Select</span>`;
        btn.onclick = () => initializeTechnicianSession(tech.name);
        techSelectContainer.appendChild(btn);
    });

    triggerToastFeedback(`Marketplace re-routed to: ${cityConfig.name}`);
}

// ==========================================
// 🔔 SIMULATION COMMUNICATIONS PIPE BROADCAMPERS
// ==========================================
const LocalNotificationPipelineChannel = new BroadcastChannel('servo_push_simulation_matrix_2026');
LocalNotificationPipelineChannel.onmessage = function(event) {
    if (event.data.actionType === "PUSH_ALERT") {
        triggerToastFeedback(`🔔 NOTIFICATION: ${event.data.title}\n${event.data.body}`);
    }
};
function dispatchMockPushPayload(alertTitle, alertBody) {
    LocalNotificationPipelineChannel.postMessage({ actionType: "PUSH_ALERT", title: alertTitle, body: alertBody });
    triggerToastFeedback(`🔔 NOTIFICATION: ${alertTitle}\n${alertBody}`);
}

// 📸 APPLIANCE PHOTOS PROCESSING CORDS
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
function closeDispatchPrompt() { document.getElementById('dispatchModalWindow').style.display = 'none'; }

function triggerToastFeedback(messageText, isErrorState = false) {
    const bubble = document.createElement('div');
    bubble.className = `custom-toast-bubble ${isErrorState ? 'error-toast' : ''}`;
    bubble.innerText = messageText; document.body.appendChild(bubble);
    setTimeout(() => { bubble.remove(); }, 4000);
}

// CLIENT TRANSMISSION DISPATCH TRIGGER BINDINGS
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    cachedBookingFormData = {
        customerName: document.getElementById('bookingCustomerName').value,
        customerPhone: document.getElementById('bookingCustomerPhone').value,
        serviceType: activeSelectedServiceGlobalType,
        flatAddress: document.getElementById('bookingFlatAddress').value + ` (${selectedMarketplaceCityToken.toUpperCase()})`,
        appliancePhoto: serializedAppliancePhotoData
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
            applianceImage: cachedBookingFormData.appliancePhoto
        })
    })
    .then(res => res.json())
    .then(finalData => {
        closeDispatchPrompt();
        if(finalData.success) {
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
            document.getElementById('lblSuccessPro').innerText = "Unassigned (Pending HQ Allocation)";
            document.getElementById('successScreenOverlay').style.display = 'flex';
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
            serializedAppliancePhotoData = null;
            
            dispatchMockPushPayload("📍 Request Transmitted", `Your repair ticket has landed on the ${selectedMarketplaceCityToken.toUpperCase()} central cluster.`);
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
    setTimeout(() => { mainLandingLeafletMap.invalidateSize(); }, 250);
}

function exitToMainHome() {
    document.getElementById('customerDashboardPanel').style.display = 'none';
    document.getElementById('technicianDashboardPanel').style.display = 'none';
    if(document.getElementById('mainCoreAppWindowView')) document.getElementById('mainCoreAppWindowView').style.display = 'block';
}

function evaluateCustomerActivePipeline() {
    setTimeout(() => {
        let currentCityCoords = GlobalCityMarketplaceMatrix[selectedMarketplaceCityToken].coords;
        let trackerMap = L.map('leafletLiveTrackingDashboardMap', { zoomControl: false }).setView(currentCityCoords, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(trackerMap);
        L.marker(currentCityCoords).addTo(trackerMap); 
    }, 200);
    if (cachedBookingFormData && cachedBookingFormData.customerName) {
        document.getElementById('activeBookingCard').style.display = 'block';
        document.getElementById('custActiveServiceType').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
    } else {
        document.getElementById('activeBookingCard').style.display = 'block';
        document.getElementById('custActiveServiceType').innerText = "Premium Electrical Overhaul";
    }
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
                const targetedTechJobs = response.data.filter(job => job.assignedPartner === activeTechnicianProfileName);
                renderTechnicianJobQueueGrid(targetedTechJobs);
            }
        })
        .catch(() => {
            const fallbackTechMockQueue = [
                { _id: "664f15e8c", customerName: "Sarthak Jain", customerPhone: "9257809277", serviceType: "ELECTRICIAN", flatAddress: "Hub Sector Complex Area", status: "Assigned" }
            ];
            renderTechnicianJobQueueGrid(fallbackTechMockQueue);
        });
}

function renderTechnicianJobQueueGrid(jobsArray) {
    const queueContainer = document.getElementById('techActiveJobsQueue');
    if (!queueContainer) return; queueContainer.innerHTML = "";
    if (jobsArray.length === 0) {
        queueContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#666; background:#121214; border-radius:8px;">📭 No active assignments.</div>`;
        return;
    }
    jobsArray.forEach(job => {
        const card = document.createElement('div');
        card.style.background = "#121214"; card.style.border = "1px solid #27272a"; card.style.padding = "20px"; card.style.borderRadius = "10px";
        queueContainer.appendChild(card);
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <h5 style="font-weight:700; color:#00e5ff;">${job.serviceType}</h5>
                <span style="color:#ffb300; font-size:0.8rem; font-weight:700;">● ${job.status.toUpperCase()}</span>
            </div>
            <p style="font-size:0.9rem; color:#ccc; margin-bottom:6px;"><strong>Client:</strong> ${job.customerName}</p>
            <p style="font-size:0.9rem; color:#ccc; margin-bottom:15px;"><strong>Location:</strong> ${job.flatAddress}</p>
            <button onclick="executeTechnicianJobCompletion('${job._id}')" style="width:100%; background:#00e676; color:#000; padding:10px; border:none; border-radius:6px; font-weight:800; cursor:pointer;">Complete Assignment ✅</button>
        `;
    });
}

function toggleTechDutyState() {
    const btn = document.getElementById('btnTechAvailabilityToggle');
    userDutyStateActive = !userDutyStateActive;
    btn.innerText = userDutyStateActive ? "Duty: ON" : "Duty: OFF";
    btn.style.background = userDutyStateActive ? "#00e676" : "#ff1744";
    btn.style.color = userDutyStateActive ? "#000" : "#fff";
}

function executeTechnicianJobCompletion(bookingId) {
    const activeSessionToken = sessionStorage.getItem('servo_admin_token');
    fetch(`${CLOUD_BACKEND_API_LINK}/api/admin/mutate-job-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeSessionToken}` },
        body: JSON.stringify({ bookingId: bookingId, technicianName: activeTechnicianProfileName, targetStatus: "Completed" })
    })
    .then(() => {
        dispatchMockPushPayload("✅ Service Finalized", `${activeTechnicianProfileName} has signed off the active ticket.`);
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
        } else { triggerToastFeedback(data.message, true); }
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
    })
    .catch(() => {
        document.getElementById('lblMetricsGrossRevenue').innerText = "₹1,480";
        document.getElementById('lblMetricsLiveJobs').innerText = "1";
        populateMetricsGridTable([{ _id: "664f12b", customerName: "Sarthak Jain", customerPhone: "9257809277", serviceType: "AC_REPAIR", flatAddress: "Mansarovar Grid Sector", status: "Pending", assignedPartner: "Unassigned" }]);
    });
}

function populateMetricsGridTable(bookingsQueueArray) {
    const tbody = document.getElementById('adminLiveBookingTableBody');
    if (!tbody) return; tbody.innerHTML = "";
    bookingsQueueArray.forEach(booking => {
        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #1a1a1e"; tbody.appendChild(row);
        row.innerHTML = `
            <td style="padding: 15px 20px;"><strong>${booking.customerName}</strong><br><small style="color:#666;">${booking.customerPhone}</small></td>
            <td style="padding: 15px 20px;"><span style="color:#00e5ff;">${booking.serviceType}</span></td>
            <td style="padding: 15px 20px; color:#aaa;">${booking.flatAddress}</td>
            <td style="padding: 15px 20px; font-weight:700; font-size:0.8rem;">● ${booking.status.toUpperCase()}</td>
            <td style="padding: 15px 20px; text-align:right;">
                <select onchange="executeServerStatusMutation('${booking._id}', this.value)" style="background:#1a1a1e; color:#fff; border:1px solid #333; padding:6px; border-radius:4px; font-size:0.8rem;">
                    <option value="">-- Change Pipeline --</option>
                    <option value="Amit Sharma|Assigned">Assign Amit</option>
                    <option value="Deepak Kumar|Assigned">Assign Deepak</option>
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${activeSessionToken}` },
        body: JSON.stringify({ bookingId: bookingId, technicianName: tokens[0], targetStatus: tokens[1] })
    })
    .then(() => {
        dispatchMockPushPayload(`👨‍🔧 Status Shift Matrix`, `Ticket parameter modified to: ${tokens[1]}`);
        pullLiveAggregatedBusinessMetrics(); 
    });
};

function validateIndianPhoneField(inputElement) {
    const errorLabel = document.getElementById('lblPhoneValidationError');
    if (inputElement.value === "" || /^[6-9][0-9]{9}$/.test(inputElement.value)) {
        errorLabel.style.display = "none"; inputElement.style.borderColor = "#333";
    } else {
        errorLabel.style.display = "block"; inputElement.style.borderColor = "#ff5252";
    }
}
function surfaceActiveNetworkInterruptionBanner() { document.getElementById('globalNetworkErrorBanner').style.display = "flex"; }
function retryLastNetworkOperation() { location.reload(); }
function openLegalPage() { document.getElementById('legalPageOverlayModal').style.display = "flex"; }