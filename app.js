// 📡 CONFIGURATION VECTOR: Pointing directly to your real, corrected Render domain
const CLOUD_BACKEND_API_LINK = "https://servoo-backend.onrender.com";

let activeSelectedServiceGlobalType = "";
let cachedBookingFormData = {};

// Initialize Hyperlocal Map Framework
let mapInstance = L.map('map', { zoomControl: false }).setView([26.9124, 75.7873], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
L.marker([26.9124, 75.7873]).addTo(mapInstance);

// 🧭 DRAWER CONTROL INTERFACE MECHANICS
function toggleNavigationDrawer() {
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
}

function scrollToSection(elementId) {
    const targetElement = document.getElementById(elementId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
    }
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer.classList.contains('open')) {
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
    const bubble = document.createElement('div');
    bubble.className = `custom-toast-bubble ${isErrorState ? 'error-toast' : ''}`;
    bubble.innerText = messageText;
    container.appendChild(bubble);
    setTimeout(() => { bubble.remove(); }, 4000);
}

// 📱 ACTION 1: CAPTURE DETAILS AND INITIATE SECURITY OTP HANDSHAKE
document.getElementById('bookingSubmissionForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const actionSubmitBtn = document.getElementById('btnInitiateHandshake');
    
    cachedBookingFormData = {
        customerName: document.getElementById('bookingCustomerName').value,
        customerPhone: document.getElementById('bookingCustomerPhone').value,
        serviceType: activeSelectedServiceGlobalType,
        flatAddress: document.getElementById('bookingFlatAddress').value
    };

    actionSubmitBtn.disabled = true; actionSubmitBtn.innerText = "Transmitting Credentials...";

    fetch(`${CLOUD_BACKEND_API_LINK}/api/auth/send-otp`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ phone: cachedBookingFormData.customerPhone })
    })
    .then(res => res.json())
    .then(serverDataResponse => {
        actionSubmitBtn.disabled = false; actionSubmitBtn.innerText = "Send Verification OTP";
        if(serverDataResponse.success) {
            triggerToastFeedback("Security validation code sent to console logs!");
            document.getElementById('bookingSubmissionForm').style.display = 'none';
            document.getElementById('bookingOtpVerificationForm').style.display = 'block';
        } else {
            triggerToastFeedback(serverDataResponse.message || "Authentication transmission failed.", true);
        }
    })
    .catch(() => {
        actionSubmitBtn.disabled = false; actionSubmitBtn.innerText = "Send Verification OTP";
        triggerToastFeedback("Backend connection offline. Please reload.", true);
    });
});

// 🔐 ACTION 2: VERIFY CODE AND IMMEDIATELY SHOW SUCCESS PANEL
document.getElementById('bookingOtpVerificationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const verifyBtn = document.getElementById('btnVerifyOtp');
    const typedCode = document.getElementById('bookingVerifiedOtpInput').value;
    
    verifyBtn.disabled = true; verifyBtn.innerText = "Processing...";

    // Turn on the cool animated radar scanner screen while processing database query strings
    document.getElementById('radarScannerLayer').style.display = 'flex';

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
        verifyBtn.disabled = false; verifyBtn.innerText = "Verify & Complete Booking";
        document.getElementById('radarScannerLayer').style.display = 'none';
        closeDispatchPrompt();

        if(finalData.success) {
            document.getElementById('lblSuccessService').innerText = cachedBookingFormData.serviceType.replace('_', ' ');
            document.getElementById('lblSuccessPro').innerText = finalData.assignedPartner;
            document.getElementById('successScreenOverlay').style.display = 'flex';
            
            document.getElementById('bookingSubmissionForm').reset();
            document.getElementById('bookingOtpVerificationForm').reset();
        } else {
            triggerToastFeedback(finalData.message || "Verification code mismatch.", true);
        }
    })
    .catch(() => {
        verifyBtn.disabled = false; verifyBtn.innerText = "Verify & Complete Booking";
        document.getElementById('radarScannerLayer').style.display = 'none';
        closeDispatchPrompt();
        triggerToastFeedback("Connection validation timeout.", true);
    });
});