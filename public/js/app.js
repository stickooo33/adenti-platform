// 🚀 DEPLOYMENT FIX: Automatically detect if on Localhost or Render
const API_URL = window.location.origin + '/api';

let currentUser = null; 
let currentAppointments = []; 
let currentRating = localStorage.getItem('clinicRating') || 4.9; 
let ratingCount = Number(localStorage.getItem('clinicRatingCount')) || 1;

// 🔊 Notification Sound
const notifSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// ==========================================
// 🍞 PRO TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(type, title, message, duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation'
    };

    toast.innerHTML = `
        <i class="fa-solid ${icons[type]}"></i>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;

    container.appendChild(toast);
    
    // Force a reflow to trigger animation
    toast.offsetHeight; 
    
    setTimeout(() => toast.classList.add('show'), 10);

    const removeToast = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    };

    const autoClose = setTimeout(removeToast, duration);
    toast.onclick = () => {
        clearTimeout(autoClose);
        removeToast();
    };
}

// ==========================================
// 0. SOCKET.IO (REAL-TIME NOTIFICATIONS)
// ==========================================
let socket;
try {
    socket = io(); 

    socket.on('new_appointment', (newAppt) => {
        if (currentUser && currentUser.role === 'secretary') {
            notifSound.play().catch(e => console.log("Sound blocked"));
            showToast('info', 'New Request', `Patient: ${newAppt.patientName}`);
            
            currentAppointments.push(newAppt);
            const currentView = document.querySelector('.sidebar-menu a.active')?.innerText;
            if (currentView?.includes('Front Desk')) switchView('dashboard');
            else if (currentView?.includes('Appointments')) switchView('appointments');
            else if (currentView?.includes('Visual Calendar')) switchView('calendar');
        }
    });

    socket.on('status_update', (data) => {
        const appt = currentAppointments.find(a => a.id == data.id);
        if(appt) {
            appt.status = data.status;
            if(data.date) appt.date = data.date;
            if(data.time) appt.time = data.time;
        }

        if (currentUser && currentUser.role === 'patient' && currentUser.name === data.patientName) {
            const type = data.status === 'Confirmed' ? 'success' : 'info';
            showToast(type, 'Status Updated', `Your appointment is now ${data.status}!`);
            loadDashboard(currentUser);
        }
        if (currentUser && currentUser.role === 'dentist') {
            switchView('schedule');
        }
        // Refresh secretary view if looking at appointments
        if (currentUser && currentUser.role === 'secretary') {
             const currentView = document.querySelector('.sidebar-menu a.active')?.innerText;
             if (currentView?.includes('Appointments')) switchView('appointments');
        }
    });

} catch (e) {
    console.warn("Socket.io not connected. Using local mode.");
}

// ==========================================
// 1. NAVIGATION & UI LOGIC
// ==========================================
function enterPortal() {
    document.getElementById('landing-section').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
}

function goBackHome() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('landing-section').classList.remove('hidden');
    if(typeof initCanvas === 'function') initCanvas();
}

function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.form-content').forEach(f => f.classList.add('hidden'));

    if(tab === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
    } else {
        document.getElementById('signup-form').classList.remove('hidden');
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
    }
}

function toggleAccessCode() {
    const role = document.getElementById('signup-role').value;
    const codeGroup = document.getElementById('access-code-group');
    if (role === 'secretary' || role === 'dentist') {
        codeGroup.classList.remove('hidden');
    } else {
        codeGroup.classList.add('hidden');
        document.getElementById('signup-code').value = '';
    }
}

function logout() { location.reload(); }

function toggleChat() {
    document.getElementById('chat-body').classList.toggle('hidden');
}

function setActiveLink(element) {
    if (!element) return;
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    element.classList.add('active');
}

// ==========================================
// 2. AUTHENTICATION
// ==========================================
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const role = document.getElementById('signup-role').value;
        const accessCode = document.getElementById('signup-code').value;

        try {
            const res = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, password, role, accessCode })
            });
            const data = await res.json();
            
            if (data.success) {
                showToast('success', 'Account Created', 'Please login to continue.');
                setTimeout(() => showTab('login'), 1500);
            } else {
                showToast('error', 'Signup Failed', data.message);
            }
        } catch (err) { 
            showToast('error', 'Server Error', 'Could not reach the authentication server.');
        }
    });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.user;
                showToast('success', 'Success', `Welcome back, ${currentUser.name.split(' ')[0]}!`);
                loadDashboard(currentUser);
            } else {
                showToast('error', 'Access Denied', data.message);
            }
        } catch (err) { 
            showToast('error', 'Server Error', 'Could not connect to the login service.');
        }
    });
}

// ==========================================
// 3. DASHBOARD ENGINE
// ==========================================
async function loadDashboard(user) {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('landing-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');

    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    
    const profileDiv = document.querySelector('.user-profile');
    if (profileDiv) {
        // Includes Theme Toggle Button
        profileDiv.innerHTML = `
            <button class="theme-btn" onclick="toggleTheme()" style="margin-right:20px;">
                <i class="fa-solid fa-moon"></i>
            </button>
            <div style="text-align: right; margin-right: 15px;">
                <div style="font-weight: 700; color: #333; font-size: 1rem;">${timeGreeting}, ${user.name.split(' ')[0]}</div>
                <div style="font-size: 0.85rem; color: #888; text-transform: capitalize; font-weight: 500;">${user.role}</div>
            </div>
            <div class="profile-pic"><i class="fa-solid fa-user"></i></div>
        `;
    }

    try {
        const res = await fetch(`${API_URL}/appointments?role=${user.role}&userId=${user.id}`);
        currentAppointments = await res.json();
        
        try {
            const rateRes = await fetch(`${API_URL}/ratings`);
            if (rateRes.ok) {
                const rateData = await rateRes.json();
                if(rateData.average) {
                    currentRating = parseFloat(rateData.average).toFixed(1);
                    localStorage.setItem('clinicRating', currentRating); 
                }
            }
        } catch(e) {}

        renderSidebar(user.role);
        if (user.role === 'dentist') switchView('overview');
        else if (user.role === 'secretary') switchView('dashboard');
        else switchView('dashboard'); 
        
    } catch (e) {
        showToast('warning', 'Data Offline', 'Showing cached dashboard information.');
    }
}

function renderSidebar(role) {
    const menu = document.getElementById('sidebar-menu');
    const link = (icon, text, viewName) => 
        `<li><a href="#" onclick="switchView('${viewName}', this)"><i class="${icon}"></i> ${text}</a></li>`;

    let html = '';
    if (role === 'dentist') {
        html = `${link('fa-solid fa-chart-pie', 'Overview', 'overview')} ${link('fa-solid fa-calendar-check', 'Schedule', 'schedule')} ${link('fa-solid fa-users', 'Patients', 'patients')}`;
    } else if (role === 'secretary') {
        html = `
            ${link('fa-solid fa-desktop', 'Front Desk', 'dashboard')} 
            ${link('fa-regular fa-calendar', 'All Appointments', 'appointments')}
            ${link('fa-solid fa-calendar-days', 'Visual Calendar', 'calendar')}
        `;
    } else {
        html = `${link('fa-solid fa-calendar-plus', 'Book Visit', 'dashboard')} ${link('fa-solid fa-clock-rotate-left', 'My History', 'history')}`;
    }
    menu.innerHTML = html;
    const links = menu.querySelectorAll('a');
    if(links.length > 0) links[0].classList.add('active');
}

function switchView(viewName, element) {
    if (element) setActiveLink(element);
    const content = document.getElementById('dynamic-content');
    const trend = (val, isPositive) => `<span style="font-size:0.75rem; font-weight:600; color:${isPositive ? '#2e7d32' : '#d32f2f'}; background:${isPositive ? '#e8f5e9' : '#ffebee'}; padding: 2px 6px; border-radius: 4px; margin-left: 8px;"><i class="fa-solid fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${val}</span>`;

    if (viewName === 'overview' && currentUser.role === 'dentist') {
        const confirmed = currentAppointments.filter(a => a.status === 'Confirmed');
        content.innerHTML = `
            <h2>Dashboard Overview</h2>
            <div class="stats-grid" style="margin-top:20px;">
                <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-user-doctor"></i></div><div class="stat-info"><p>Confirmed Appts</p><h3>${confirmed.length} ${trend('5%', true)}</h3></div></div>
                <div class="stat-card"><div class="stat-icon" style="background:rgba(64, 224, 208, 0.1); color:#40e0d0;"><i class="fa-solid fa-clock"></i></div><div class="stat-info"><p>Total Requests</p><h3>${currentAppointments.length}</h3></div></div>
                <div class="stat-card"><div class="stat-icon" style="background:rgba(255, 165, 0, 0.1); color:orange;"><i class="fa-solid fa-star"></i></div><div class="stat-info"><p>Rating</p><h3>${currentRating}</h3></div></div>
            </div>
        `;
    }
    else if (viewName === 'schedule' && currentUser.role === 'dentist') {
        const confirmed = currentAppointments.filter(a => a.status === 'Confirmed');
        const rows = confirmed.map(a => `<tr><td>${a.time}</td><td style="font-weight:bold;">${a.patientName}</td><td>${a.type}</td><td><span class="status confirmed">Confirmed</span></td></tr>`).join('');
        content.innerHTML = `<h2><i class="fa-solid fa-calendar-check"></i> Today's Schedule</h2><div class="recent-table" style="margin-top:20px;"><table><thead><tr><th>Time</th><th>Patient</th><th>Treatment</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No confirmed appointments yet.</td></tr>'}</tbody></table></div>`;
    }
    else if (viewName === 'patients' && currentUser.role === 'dentist') {
        const uniquePatients = {};
        currentAppointments.forEach(appt => {
            if (!uniquePatients[appt.patientName]) { uniquePatients[appt.patientName] = { name: appt.patientName, lastVisit: appt.date, total: 0 }; }
            uniquePatients[appt.patientName].total++;
        });
        const rows = Object.values(uniquePatients).map(p => `<tr><td style="font-weight:bold;">${p.name}</td><td>${p.lastVisit}</td><td>${p.total} Visits</td><td><button onclick="viewPatientRecord('${p.name}')" style="border:none; background:#e0f2f1; color:teal; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:600;"><i class="fa-solid fa-eye"></i> View Record</button></td></tr>`).join('');
        content.innerHTML = `<h2><i class="fa-solid fa-users"></i> Patient List</h2><div class="recent-table" style="margin-top:20px;"><table><thead><tr><th>Name</th><th>Last Visit</th><th>Total Visits</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No patients found.</td></tr>'}</tbody></table></div>`;
    }
    // PATIENT HISTORY (WITH RE-BOOK BUTTON)
    else if (viewName === 'history' && currentUser.role === 'patient') {
        const rows = currentAppointments.map(a => {
            const isCancelled = a.status.toLowerCase() === 'cancelled';
            return `
                <tr>
                    <td>${a.date}</td>
                    <td>${a.time}</td>
                    <td>${a.type}</td>
                    <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
                    <td>
                        ${isCancelled ? 
                            `<button onclick="prepareReschedule(${a.id})" class="reschedule-btn">
                                <i class="fa-solid fa-calendar-plus"></i> Re-book
                             </button>` : 
                            '-'}
                    </td>
                </tr>`;
        }).join('');

        content.innerHTML = `
            <h2><i class="fa-solid fa-clock-rotate-left"></i> My Medical History</h2>
            <div class="recent-table" style="margin-top:20px;">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Service</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="5">No appointments history.</td></tr>'}
                    </tbody>
                </table>
            </div>`;
    }
    // SECRETARY VIEWS (WITH ADMIN RESCHEDULE)
    else if (viewName === 'appointments' && currentUser.role === 'secretary') {
        const rows = currentAppointments.map(a => `
            <tr>
                <td>${a.patientName}</td>
                <td>${a.date} ${a.time}</td>
                <td>${a.type}</td>
                <td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td>
                <td>
                    ${a.status === 'Pending' ? 
                        `<button onclick="updateStatus(${a.id}, 'Confirmed')" style="cursor:pointer; color:green; background:none; border:none; font-size:1.1rem; margin-right:10px;"><i class="fa-solid fa-circle-check"></i></button>
                         <button onclick="updateStatus(${a.id}, 'Cancelled')" style="cursor:pointer; color:red; background:none; border:none; font-size:1.1rem;"><i class="fa-solid fa-circle-xmark"></i></button>` 
                    : a.status === 'Cancelled' ?
                        `<button onclick="openAdminReschedule(${a.id})" class="reschedule-btn" style="width: auto; padding: 5px 10px; font-size: 0.8rem;">
                            <i class="fa-solid fa-rotate-right"></i> Reschedule
                         </button>`
                    : '-'}
                </td>
            </tr>`).join('');
        content.innerHTML = `<h2><i class="fa-regular fa-calendar"></i> Master Schedule</h2><div class="recent-table" style="margin-top:20px;"><table><thead><tr><th>Patient</th><th>When</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    else if (viewName === 'calendar' && currentUser.role === 'secretary') {
        content.innerHTML = `
            <h2><i class="fa-solid fa-calendar-days"></i> Clinic Schedule</h2>
            <div id="calendar-box" style="background:white; padding:30px; border-radius:15px; margin-top:20px; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
                <div id="calendar"></div>
            </div>
        `;
        setTimeout(initVisualCalendar, 100);
    }
    else { renderDefaultDashboard(currentUser.role); }
}

function viewPatientRecord(patientName) {
    const records = currentAppointments.filter(a => a.patientName === patientName);
    const content = document.getElementById('dynamic-content');
    const rows = records.map(a => `<tr><td>${a.date}</td><td>${a.type}</td><td><span class="status ${a.status.toLowerCase()}">${a.status}</span></td></tr>`).join('');
    content.innerHTML = `<button onclick="switchView('patients')" style="background:none; border:none; color:#666; cursor:pointer; margin-bottom:20px; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-arrow-left"></i> Back to Patients</button><div style="background:white; padding:30px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.05);"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:20px; margin-bottom:20px;"><div><h2 style="margin:0; color:#333;">${patientName}</h2><p style="color:#888; margin:5px 0 0;">Medical Record</p></div><div class="stat-icon"><i class="fa-solid fa-file-medical"></i></div></div><h3>History</h3><table style="width:100%; border-collapse:collapse; margin-top:10px;"><thead><tr><th style="text-align:left; padding:10px; color:#888;">Date</th><th style="text-align:left; padding:10px; color:#888;">Procedure</th><th style="text-align:left; padding:10px; color:#888;">Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderDefaultDashboard(role) {
    const content = document.getElementById('dynamic-content');
    if (role === 'secretary') {
        const pending = currentAppointments.filter(a => a.status === 'Pending');
        const rows = pending.map(a => `<tr><td style="font-weight:bold;">${a.patientName}</td><td>${a.date} ${a.time}</td><td>${a.type}</td><td><button onclick="updateStatus(${a.id}, 'Confirmed')" style="border:none; background:#e8f5e9; color:green; padding:5px 10px; border-radius:5px; cursor:pointer;">Approve</button></td></tr>`).join('');
        content.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-icon" style="color:crimson; background:rgba(220, 20, 60, 0.1);"><i class="fa-solid fa-bell"></i></div><div class="stat-info"><p>Action Needed</p><h3>${pending.length}</h3></div></div><div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-calendar-day"></i></div><div class="stat-info"><p>Total Bookings</p><h3>${currentAppointments.length}</h3></div></div></div><div class="recent-table"><h3>🔔 Pending Approvals</h3><table><thead><tr><th>Patient</th><th>When</th><th>Type</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No pending requests.</td></tr>'}</tbody></table></div>`;
    } else {
        const now = new Date();
        const futureAppts = currentAppointments.filter(a => a.status === 'Confirmed' && new Date(a.date + ' ' + a.time) > now);
        futureAppts.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
        const nextVisit = futureAppts.length > 0 ? `${futureAppts[0].date} (${futureAppts[0].time})` : 'No upcoming visit';

        content.innerHTML = `<div class="welcome-card"><h3>Welcome Back!</h3><p>Track your dental health journey.</p><button class="history-btn" onclick="switchView('history')"><i class="fa-solid fa-clock-rotate-left"></i> View Medical History</button></div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;"><div class="stat-card" style="display:block;"><h3 style="margin-bottom:15px; font-size:1.2rem;">📅 Book Appointment</h3><form onsubmit="bookAppointment(event)" style="display:flex; flex-direction:column; gap:15px;"><input type="date" id="book-date" required style="padding:10px; border:1px solid #ddd; border-radius:8px;"><input type="time" id="book-time" required style="padding:10px; border:1px solid #ddd; border-radius:8px;"><select id="book-type" style="padding:10px; border:1px solid #ddd; border-radius:8px;"><option>General Checkup</option><option>Whitening</option><option>Root Canal</option><option>Cleaning</option></select><button type="submit" class="cta-main-btn" style="width:100%; margin-top:0;">Request Booking</button></form></div><div class="stats-grid" style="display:flex; flex-direction:column; gap:20px; margin:0;"><div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-calendar-check"></i></div><div class="stat-info"><p>Next Visit</p><h3 style="font-size:1.2rem;">${nextVisit}</h3></div></div><div class="stat-card"><div class="stat-icon" style="background:rgba(255, 165, 0, 0.1); color:orange;"><i class="fa-solid fa-star"></i></div><div class="stat-info"><p>Rate Service</p><div id="user-rating-stars" style="font-size:1.2rem; margin-top:5px;">${generateStars(0)}</div></div></div></div></div>`;
    }
}

function generateStars(rating) {
    let html = '';
    for(let i=1; i<=5; i++) {
        const type = i <= rating ? 'solid' : 'regular';
        html += `<i class="fa-${type} fa-star" style="color:orange; cursor:pointer;" onclick="selectRating(${i})"></i>`;
    }
    return html;
}

let selectedStarCount = 0;
function selectRating(stars) {
    selectedStarCount = stars;
    document.getElementById('user-rating-stars').innerHTML = generateStars(stars) + 
        `<button onclick="confirmRating()" style="display:block; margin-top:10px; padding:5px 10px; background:#008080; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Submit Rating</button>`;
}

async function confirmRating() {
    if(selectedStarCount === 0) return;
    try {
        const res = await fetch(`${API_URL}/ratings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stars: selectedStarCount, patientId: currentUser.id })
        });
        if(res.ok) {
            const data = await res.json();
            if(data.average) {
                currentRating = parseFloat(data.average).toFixed(1);
                localStorage.setItem('clinicRating', currentRating);
            }
            showToast('success', 'Thank You!', 'Your rating has been recorded.');
            document.getElementById('user-rating-stars').innerHTML = generateStars(selectedStarCount) + `<span style="color:green; display:block; margin-top:5px; font-size:0.8rem;">Submitted!</span>`;
        }
    } catch(e) {
        showToast('info', 'Rating Saved', 'Thank you for your feedback!');
        document.getElementById('user-rating-stars').innerHTML = generateStars(selectedStarCount) + `<span style="color:green; display:block; margin-top:5px; font-size:0.8rem;">Submitted!</span>`;
    }
}

async function bookAppointment(e) {
    e.preventDefault();
    const date = document.getElementById('book-date').value;
    const time = document.getElementById('book-time').value;
    const type = document.getElementById('book-type').value;

    try {
        const res = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                patientId: currentUser.id, 
                patientName: currentUser.name, 
                date, time, type 
            })
        });
        
        if (res.ok) {
            showToast('success', 'Booking Sent', 'The secretary will review your request shortly.');
            loadDashboard(currentUser); 
        }
    } catch(err) {
        showToast('error', 'Booking Error', 'Could not process your request at this time.');
    }
}

async function updateStatus(id, status) {
    const res = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (res.ok) {
        showToast('info', 'Status Updated', `Appointment marked as ${status}.`);
        loadDashboard(currentUser);
    }
}

// ==========================================
// 🔄 PATIENT RE-BOOK LOGIC
// ==========================================
function prepareReschedule(id) {
    const appt = currentAppointments.find(a => a.id == id);
    if (!appt) return;

    switchView('dashboard');
    setTimeout(() => {
        const typeSelect = document.getElementById('book-type');
        const dateInput = document.getElementById('book-date');
        
        if (typeSelect) typeSelect.value = appt.type;
        
        if (dateInput) {
            dateInput.focus();
            dateInput.style.borderColor = 'var(--primary)';
            dateInput.style.boxShadow = '0 0 10px rgba(0, 128, 128, 0.2)';
        }

        showToast('info', 'Re-scheduling', `Please select a new date and time for your ${appt.type}.`);
    }, 100);
}

// ==========================================
// 🛠️ SECRETARY ADMIN RESCHEDULE MODAL
// ==========================================
function openAdminReschedule(id) {
    const appt = currentAppointments.find(a => a.id == id);
    if (!appt) return;

    // Create Modal HTML
    const modalHtml = `
    <div id="reschedule-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:100000; display:flex; justify-content:center; align-items:center;">
        <div style="background:white; padding:25px; border-radius:15px; width:90%; max-width:400px; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation: popIn 0.3s ease;">
            <h3 style="margin-top:0; color:var(--primary);"><i class="fa-solid fa-calendar-days"></i> Reschedule Patient</h3>
            <p style="color:#666; margin-bottom:20px;">Select new time for <strong>${appt.patientName}</strong> (${appt.type})</p>
            
            <label style="display:block; font-weight:600; margin-bottom:5px; color:#333;">New Date</label>
            <input type="date" id="admin-new-date" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px; box-sizing:border-box;" value="${appt.date}">
            
            <label style="display:block; font-weight:600; margin-bottom:5px; color:#333;">New Time</label>
            <input type="time" id="admin-new-time" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:25px; box-sizing:border-box;" value="${appt.time}">
            
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('reschedule-modal').remove()" style="flex:1; padding:12px; border:1px solid #ddd; background:white; border-radius:8px; cursor:pointer; color:#666;">Cancel</button>
                <button onclick="confirmAdminReschedule(${id})" style="flex:1; padding:12px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">Confirm</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function confirmAdminReschedule(id) {
    const date = document.getElementById('admin-new-date').value;
    const time = document.getElementById('admin-new-time').value;
    
    if(!date || !time) {
        showToast('warning', 'Missing Info', 'Please select both date and time');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time, status: 'Confirmed' }) 
        });
        
        if (res.ok) {
            showToast('success', 'Rescheduled', 'Appointment updated successfully');
            document.getElementById('reschedule-modal').remove();
            
            // Update local state immediately so UI reflects change
            const appt = currentAppointments.find(a => a.id == id);
            if(appt) { appt.date = date; appt.time = time; appt.status = 'Confirmed'; }
            
            // Refresh the current view
            switchView('appointments');
        }
    } catch(e) {
        showToast('error', 'Error', 'Could not reschedule appointment');
    }
}

// ==========================================
// 🤖 CHATBOT LOGIC (TYPING INDICATOR + TOASTS)
// ==========================================
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML += `<div class="message user">${msg}</div>`;
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // Show Typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message bot typing';
    typingDiv.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // 🚀 DEPLOYMENT FIX: Use Node Proxy to hit Python
    try {
        const res = await fetch(`${API_URL}/chat`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ message: msg }) 
        });
        const data = await res.json();
        
        document.getElementById('typing-indicator').remove();
        chatBox.innerHTML += `<div class="message bot">${data.reply}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) { 
        document.getElementById('typing-indicator')?.remove();
        chatBox.innerHTML += `<div class="message bot">⚠️ Service Offline</div>`; 
        showToast('warning', 'AI Service Offline', 'The Python backend is not reachable.');
    }
}

document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// CANVAS ANIMATION
window.initCanvas = function() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return; 
    const ctx = canvas.getContext('2d');
    let particlesArray;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let mouse = { x: null, y: null, radius: (canvas.height / 80) * (canvas.width / 80) };
    window.addEventListener('mousemove', function(event) { mouse.x = event.x; mouse.y = event.y; });
    
    class Particle {
        constructor(x, y, directionX, directionY, size, color) { this.x = x; this.y = y; this.directionX = directionX; this.directionY = directionY; this.size = size; this.color = color; }
        draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = '#008080'; ctx.fill(); }
        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
            let dx = mouse.x - this.x; let dy = mouse.y - this.y; let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius + this.size) {
                if (mouse.x < this.x && this.x < canvas.width - this.size * 10) this.x += 10;
                if (mouse.x > this.x && this.x > this.size * 10) this.x -= 10;
                if (mouse.y < this.y && this.y < canvas.height - this.size * 10) this.y += 10;
                if (mouse.y > this.y && this.y > this.size * 10) this.y -= 10;
            }
            this.x += this.directionX; this.y += this.directionY; this.draw();
        }
    }
    
    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 10000; 
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 1.5) + 0.5; 
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 2) - 1; let directionY = (Math.random() * 2) - 1; 
            particlesArray.push(new Particle(x, y, directionX, directionY, size, '#008080'));
        }
    }
    
    function connect() {
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                if (distance < (canvas.width * canvas.height) / 100) { 
                    let opacityValue = 1 - (distance / 20000); 
                    ctx.strokeStyle = 'rgba(0, 128, 128,' + opacityValue + ')'; 
                    ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(particlesArray[a].x, particlesArray[a].y); ctx.lineTo(particlesArray[b].x, particlesArray[b].y); ctx.stroke();
                }
            }
        }
    }
    
    function animate() { requestAnimationFrame(animate); ctx.clearRect(0, 0, innerWidth, innerHeight); for (let i = 0; i < particlesArray.length; i++) { particlesArray[i].update(); } connect(); }
    window.addEventListener('resize', function() { canvas.width = innerWidth; canvas.height = innerHeight; mouse.radius = ((canvas.height / 80) * (canvas.height / 80)); init(); });
    init(); animate();
}

if(document.getElementById('hero-canvas')) window.initCanvas();

// ==========================================
// 📅 VISUAL CALENDAR ENGINE
// ==========================================
function initVisualCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    const events = currentAppointments.map(appt => ({
        id: appt.id,
        title: `${appt.patientName} (${appt.type})`,
        start: `${appt.date}T${appt.time}:00`,
        backgroundColor: appt.status === 'Confirmed' ? '#008080' : '#ffa500',
        borderColor: 'transparent',
        extendedProps: { status: appt.status, type: appt.type }
    }));

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '08:00:00',
        slotMaxTime: '19:00:00',
        allDaySlot: false,
        events: events,
        eventClick: function(info) {
            showToast('info', 'Appointment Info', `Patient: ${info.event.extendedProps.type} for ${info.event.title}`);
        }
    });

    calendar.render();
}

// REVEAL ANIMATIONS AND DYNAMIC STYLES
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    .reveal-element { opacity: 0; transform: translateY(40px); transition: all 1s cubic-bezier(0.5, 0, 0, 1); } 
    .reveal-active { opacity: 1; transform: translateY(0); } 
    
    /* TOAST STYLES */
    #toast-container { position: fixed; top: 30px; right: 30px; z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
    .toast { background: white; min-width: 300px; padding: 15px 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 12px; pointer-events: auto; cursor: pointer; transform: translateX(120%); transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); border-left: 6px solid #ccc; position: relative; }
    .toast.show { transform: translateX(0); }
    .toast-content { display: flex; flex-direction: column; }
    .toast-title { font-weight: 800; font-size: 0.95rem; color: #333; }
    .toast-message { font-size: 0.85rem; color: #666; }
    .toast-success { border-left-color: #008080; }
    .toast-error { border-left-color: #e53935; }
    .toast-info { border-left-color: #2196f3; }
    .toast-warning { border-left-color: #ffa000; }

    /* RE-SCHEDULE BUTTON STYLE */
    .reschedule-btn {
        background: #f0fdfd;
        color: var(--primary);
        border: 1px solid var(--primary);
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .reschedule-btn:hover {
        background: var(--primary);
        color: white;
    }
    
    @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
`;
document.head.appendChild(styleSheet);

const revealObserver = new IntersectionObserver((entries) => { 
    entries.forEach((entry) => { 
        if (entry.isIntersecting) { 
            entry.target.classList.add('reveal-active'); 
        } 
    }); 
}, { threshold: 0.15 });

document.querySelectorAll('.service-card, .section-title, .stat-card').forEach((el) => { 
    el.classList.add('reveal-element'); 
    revealObserver.observe(el); 
});