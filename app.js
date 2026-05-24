const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com"; 

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};
let serializedAppliancePhotoData = null;
let userDutyStateActive = true;
let activeTechnicianProfileName = "";

// Initialize Leaflet Mapping Layers
let mainLandingLeafletMap = L.map('leafletCoreMapContainer', { zoomControl: false }).setView([26.9124, 75.7873], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mainLandingLeafletMap);
let mainLandingMarker = L.marker([26.9124, 75.7873]).addTo(mainLandingLeafletMap);

// ==========================================
// 🗺️ STATE-WISE GEOGRAPHICAL DATA MATRIX SYSTEM (Item 12 Upgrade)
// ==========================================
const StateWiseMarketplaceDatabase = {
    "Rajasthan": {
        "Jaipur": {
            coords: [26.9124, 75.7873], acPrice: "₹450", elecPrice: "₹290",
            seoTitle: "SERVO | Top AC Repair & Doorstep Electricians in Jaipur",
            seoDesc: "Verified home repairs in Jaipur city. Book professional mechanics across Mansarovar, Vaishali, and Malviya Nagar.",
            subZones: ['All Jaipur', 'Mansarovar Hub', 'Vaishali Nagar', 'Malviya Nagar Area'],
            technicians: ["Amit Sharma", "Deepak Kumar"]
        },
        "Jodhpur": {
            coords: [26.2389, 73.0243], acPrice: "₹420", elecPrice: "₹250",
            seoTitle: "Emergency Plumbers & Electrician Services in Jodhpur | SERVO",
            seoDesc: "Hyperlocal on-demand repairs in Jodhpur. Get top background-verified home fix specialists in 45 minutes.",
            subZones: ['All Jodhpur', 'Sardarpura Sector', 'Shastri Nagar Grid', 'Ratanada Circle'],
            technicians: ["Gopal Singh", "Karan Bhati"]
        }
    },
    "Delhi NCR": {
        "New Delhi": {
            coords: [28.6139, 77.2090], acPrice: "₹590", elecPrice: "₹350",
            seoTitle: "24/7 Handyman & AC Repair Specialists New Delhi | SERVO",
            seoDesc: "Premium home maintenance services in New Delhi. On-demand doorstep mechanics dispatched instantly.",
            subZones: ['All Delhi Central', 'Connaught Place Sec', 'Saket Hub Node', 'Dwarka Sector Grid'],
            technicians: ["Rajesh Kumar", "Suresh Pal"]
        },
        "Gurgaon": {
            coords: [28.4595, 77.0266], acPrice: "₹650", elecPrice: "₹390",
            seoTitle: "Verified Doorstep Electricians & Plumbers in Gurgaon | SERVO",
            seoDesc: "Corporate home operations repair grids across Gurgaon Cyber City and residential complexes.",
            subZones: ['All Gurgaon', 'DLF Phase 3', 'Sohna Road Local', 'Sector 56 Matrix'],
            technicians: ["Vikas Yadav", "Rohan Mehta"]
        }
    },
    "Maharashtra": {
        "Mumbai": {
            coords: [19.0760, 72.8777], acPrice: "₹690", elecPrice: "₹420",
            seoTitle: "Best Home Repair Services & Appliance Fixed Mumbai | SERVO",
            seoDesc: "Background-checked home mechanics operating across Mumbai Metro zones for instant deployment.",
            subZones: ['All Mumbai Central', 'Andheri West Lanes', 'Bandra Matrix Link', 'Colaba Portal Core'],
            technicians: ["Milind Gade", "Chetan Shinde"]
        }
    }
};

// INITIALIZE DROP-DOWNS AUTO-POPULATION ON WEB BOOT
document.addEventListener("DOMContentLoaded", () => {
    const stateDropdown = document.getElementById('ddlStateSelectorNode');
    stateDropdown.innerHTML = "";
    
    // Add corporate options lists
    Object.keys(StateWiseMarketplaceDatabase).forEach(stateName => {
        const option = document.createElement('option');
        option.value = stateName; option.innerText = stateName;
        stateDropdown.appendChild(option);
    });

    populateCitiesDropdownBasedOnState(); // Cascade initialization down to city dropdown
});

function populateCitiesDropdownBasedOnState() {
    const selectedState = document.getElementById('ddlStateSelectorNode').value;
    const cityDropdown = document.getElementById('ddlCitySelectorNode');
    cityDropdown.innerHTML = "";

    const availableCitiesList = Object.keys(StateWiseMarketplaceDatabase[selectedState]);
    availableCitiesList.forEach(cityName => {
        const option = document.createElement('option');
        option.value = cityName; option.innerText = cityName;
        cityDropdown.appendChild(option);
    });

    executeCityMarketplaceShift(); // Commit configuration mapping immediately
}

function executeCityMarketplaceShift() {
    const selectedState = document.getElementById('ddlStateSelectorNode').value;
    const selectedCity = document.getElementById('ddlCitySelectorNode').value;
    
    const context = StateWiseMarketplaceDatabase[selectedState][selectedCity];
    if (!context) return;

    // 1. Swap active pricing nodes instantly down the tier list
    document.getElementById('lblPriceAc').innerText = context.acPrice;
    document.getElementById('lblPriceElec').innerText = context.elecPrice;

    // 2. Adjust corporate text loops and local crawling tokens
    document.getElementById('dynamicAppSEOTitle').innerText = context.seoTitle;
    document.getElementById('dynamicAppSEODesc').setAttribute('content', context.seoDesc);

    // 3. Pan coordinates bounds instantly to center over newly matched city parameters
    mainLandingLeafletMap.setView(context.coords, 12);
    mainLandingMarker.setLatLng(context.coords);

    // 4. Reset sub-pilled neighborhood sub-sectors configurations dynamically
    const pillContainer = document.getElementById('divSubZonePillContainer');
    pillContainer.innerHTML = "";
    context.subZones.forEach((zone, idx) => {
        const pill = document.createElement('button');
        pill.className = `location-pill ${idx === 0 ? 'active-hub' : ''}`;
        pill.innerText = zone;
        pill.onclick = () => {
            document.querySelectorAll('.location-pill').forEach(p => p.classList.remove('active-hub'));
            pill.classList.add('active-hub');
            triggerToastFeedback(`Sub-zone mapped: ${zone}`);
        };
        pillContainer.appendChild(pill);
    });

    // 5. Update technician routing permissions exclusively for this city boundary layer
    const techSelectContainer = document.getElementById('divTechSelectorList');
    techSelectContainer.innerHTML = "";
    context.technicians.forEach(techName => {
        const btn = document.createElement('button');
        btn.style.background = "#18181b"; btn.style.padding = "14px"; btn.className = "location-pill";
        btn.style.width = "100%"; btn.style.textAlign = "left"; btn.style.color = "#fff";
        btn.innerHTML = `<strong>${techName}</strong> <span style="float:right; color:#666;">➔</span>`;
        btn.onclick = () => initializeTechnicianSession(techName);
        techSelectContainer.appendChild(btn);
    });

    triggerToastFeedback(`System configured for: ${selectedCity}, ${selectedState}`);
}

// ==========================================
// 🔔 BROADCAST CHANNELS PUSH ALERTS SIMULATION
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

// SECURE FORM HANDSHAKES SUBMISSIONS
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const cityStr = document.getElementById('ddlCitySelectorNode').value;
    cachedBookingFormData = {
        customerName: document.getElementById('bookingCustomerName').value,
        customerPhone: document.getElementById('bookingCustomerPhone').value,
        serviceType: activeSelectedServiceGlobalType,
        flatAddress: document.getElementById('bookingFlatAddress').value + ` (${cityStr.toUpperCase()})`,
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
            document.getElementById('lblSuccessPro').innerText = "Unassigned (HQ Central)";
            document.getElementById('successScreenOverlay').style.display = 'flex';
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
            serializedAppliancePhotoData = null;
            dispatchMockPushPayload("📍 Request Logged", "Ticket allocated on state server registries.");
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
        const cityStr = document.getElementById('ddlCitySelectorNode').value;
        const stateStr = document.getElementById('ddlStateSelectorNode').value;
        let activeCoords = StateWiseMarketplaceDatabase[stateStr][cityStr].coords;
        
        let trackerMap = L.map('leafletLiveTrackingDashboardMap', { zoomControl: false }).setView(activeCoords, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(trackerMap);
        L.marker(activeCoords).addTo(trackerMap); 
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
            renderTechnicianJobQueueGrid([{ _id: "664f15e8c", customerName: "Sarthak Jain", customerPhone: "9257809277", serviceType: "ELECTRICIAN", flatAddress: "Central Cluster Complex Sector Area", status: "Assigned" }]);
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
        dispatchMockPushPayload("✅ Service Finalized", `${activeTechnicianProfileName} has signed off your active ticket.`);
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
        populateMetricsGridTable([{ _id: "664f12b", customerName: "Sarthak Jain", customerPhone: "9257809277", serviceType: "AC_REPAIR", flatAddress: "Mansarovar Central Matrix Hub", status: "Pending", assignedPartner: "Unassigned" }]);
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