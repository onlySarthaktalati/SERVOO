const CLOUD_BACKEND_API_LINK = 'https://servoo0-backend.onrender.com';
let customMinimizedMapInstance;
let cachedBookingFormData = {};

// 🍞 TACTICAL PRODUCTION TOAST UTILITY SYSTEM
function triggerToastFeedback(message, isError = false) {
    const container = document.getElementById('toastNotificationContainer');
    const toast = document.createElement('div');
    toast.className = `custom-toast-bubble ${isError ? 'error-toast' : ''}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'scale(0.9)';
        toast.style.transition = 'all 0.2s standard';
        setTimeout(() => toast.remove(), 200);
    }, 4000);
}

// 🧭 SCROLL NAVIGATION CORE
function scrollToSection(id) {
    const target = document.getElementById(id);
    if(target) target.scrollIntoView({ behavior: 'smooth' });
}

// ☰ DRAWER CONTROLS
function toggleNavigationDrawer() {
    document.getElementById('sideDrawerMenu').classList.toggle('open');
    document.getElementById('drawerOverlay').classList.toggle('open');
}

function navigateDrawerAction(targetView) {
    toggleNavigationDrawer();
    document.querySelectorAll('.drawer-nav-link').forEach(btn => btn.classList.remove('active'));
    document.body.classList.remove('admin-mode-active');
    
    document.getElementById('userViewInterface').style.display = 'none';
    document.getElementById('adminViewInterface').style.display = 'none';
    document.getElementById('requestSubPane').style.display = 'none';
    document.getElementById('onboardFormSpace').style.display = 'none';

    if(targetView === 'home') {
        document.getElementById('btnHome').classList.add('active');
        document.getElementById('userViewInterface').style.display = 'block';
        document.getElementById('requestSubPane').style.display = 'block';
        if(customMinimizedMapInstance) setTimeout(() => customMinimizedMapInstance.invalidateSize(), 50);
    } else if (targetView === 'fleet') {
        document.getElementById('btnOnboard').classList.add('active');
        document.getElementById('userViewInterface').style.display = 'block';
        document.getElementById('onboardFormSpace').style.display = 'block';
    } else if (targetView === 'admin') {
        document.body.classList.add('admin-mode-active');
        document.getElementById('btnAdmin').classList.add('active');
        document.getElementById('adminViewInterface').style.display = 'block';
        pullOperationalLogisticsTelemetry();
    }
}

// 🗺️ MAP ENGINE
function initMinimizedDisplayMap() {
    customMinimizedMapInstance = L.map('minimizedMap', {zoomControl: false}).setView([26.9124, 75.7873], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(customMinimizedMapInstance);
}

// 📊 ADMIN HQ WORKER POLLING
function pullOperationalLogisticsTelemetry() {
    fetch(`${CLOUD_BACKEND_API_LINK}/api/bookings`)
        .then(res => res.json())
        .then(bookings => {
            const logContainer = document.getElementById('telemetryStreamTarget');
            logContainer.innerHTML = bookings.length === 0 ? '<p style="color:#444; text-align:center; padding: 40px 0; font-size:13px;">No active bookings found.</p>' : '';
            bookings.forEach(b => {
                logContainer.innerHTML += `
                    <div class="telemetry-pipeline-card">
                        <h4>${b.customerName} <span class="live-tag">${b.status}</span></h4>
                        <p><b>Service:</b> ${b.serviceType}<br><b>Address:</b> ${b.flatAddress}</p>
                        <button class="resolve-btn" onclick="terminateCaseLog('${b._id}')">Complete Job</button>
                    </div>`;
            });
        }).catch(() => {
            triggerToastFeedback("Failed to sync live booking data channels.", true);
        });
}

function terminateCaseLog(id) { 
    fetch(`${CLOUD_BACKEND_API_LINK}/api/bookings/${id}`, { method: 'DELETE' })
        .then(() => {
            triggerToastFeedback("Job status cleared successfully.");
            pullOperationalLogisticsTelemetry();
        }); 
}

// 📋 MODAL STEPS INTERFACES
function openDispatchPrompt(serviceTitle) { 
    document.getElementById('selectedServiceTypeField').value = serviceTitle; 
    document.getElementById('modalLabelHeader').innerText = `Book ${serviceTitle}`; 
    document.getElementById('bookingModalPrompt').style.display = 'flex'; 
}

function closeDispatchPrompt() { 
    document.getElementById('bookingModalPrompt').style.display = 'none'; 
    document.getElementById('bookingSubmissionForm').style.display = 'block';
    document.getElementById('bookingOtpVerificationForm').style.display = 'none';
}

function closeSuccessOverlay() {
    document.getElementById('successScreenOverlay').style.display = 'none';
}

// ✉️ ACTION 1: SEND PHONE FOR OTP VERIFICATION
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('btnRequestOtp');
    
    // UI State Feedback
    submitBtn.disabled = true;
    submitBtn.innerText = "Sending Code...";

    cachedBookingFormData = {
        customerName: document.getElementById('custName').value,
        customerPhone: document.getElementById('custPhone').value,
        serviceType: document.getElementById('selectedServiceTypeField').value,
        flatAddress: document.getElementById('custAddr').value
    };

    fetch(`${CLOUD_BACKEND_API_LINK}/api/auth/send-otp`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phone: cachedBookingFormData.customerPhone })
    })
    .then(res => {
        submitBtn.disabled = false;
        submitBtn.innerText = "Send Verification OTP";
        
        if (res.ok) {
            triggerToastFeedback("Verification code sent to your mobile device.");
            document.getElementById('bookingSubmissionForm').style.display = 'none';
            document.getElementById('bookingOtpVerificationForm').style.display = 'block';
        } else {
            triggerToastFeedback("Failed to send OTP code. Try again.", true);
        }
    })
    .catch(() => {
        submitBtn.disabled = false;
        submitBtn.innerText = "Send Verification OTP";
        triggerToastFeedback("Network timeout. Backend server waking up.", true);
    });
});

// 🔐 ACTION 2: COUPLER VERIFY AND TRIGGER SUCCESS FRAMEWORK SHEET
document.getElementById('bookingOtpVerificationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const verifyBtn = document.getElementById('btnVerifyOtp');
    const typedCode = document.getElementById('bookingVerifiedOtpInput').value;
    
    verifyBtn.disabled = true;
    verifyBtn.innerText = "Verifying Verification Code...";

    fetch(`${CLOUD_BACKEND_API_LINK}/api/book-service-secure`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ...cachedBookingFormData, otp: typedCode })
    })
    .then(res => res.json())
    .then(data => {
        verifyBtn.disabled = false;
        verifyBtn.innerText = "Verify & Complete Booking";
        closeDispatchPrompt();

        if(data.success) {
            // Set values inside Premium Custom Success Card
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType;
            document.getElementById('lblSuccessPro').innerText = data.assignedPartner || "Rahul Sharma Assigned";
            
            // Pop the sheet modal natively
            document.getElementById('successScreenOverlay').style.display = 'flex';
            
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
        } else {
            triggerToastFeedback("Invalid verification code number.", true);
        }
    })
    .catch(() => {
        verifyBtn.disabled = false;
        verifyBtn.innerText = "Verify & Complete Booking";
        closeDispatchPrompt();
        triggerToastFeedback("Connection validation timeout.", true);
    });
});

// SPECIALIST ONBOARDING ROUTE
document.getElementById('fleetRegistrationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const partnerBtn = document.getElementById('btnSubmitPartner');
    partnerBtn.disabled = true;
    partnerBtn.innerText = "Registering Profile...";

    fetch(`${CLOUD_BACKEND_API_LINK}/api/register-provider`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: document.getElementById('partnerName').value, trade: document.getElementById('partnerTrade').value, phone: document.getElementById('partnerPhone').value, city: document.getElementById('partnerCity').value })
    }).then(() => {
        partnerBtn.disabled = false;
        partnerBtn.innerText = "Register Specialist Node";
        triggerToastFeedback("Registration logged successfully.");
        document.getElementById('fleetRegistrationForm').reset();
        navigateDrawerAction('home');
    }).catch(() => {
        partnerBtn.disabled = false;
        partnerBtn.innerText = "Register Specialist Node";
        triggerToastFeedback("Failed to update fleet directory.", true);
    });
});

initMinimizedDisplayMap();
setInterval(() => { if(document.body.classList.contains('admin-mode-active')) pullOperationalLogisticsTelemetry(); }, 5000);