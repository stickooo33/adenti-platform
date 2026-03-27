const API_URL = window.location.origin + '/api';

// Persister un identifiant de session pour le chatbot (flow multi-message)
let chatSessionId = localStorage.getItem('adenti_chat_session_id');
if (!chatSessionId) {
    chatSessionId = window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('adenti_chat_session_id', chatSessionId);
}

let currentUser = null; 
let currentAppointments = []; 

// Prescriptions persistantes
let currentPrescriptions = JSON.parse(localStorage.getItem('clinicPrescriptions')) || [
    { id: 1, patientName: "Patient Test", medicine: "Amoxicilline 500mg", frequency: "Matin et Soir", duration: 7, daysLeft: 5, notes: "À prendre au milieu du repas.", status: "Actif" },
    { id: 2, patientName: "Omar Kaoui", medicine: "Ibuprofène 400mg", frequency: "Si douleur", duration: 3, daysLeft: 1, notes: "Ne pas dépasser 3 par jour.", status: "Actif" }
];

// --- 🌟 CORRECTION : CARTOGRAPHIE COMPLÈTE AVEC LES UNITÉS 'm' (mètres) ---
const DEFAULT_TOOTH_TEMPLATE = {
    // --- Maxillaire Supérieur (Haut) ---
    "t18": { name: "Molaire 18 (Sagesse)", status: "healthy", pos: "0.15m 0.05m -0.1m" },
    "t17": { name: "Molaire 17", status: "healthy", pos: "0.12m 0.05m -0.05m" },
    "t16": { name: "Molaire 16", status: "healthy", pos: "0.10m 0.05m 0.0m" },
    "t15": { name: "Prémolaire 15", status: "healthy", pos: "0.08m 0.05m 0.05m" },
    "t14": { name: "Prémolaire 14", status: "healthy", pos: "0.06m 0.05m 0.08m" },
    "t13": { name: "Canine 13", status: "healthy", pos: "0.04m 0.05m 0.12m" },
    "t12": { name: "Incisive 12", status: "healthy", pos: "0.02m 0.05m 0.14m" },
    "t11": { name: "Incisive 11", status: "healthy", pos: "0.01m 0.05m 0.15m" },
    
    // Quadrant 2 (Haut Gauche)
    "t21": { name: "Incisive 21", status: "healthy", pos: "-0.01m 0.05m 0.15m" },
    "t22": { name: "Incisive 22", status: "healthy", pos: "-0.02m 0.05m 0.14m" },
    "t23": { name: "Canine 23", status: "healthy", pos: "-0.04m 0.05m 0.12m" },
    "t24": { name: "Prémolaire 24", status: "healthy", pos: "-0.06m 0.05m 0.08m" },
    "t25": { name: "Prémolaire 25", status: "healthy", pos: "-0.08m 0.05m 0.05m" },
    "t26": { name: "Molaire 26", status: "healthy", pos: "-0.10m 0.05m 0.0m" },
    "t27": { name: "Molaire 27", status: "healthy", pos: "-0.12m 0.05m -0.05m" },
    "t28": { name: "Molaire 28 (Sagesse)", status: "healthy", pos: "-0.15m 0.05m -0.1m" },

    // --- Mandibule (Bas) ---
    // Quadrant 3 (Bas Gauche)
    "t38": { name: "Molaire 38 (Sagesse)", status: "healthy", pos: "-0.15m -0.05m -0.1m" },
    "t37": { name: "Molaire 37", status: "healthy", pos: "-0.12m -0.05m -0.05m" },
    "t36": { name: "Molaire 36", status: "healthy", pos: "-0.10m -0.05m 0.0m" },
    "t35": { name: "Prémolaire 35", status: "healthy", pos: "-0.08m -0.05m 0.05m" },
    "t34": { name: "Prémolaire 34", status: "healthy", pos: "-0.06m -0.05m 0.08m" },
    "t33": { name: "Canine 33", status: "healthy", pos: "-0.04m -0.05m 0.12m" },
    "t32": { name: "Incisive 32", status: "healthy", pos: "-0.02m -0.05m 0.14m" },
    "t31": { name: "Incisive 31", status: "healthy", pos: "-0.01m -0.05m 0.15m" },
    
    // Quadrant 4 (Bas Droite)
    "t41": { name: "Incisive 41", status: "healthy", pos: "0.01m -0.05m 0.15m" },
    "t42": { name: "Incisive 42", status: "healthy", pos: "0.02m -0.05m 0.14m" },
    "t43": { name: "Canine 43", status: "healthy", pos: "0.04m -0.05m 0.12m" },
    "t44": { name: "Prémolaire 44", status: "healthy", pos: "0.06m -0.05m 0.08m" },
    "t45": { name: "Prémolaire 45", status: "healthy", pos: "0.08m -0.05m 0.05m" },
    "t46": { name: "Molaire 46", status: "healthy", pos: "0.10m -0.05m 0.0m" },
    "t47": { name: "Molaire 47", status: "healthy", pos: "0.12m -0.05m -0.05m" },
    "t48": { name: "Molaire 48 (Sagesse)", status: "healthy", pos: "0.15m -0.05m -0.1m" }
};

// Données de démonstration
const DEMO_TEST_MOUTH = JSON.parse(JSON.stringify(DEFAULT_TOOTH_TEMPLATE));
DEMO_TEST_MOUTH["t14"].status = "cavity";
DEMO_TEST_MOUTH["t23"].status = "treated";
DEMO_TEST_MOUTH["t46"].status = "cavity";
DEMO_TEST_MOUTH["t36"].status = "treated";

// 🌟 CORRECTION: Nouvelle clé (v2) pour écraser l'ancien cache cassé
let allPatientsToothData = JSON.parse(localStorage.getItem('adenti_patients_v2')) || {
    "Patient Test": DEMO_TEST_MOUTH
};

let currentViewedPatient = null; 
let hotspotsVisible = true; // État de visibilité des points 3D

let currentRating = localStorage.getItem('clinicRating') || 4.9; 
let ratingCount = Number(localStorage.getItem('clinicRatingCount')) || 1;

const notifSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

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

let socket;
try {
    socket = io(); 

    socket.on('new_appointment', (newAppt) => {
        if (currentUser && currentUser.role === 'secretary') {
            notifSound.play().catch(e => console.log("Sound blocked"));
            showToast('info', 'Nouvelle Demande', `Patient : ${newAppt.patientName}`);
            
            currentAppointments.push(newAppt);
            const currentView = document.querySelector('.sidebar-menu a.active')?.innerText;
            if (currentView?.includes('Réception')) switchView('dashboard');
            else if (currentView?.includes('Rendez-vous')) switchView('appointments');
            else if (currentView?.includes('Calendrier')) switchView('calendar');
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
            const displayStatus = data.status === 'Confirmed' ? 'Confirmé' : (data.status === 'Pending' ? 'En attente' : 'Annulé');
            showToast(type, 'Statut Mis à Jour', `Votre rendez-vous est maintenant ${displayStatus.toLowerCase()} !`);
            loadDashboard(currentUser);
        }
        if (currentUser && currentUser.role === 'dentist') {
            switchView('schedule');
        }
        if (currentUser && currentUser.role === 'secretary') {
             const currentView = document.querySelector('.sidebar-menu a.active')?.innerText;
             if (currentView?.includes('Rendez-vous')) switchView('appointments');
        }
    });

} catch (e) {
    console.warn("Socket.io not connected. Using local mode.");
}

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
                showToast('success', 'Compte Créé', 'Veuillez vous connecter pour continuer.');
                setTimeout(() => showTab('login'), 1500);
            } else {
                showToast('error', 'Échec de l\'inscription', data.message);
            }
        } catch (err) { 
            showToast('error', 'Erreur Serveur', 'Impossible de joindre le serveur d\'authentification.');
        }
    });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.toLowerCase();
        const password = document.getElementById('login-password').value;

        if (email.includes('doc')) {
            currentUser = { id: 99, name: 'Dr. ADENTI', role: 'dentist' };
            showToast('success', 'Mode Démo', 'Connecté en tant que Dentiste');
            return loadDashboard(currentUser);
        }
        if (email.includes('admin')) {
            currentUser = { id: 98, name: 'Admin Secrétaire', role: 'secretary' };
            showToast('success', 'Mode Démo', 'Connecté en tant que Secrétaire');
            return loadDashboard(currentUser);
        }
        if (email.includes('pat')) {
            currentUser = { id: 97, name: 'Patient Test', role: 'patient' };
            showToast('success', 'Mode Démo', 'Connecté en tant que Patient');
            return loadDashboard(currentUser);
        }

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.user;
                showToast('success', 'Succès', `Bienvenue, ${currentUser.name.split(' ')[0]} !`);
                loadDashboard(currentUser);
            } else {
                showToast('error', 'Accès Refusé', data.message);
            }
        } catch (err) { 
            showToast('error', 'Erreur', 'Impossible de se connecter au serveur.');
        }
    });
}

async function loadDashboard(user) {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('landing-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');

    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    
    const profileDiv = document.querySelector('.user-profile');
    if (profileDiv) {
        profileDiv.innerHTML = `
            <button class="theme-btn" onclick="toggleTheme()" style="margin-right:20px;">
                <i class="fa-solid fa-moon"></i>
            </button>
            <div style="text-align: right; margin-right: 15px;">
                <div style="font-weight: 700; color: #333; font-size: 1rem;">${timeGreeting}, ${user.name.split(' ')[0]}</div>
                <div style="font-size: 0.85rem; color: #888; text-transform: capitalize; font-weight: 500;">${user.role === 'dentist' ? 'Dentiste' : user.role === 'secretary' ? 'Secrétaire' : 'Patient'}</div>
            </div>
            <div class="profile-pic"><i class="fa-solid fa-user"></i></div>
        `;
    }

    try {
        const res = await fetch(`${API_URL}/appointments?role=${user.role}&userId=${user.id}`);
        if (res.ok) {
            currentAppointments = await res.json();
        }
    } catch (e) {
        console.log("Using cached/demo appointments");
    }

    renderSidebar(user.role);
    if (user.role === 'dentist') switchView('overview');
    else if (user.role === 'secretary') switchView('dashboard');
    else switchView('dashboard'); 
}

function renderSidebar(role) {
    const menu = document.getElementById('sidebar-menu');
    const link = (icon, text, viewName) => 
        `<li><a href="#" onclick="switchView('${viewName}', this)"><i class="${icon}"></i> ${text}</a></li>`;

    let html = '';
    if (role === 'dentist') {
        html = `
            ${link('fa-solid fa-chart-pie', 'Vue d\'ensemble', 'overview')} 
            ${link('fa-solid fa-cube', 'Diagnostic 3D', '3dview')}
            ${link('fa-solid fa-calendar-check', 'Planning', 'schedule')} 
            ${link('fa-solid fa-users', 'Patients', 'patients')}
            ${link('fa-solid fa-pills', 'Ordonnances', 'prescriptions')}
        `;
    } else if (role === 'secretary') {
        html = `
            ${link('fa-solid fa-desktop', 'Réception', 'dashboard')} 
            ${link('fa-regular fa-calendar', 'Tous les Rendez-vous', 'appointments')}
            ${link('fa-solid fa-calendar-days', 'Calendrier Visuel', 'calendar')}
        `;
    } else {
        html = `
            ${link('fa-solid fa-street-view', 'Ma Bouche 3D', '3dview')}
            ${link('fa-solid fa-calendar-plus', 'Prendre Rendez-vous', 'dashboard')} 
            ${link('fa-solid fa-prescription-bottle-medical', 'Mes Traitements', 'treatments')}
            ${link('fa-solid fa-clock-rotate-left', 'Mon Historique', 'history')}
        `;
    }
    menu.innerHTML = html;
    const links = menu.querySelectorAll('a');
    if(links.length > 0) links[0].classList.add('active');
}

function switchView(viewName, element) {
    if (element) setActiveLink(element);
    const content = document.getElementById('dynamic-content');
    const trend = (val, isPositive) => `<span style="font-size:0.75rem; font-weight:600; color:${isPositive ? '#2e7d32' : '#d32f2f'}; background:${isPositive ? '#e8f5e9' : '#ffebee'}; padding: 2px 6px; border-radius: 4px; margin-left: 8px;"><i class="fa-solid fa-arrow-${isPositive ? 'up' : 'down'}"></i> ${val}</span>`;

    if (viewName === '3dview') {
        if (currentUser.role === 'patient') {
            currentViewedPatient = currentUser.name; 
        } else {
            let uniquePatients = [...new Set(currentAppointments.map(a => a.patientName))];
            if (!uniquePatients.includes("Patient Test")) uniquePatients.push("Patient Test");
            if(!currentViewedPatient) currentViewedPatient = uniquePatients[0];
        }
        renderOdontogram(content);
    }
    else if (viewName === 'overview' && currentUser.role === 'dentist') {
        const confirmed = currentAppointments.filter(a => a.status === 'Confirmed');
        content.innerHTML = `
            <h2>Vue d'ensemble</h2>
            <div class="stats-grid" style="margin-top:20px;">
                <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-user-doctor"></i></div><div class="stat-info"><p>RDV Confirmés</p><h3>${confirmed.length} ${trend('5%', true)}</h3></div></div>
                <div class="stat-card"><div class="stat-icon" style="background:rgba(64, 224, 208, 0.1); color:#40e0d0;"><i class="fa-solid fa-clock"></i></div><div class="stat-info"><p>Total des demandes</p><h3>${currentAppointments.length}</h3></div></div>
                <div class="stat-card"><div class="stat-icon" style="background:rgba(255, 165, 0, 0.1); color:orange;"><i class="fa-solid fa-star"></i></div><div class="stat-info"><p>Évaluation</p><h3>${currentRating}</h3></div></div>
            </div>
        `;
    }
    else if (viewName === 'schedule' && currentUser.role === 'dentist') {
        const confirmed = currentAppointments.filter(a => a.status === 'Confirmed');
        const rows = confirmed.map(a => `<tr><td>${a.time}</td><td style="font-weight:bold;">${a.patientName}</td><td>${a.type}</td><td><span class="status confirmed">Confirmé</span></td></tr>`).join('');
        content.innerHTML = `<h2><i class="fa-solid fa-calendar-check"></i> Planning du Jour</h2><div class="recent-table" style="margin-top:20px;"><table><thead><tr><th>Heure</th><th>Patient</th><th>Traitement</th><th>Statut</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Aucun rendez-vous confirmé pour le moment.</td></tr>'}</tbody></table></div>`;
    }
    else if (viewName === 'patients' && currentUser.role === 'dentist') {
        const uniquePatients = {};
        currentAppointments.forEach(appt => {
            if (!uniquePatients[appt.patientName]) { uniquePatients[appt.patientName] = { name: appt.patientName, lastVisit: appt.date, total: 0 }; }
            uniquePatients[appt.patientName].total++;
        });
        const rows = Object.values(uniquePatients).map(p => `<tr><td style="font-weight:bold;">${p.name}</td><td>${p.lastVisit}</td><td>${p.total} Visite(s)</td><td><button onclick="viewPatientRecord('${p.name}')" style="border:none; background:#e0f2f1; color:teal; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:600;"><i class="fa-solid fa-eye"></i> Voir Dossier</button></td></tr>`).join('');
        content.innerHTML = `<h2><i class="fa-solid fa-users"></i> Liste des Patients</h2><div class="recent-table" style="margin-top:20px;"><table><thead><tr><th>Nom</th><th>Dernière Visite</th><th>Total Visites</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Aucun patient trouvé.</td></tr>'}</tbody></table></div>`;
    }
    else if (viewName === 'prescriptions' && currentUser.role === 'dentist') {
        let uniquePatients = [...new Set(currentAppointments.map(a => a.patientName))];
        if (!uniquePatients.includes("Patient Test")) uniquePatients.push("Patient Test");
        if (!uniquePatients.includes("Hibat Allah Khallouk")) uniquePatients.push("Hibat Allah Khallouk");
        if (!uniquePatients.includes("Omar Kaoui")) uniquePatients.push("Omar Kaoui");

        const patientOptions = uniquePatients.map(name => `<option value="${name}">${name}</option>`).join('');

        const activeRows = currentPrescriptions.map(p => `
            <tr>
                <td style="font-weight:bold;">${p.patientName}</td>
                <td>${p.medicine}</td>
                <td>${p.frequency}</td>
                <td><span class="status confirmed">${p.daysLeft} Jours Restants</span></td>
                <td>
                    <button onclick="cancelPrescription(${p.id})" style="border:none; background:none; color:red; cursor:pointer; margin-right:10px;" title="Annuler"><i class="fa-solid fa-ban"></i></button>
                </td>
            </tr>
        `).join('');

        content.innerHTML = `
            <h2><i class="fa-solid fa-pills"></i> Gestion des Ordonnances</h2>
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap:30px; margin-top:20px;">
                <div style="background:white; padding:30px; border-radius:24px; box-shadow:0 10px 40px rgba(0,0,0,0.04);">
                    <h3 style="margin-top:0; margin-bottom:20px;">Nouvelle Ordonnance</h3>
                    <form onsubmit="prescribeMedicine(event)" style="display:flex; flex-direction:column; gap:15px;">
                        <select id="presc-patient" required style="padding:12px; border:1px solid #ddd; border-radius:8px; background:white;">
                            <option value="" disabled selected>-- Sélectionner le patient --</option>
                            ${patientOptions}
                        </select>
                        <input type="text" id="presc-med" placeholder="Médicament (ex: Amoxicilline)" required style="padding:12px; border:1px solid #ddd; border-radius:8px;">
                        <select id="presc-freq" style="padding:12px; border:1px solid #ddd; border-radius:8px;">
                            <option value="1x par jour">1x par jour</option>
                            <option value="Matin et Soir">Matin et Soir</option>
                            <option value="Matin, Midi, Soir">Matin, Midi, Soir</option>
                            <option value="Si douleur">En cas de douleur</option>
                        </select>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <input type="number" id="presc-duration" placeholder="Durée" required min="1" style="padding:12px; border:1px solid #ddd; border-radius:8px; width:50%;">
                            <span>Jours</span>
                        </div>
                        <textarea id="presc-notes" placeholder="Conseils du médecin..." rows="3" style="padding:12px; border:1px solid #ddd; border-radius:8px; resize:none;"></textarea>
                        <button type="submit" class="cta-main-btn" style="margin-top:5px; padding:12px;"><i class="fa-solid fa-signature"></i> Prescrire</button>
                    </form>
                </div>
                <div class="recent-table" style="margin-top:0;">
                    <h3 style="margin-top:0; margin-bottom:20px;">Traitements Actifs</h3>
                    <table>
                        <thead><tr><th>Patient</th><th>Médicament</th><th>Fréquence</th><th>Durée</th><th>Action</th></tr></thead>
                        <tbody>${activeRows || '<tr><td colspan="5">Aucun traitement actif.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
    else if (viewName === 'treatments' && currentUser.role === 'patient') {
        let myPrescriptions = currentPrescriptions.filter(p => 
            p.patientName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
        ); 

        let treatmentCards = myPrescriptions.map(p => `
            <div style="background:white; border-left: 5px solid var(--primary); padding:25px; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.05); margin-bottom:20px; position:relative; overflow:hidden;">
                <i class="fa-solid fa-prescription-bottle-medical" style="position:absolute; right:-20px; bottom:-20px; font-size:6rem; color:rgba(0,128,128,0.05);"></i>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                    <div>
                        <h3 style="margin:0; font-size:1.4rem; color:var(--text-dark);">${p.medicine}</h3>
                        <span style="display:inline-block; margin-top:5px; background:#e0f2f1; color:#00695c; padding:4px 10px; border-radius:20px; font-size:0.85rem; font-weight:600;"><i class="fa-solid fa-clock"></i> ${p.frequency}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:1.5rem; font-weight:800; color:var(--primary);">${p.daysLeft}</span>
                        <span style="display:block; font-size:0.8rem; color:#888; font-weight:600; text-transform:uppercase;">Jours Restants</span>
                    </div>
                </div>
                <div style="background:#f9f9f9; padding:15px; border-radius:10px; border:1px solid #eee;">
                    <p style="margin:0; font-size:0.95rem; color:#555;"><strong><i class="fa-solid fa-user-doctor"></i> Conseil du Dentiste :</strong><br> ${p.notes}</p>
                </div>
            </div>
        `).join('');

        content.innerHTML = `
            <h2><i class="fa-solid fa-prescription-bottle-medical"></i> Mes Traitements en Cours</h2>
            <p style="color:#666; margin-bottom:30px;">Suivez vos prescriptions médicales et les conseils de votre dentiste.</p>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:30px;">
                ${treatmentCards || '<div style="background:white; padding:30px; border-radius:15px; text-align:center; color:#888;"><i class="fa-solid fa-check-circle" style="font-size:3rem; color:#e0e0e0; margin-bottom:15px;"></i><br>Aucun traitement en cours. Vous êtes en parfaite santé !</div>'}
            </div>
        `;
    }
    else if (viewName === 'history' && currentUser.role === 'patient') {
        const rows = currentAppointments.map(a => {
            const isCancelled = a.status.toLowerCase() === 'cancelled';
            const displayStatus = a.status === 'Confirmed' ? 'Confirmé' : (a.status === 'Pending' ? 'En attente' : 'Annulé');
            return `
                <tr>
                    <td>${a.date}</td>
                    <td>${a.time}</td>
                    <td>${a.type}</td>
                    <td><span class="status ${a.status.toLowerCase()}">${displayStatus}</span></td>
                    <td>
                        ${isCancelled ? 
                            `<button onclick="prepareReschedule(${a.id})" class="reschedule-btn">
                                <i class="fa-solid fa-calendar-plus"></i> Reprogrammer
                             </button>` : 
                            '-'}
                    </td>
                </tr>`;
        }).join('');

        content.innerHTML = `
            <h2><i class="fa-solid fa-clock-rotate-left"></i> Mon Historique Médical</h2>
            <div class="recent-table" style="margin-top:20px;">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Heure</th>
                            <th>Service</th>
                            <th>Statut</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="5">Aucun historique de rendez-vous.</td></tr>'}
                    </tbody>
                </table>
            </div>`;
    }
    else if (viewName === 'appointments' && currentUser.role === 'secretary') {
        const rows = currentAppointments.map(a => {
            const displayStatus = a.status === 'Confirmed' ? 'Confirmé' : (a.status === 'Pending' ? 'En attente' : 'Annulé');
            return `
            <tr>
                <td>${a.patientName}</td>
                <td>${a.date} à ${a.time}</td>
                <td>${a.type}</td>
                <td><span class="status ${a.status.toLowerCase()}">${displayStatus}</span></td>
                <td>
                    ${a.status === 'Pending' ? 
                        `<button onclick="updateStatus(${a.id}, 'Confirmed')" style="cursor:pointer; color:green; background:none; border:none; font-size:1.1rem; margin-right:10px;"><i class="fa-solid fa-circle-check"></i></button>
                         <button onclick="updateStatus(${a.id}, 'Cancelled')" style="cursor:pointer; color:red; background:none; border:none; font-size:1.1rem;"><i class="fa-solid fa-circle-xmark"></i></button>` 
                    : a.status === 'Cancelled' ?
                        `<button onclick="openAdminReschedule(${a.id})" class="reschedule-btn" style="width: auto; padding: 5px 10px; font-size: 0.8rem;">
                            <i class="fa-solid fa-rotate-right"></i> Reprogrammer
                         </button>`
                    : '-'}
                </td>
            </tr>`;
        }).join('');
        content.innerHTML = `<h2><i class="fa-regular fa-calendar"></i> Tous les Rendez-vous</h2><div class="recent-table" style="margin-top:20px;"><table><thead><tr><th>Patient</th><th>Date/Heure</th><th>Type</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    else if (viewName === 'calendar' && currentUser.role === 'secretary') {
        content.innerHTML = `
            <h2><i class="fa-solid fa-calendar-days"></i> Calendrier de la Clinique</h2>
            <div id="calendar-box" style="background:white; padding:30px; border-radius:15px; margin-top:20px; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
                <div id="calendar"></div>
            </div>
        `;
        setTimeout(initVisualCalendar, 100);
    }
    else { renderDefaultDashboard(currentUser.role); }
}

// --- 🦷 ODONTOGRAMME 3D LOGIC (MULTI-PATIENTS) ---

window.changeOdontogramPatient = function(patientName) {
    currentViewedPatient = patientName;
    renderOdontogram(document.getElementById('dynamic-content'));
}

window.toggleHotspots = function() {
    hotspotsVisible = !hotspotsVisible;
    const btn = document.getElementById('toggle-hotspots-btn');
    if (btn) {
        btn.innerHTML = hotspotsVisible 
            ? '<i class="fa-solid fa-eye-slash"></i> Masquer les annotations' 
            : '<i class="fa-solid fa-eye"></i> Afficher les annotations';
    }
    const hotspots = document.querySelectorAll('.tooth-hotspot');
    hotspots.forEach(h => {
        h.dataset.visible = hotspotsVisible;
    });
};

function renderOdontogram(container) {
    const isDoc = currentUser.role === 'dentist';
    
    let patientSelectorHTML = '';
    if (isDoc) {
        let uniquePatients = [...new Set(currentAppointments.map(a => a.patientName))];
        if (!uniquePatients.includes("Patient Test")) uniquePatients.push("Patient Test");
        if (!uniquePatients.includes("Hibat Allah Khallouk")) uniquePatients.push("Hibat Allah Khallouk");
        if (!uniquePatients.includes("Omar Kaoui")) uniquePatients.push("Omar Kaoui");

        const options = uniquePatients.map(name => 
            `<option value="${name}" ${name === currentViewedPatient ? 'selected' : ''}>${name}</option>`
        ).join('');
        
        patientSelectorHTML = `
            <div style="margin-bottom: 25px; padding: 15px; background: #e0f2f1; border-radius: 12px; border: 1px solid #b2dfdb; display:flex; align-items:center;">
                <label style="font-weight: bold; color: #00695c; margin-right: 15px; font-size:1.1rem;"><i class="fa-solid fa-folder-open"></i> Dossier Patient actif :</label>
                <select id="odontogram-patient-select" onchange="changeOdontogramPatient(this.value)" style="padding: 10px 15px; border-radius: 8px; border: 1px solid #008080; outline: none; background: white; font-weight:bold; color:#333; cursor:pointer; flex:1; max-width:400px;">
                    ${options}
                </select>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="mouth-container" style="background:#fff; padding:30px; border-radius:30px; box-shadow:0 20px 60px rgba(0,0,0,0.05);">
            
            ${patientSelectorHTML}

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                <div>
                    <h2 style="margin:0; font-size:1.8rem; color:#333;"><i class="fa-solid fa-cube" style="color:#008080;"></i> ${isDoc ? `Bouche de ${currentViewedPatient}` : 'Mon Jumeau Numérique'}</h2>
                    <p style="color:#888; margin:5px 0 0;">${isDoc ? 'Cliquez sur une dent pour mettre à jour le diagnostic de ce patient.' : 'Visualisez l\'état de vos soins en temps réel.'}</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px; align-items:flex-end;">
                    <div style="display:flex; gap:15px; background:#f8fbfb; padding:10px 20px; border-radius:15px;">
                        <span style="font-size:0.8rem;"><i class="fa-solid fa-circle" style="color:#4caf50;"></i> Sain</span>
                        <span style="font-size:0.8rem;"><i class="fa-solid fa-circle" style="color:#f44336;"></i> Carie</span>
                        <span style="font-size:0.8rem;"><i class="fa-solid fa-circle" style="color:#2196f3;"></i> Traité</span>
                    </div>
                    <button id="toggle-hotspots-btn" onclick="toggleHotspots()" class="toggle-btn-3d">
                        ${hotspotsVisible ? '<i class="fa-solid fa-eye-slash"></i> Masquer les annotations' : '<i class="fa-solid fa-eye"></i> Afficher les annotations'}
                    </button>
                </div>
            </div>

            <model-viewer 
                id="main-mouth-model"
                src="/mouth_model.gltf" 
                camera-controls 
                auto-rotate
                shadow-intensity="1"
                environment-image="neutral"
                exposure="1.2"
                style="width: 100%; height: 550px; background: radial-gradient(#ffffff, #f2f9f9); border-radius:25px; outline:none;">
                
                ${generateToothHotspots()}

            </model-viewer>

            ${isDoc ? `
                <div style="margin-top:20px; background:#fff3e0; padding:15px 20px; border-radius:15px; border-left:5px solid #ff9800; display:flex; align-items:center; gap:15px;">
                    <i class="fa-solid fa-user-shield" style="color:#ff9800; font-size:1.2rem;"></i>
                    <p style="margin:0; font-size:0.9rem; color:#e65100;"><strong>Confidentialité :</strong> Ces données médicales sont uniques à <strong>${currentViewedPatient}</strong> et cryptées.</p>
                </div>
            ` : ''}
        </div>
    `;
}

function generateToothHotspots() {
    if (!currentViewedPatient) return '';

    if (!allPatientsToothData[currentViewedPatient]) {
        allPatientsToothData[currentViewedPatient] = JSON.parse(JSON.stringify(DEFAULT_TOOTH_TEMPLATE));
    }

    const activePatientData = allPatientsToothData[currentViewedPatient];

    return Object.keys(activePatientData).map(id => {
        const tooth = activePatientData[id];
        return `
            <button slot="hotspot-${id}" 
                class="tooth-hotspot status-${tooth.status}" 
                data-position="${tooth.pos}" 
                data-normal="0m 1m 0m"
                data-visible="${hotspotsVisible}"
                onclick="handleToothClick('${id}')">
                <div class="tooth-tooltip">
                    <strong>${tooth.name}</strong><br>
                    Statut : ${translateStatus(tooth.status)}
                    ${currentUser.role === 'dentist' ? '<br><span style="color:#008080; font-size:10px;">(Cliquer pour modifier)</span>' : ''}
                </div>
            </button>
        `;
    }).join('');
}

function handleToothClick(id) {
    if (currentUser.role !== 'dentist') return;
    if (!currentViewedPatient) return;

    const activePatientData = allPatientsToothData[currentViewedPatient];
    const states = ['healthy', 'cavity', 'treated'];
    let currentIdx = states.indexOf(activePatientData[id].status);
    let nextIdx = (currentIdx + 1) % states.length;
    
    activePatientData[id].status = states[nextIdx];
    
    localStorage.setItem('adenti_patients_v2', JSON.stringify(allPatientsToothData));
    
    const btn = document.querySelector(`[slot="hotspot-${id}"]`);
    if(btn) {
        btn.className = `tooth-hotspot status-${activePatientData[id].status}`;
        btn.querySelector('.tooth-tooltip').innerHTML = `<strong>${activePatientData[id].name}</strong><br>Statut : ${translateStatus(activePatientData[id].status)}<br><span style="color:#008080; font-size:10px;">(Cliquer pour modifier)</span>`;
    }
}

function translateStatus(s) {
    if (s === 'healthy') return '<span style="color:#4caf50;">Saine</span>';
    if (s === 'cavity') return '<span style="color:#f44336;">Carie / À traiter</span>';
    return '<span style="color:#2196f3;">Soignée / Implant</span>';
}

function prescribeMedicine(e) {
    e.preventDefault();
    const patientName = document.getElementById('presc-patient').value; 
    const medicine = document.getElementById('presc-med').value;
    const frequency = document.getElementById('presc-freq').value;
    const duration = document.getElementById('presc-duration').value;
    const notes = document.getElementById('presc-notes').value;

    currentPrescriptions.push({
        id: Date.now(), patientName, medicine, frequency, duration, daysLeft: duration, notes, status: 'Actif'
    });
    
    localStorage.setItem('clinicPrescriptions', JSON.stringify(currentPrescriptions));
    showToast('success', 'Ordonnance Créée', `Traitement ajouté pour ${patientName}`);
    switchView('prescriptions'); 
}

function cancelPrescription(id) {
    currentPrescriptions = currentPrescriptions.filter(p => p.id !== id);
    localStorage.setItem('clinicPrescriptions', JSON.stringify(currentPrescriptions));
    showToast('info', 'Ordonnance Annulée', 'Le traitement a été supprimé.');
    switchView('prescriptions'); 
}

function viewPatientRecord(patientName) {
    const records = currentAppointments.filter(a => a.patientName === patientName);
    const content = document.getElementById('dynamic-content');
    const rows = records.map(a => {
        const displayStatus = a.status === 'Confirmed' ? 'Confirmé' : (a.status === 'Pending' ? 'En attente' : 'Annulé');
        return `<tr><td>${a.date}</td><td>${a.type}</td><td><span class="status ${a.status.toLowerCase()}">${displayStatus}</span></td></tr>`;
    }).join('');
    content.innerHTML = `<button onclick="switchView('patients')" style="background:none; border:none; color:#666; cursor:pointer; margin-bottom:20px; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-arrow-left"></i> Retour aux Patients</button><div style="background:white; padding:30px; border-radius:15px; box-shadow:0 4px 15px rgba(0,0,0,0.05);"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:20px; margin-bottom:20px;"><div><h2 style="margin:0; color:#333;">${patientName}</h2><p style="color:#888; margin:5px 0 0;">Dossier Médical</p></div><div class="stat-icon"><i class="fa-solid fa-file-medical"></i></div></div><h3>Historique</h3><table style="width:100%; border-collapse:collapse; margin-top:10px;"><thead><tr><th style="text-align:left; padding:10px; color:#888;">Date</th><th style="text-align:left; padding:10px; color:#888;">Procédure</th><th style="text-align:left; padding:10px; color:#888;">Statut</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderDefaultDashboard(role) {
    const content = document.getElementById('dynamic-content');
    if (role === 'secretary') {
        const pending = currentAppointments.filter(a => a.status === 'Pending');
        const rows = pending.map(a => `<tr><td style="font-weight:bold;">${a.patientName}</td><td>${a.date} à ${a.time}</td><td>${a.type}</td><td><button onclick="updateStatus(${a.id}, 'Confirmed')" style="border:none; background:#e8f5e9; color:green; padding:5px 10px; border-radius:5px; cursor:pointer;">Approuver</button></td></tr>`).join('');
        content.innerHTML = `<div class="stats-grid"><div class="stat-card"><div class="stat-icon" style="color:crimson; background:rgba(220, 20, 60, 0.1);"><i class="fa-solid fa-bell"></i></div><div class="stat-info"><p>Action Requise</p><h3>${pending.length}</h3></div></div><div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-calendar-day"></i></div><div class="stat-info"><p>Total des Réservations</p><h3>${currentAppointments.length}</h3></div></div></div><div class="recent-table"><h3>🔔 Approbations en Attente</h3><table><thead><tr><th>Patient</th><th>Date/Heure</th><th>Type</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Aucune demande en attente.</td></tr>'}</tbody></table></div>`;
    } else {
        const now = new Date();
        const futureAppts = currentAppointments.filter(a => a.status === 'Confirmed' && new Date(a.date + ' ' + a.time) > now);
        futureAppts.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
        const nextVisit = futureAppts.length > 0 ? `${futureAppts[0].date} à ${futureAppts[0].time}` : 'Aucun rendez-vous à venir';

        content.innerHTML = `<div class="welcome-card"><h3>Bienvenue !</h3><p>Suivez votre santé dentaire.</p><button class="history-btn" onclick="switchView('history')"><i class="fa-solid fa-clock-rotate-left"></i> Voir l'historique médical</button></div><div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;"><div class="stat-card" style="display:block;"><h3 style="margin-bottom:15px; font-size:1.2rem;">📅 Prendre Rendez-vous</h3><form onsubmit="bookAppointment(event)" style="display:flex; flex-direction:column; gap:15px;"><input type="date" id="book-date" required style="padding:10px; border:1px solid #ddd; border-radius:8px;"><input type="time" id="book-time" required style="padding:10px; border:1px solid #ddd; border-radius:8px;"><select id="book-type" style="padding:10px; border:1px solid #ddd; border-radius:8px;"><option value="Contrôle Général">Contrôle Général</option><option value="Blanchiment">Blanchiment</option><option value="Traitement de Canal">Traitement de Canal</option><option value="Détartrage">Détartrage</option></select><button type="submit" class="cta-main-btn" style="width:100%; margin-top:0;">Demander le Rendez-vous</button></form></div><div class="stats-grid" style="display:flex; flex-direction:column; gap:20px; margin:0;"><div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-calendar-check"></i></div><div class="stat-info"><p>Prochaine Visite</p><h3 style="font-size:1.2rem;">${nextVisit}</h3></div></div><div class="stat-card"><div class="stat-icon" style="background:rgba(255, 165, 0, 0.1); color:orange;"><i class="fa-solid fa-star"></i></div><div class="stat-info"><p>Évaluer le Service</p><div id="user-rating-stars" style="font-size:1.2rem; margin-top:5px;">${generateStars(0)}</div></div></div></div></div>`;
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
        `<button onclick="confirmRating()" style="display:block; margin-top:10px; padding:5px 10px; background:#008080; color:white; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Soumettre</button>`;
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
            showToast('success', 'Merci !', 'Votre évaluation a été enregistrée.');
            document.getElementById('user-rating-stars').innerHTML = generateStars(selectedStarCount) + `<span style="color:green; display:block; margin-top:5px; font-size:0.8rem;">Envoyé !</span>`;
        }
    } catch(e) {
        showToast('info', 'Évaluation Sauvegardée', 'Merci pour votre retour !');
        document.getElementById('user-rating-stars').innerHTML = generateStars(selectedStarCount) + `<span style="color:green; display:block; margin-top:5px; font-size:0.8rem;">Envoyé !</span>`;
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
            showToast('success', 'Demande Envoyée', 'Le secrétariat va examiner votre demande sous peu.');
            loadDashboard(currentUser); 
        }
    } catch(err) {
        showToast('error', 'Erreur de Réservation', 'Impossible de traiter votre demande pour le moment.');
    }
}

async function updateStatus(id, status) {
    const res = await fetch(`${API_URL}/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (res.ok) {
        const displayStatus = status === 'Confirmed' ? 'Confirmé' : 'Annulé';
        showToast('info', 'Statut Mis à Jour', `Le rendez-vous a été marqué comme ${displayStatus}.`);
        loadDashboard(currentUser);
    }
}

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

        showToast('info', 'Reprogrammation', `Veuillez sélectionner une nouvelle date et heure pour votre ${appt.type}.`);
    }, 100);
}

function openAdminReschedule(id) {
    const appt = currentAppointments.find(a => a.id == id);
    if (!appt) return;

    const modalHtml = `
    <div id="reschedule-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:100000; display:flex; justify-content:center; align-items:center;">
        <div style="background:white; padding:25px; border-radius:15px; width:90%; max-width:400px; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation: popIn 0.3s ease;">
            <h3 style="margin-top:0; color:var(--primary);"><i class="fa-solid fa-calendar-days"></i> Reprogrammer le Patient</h3>
            <p style="color:#666; margin-bottom:20px;">Nouvel horaire pour <strong>${appt.patientName}</strong> (${appt.type})</p>
            
            <label style="display:block; font-weight:600; margin-bottom:5px; color:#333;">Nouvelle Date</label>
            <input type="date" id="admin-new-date" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px; box-sizing:border-box;" value="${appt.date}">
            
            <label style="display:block; font-weight:600; margin-bottom:5px; color:#333;">Nouvelle Heure</label>
            <input type="time" id="admin-new-time" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:25px; box-sizing:border-box;" value="${appt.time}">
            
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('reschedule-modal').remove()" style="flex:1; padding:12px; border:1px solid #ddd; background:white; border-radius:8px; cursor:pointer; color:#666;">Annuler</button>
                <button onclick="confirmAdminReschedule(${id})" style="flex:1; padding:12px; background:var(--primary); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">Confirmer</button>
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
        showToast('warning', 'Information Manquante', 'Veuillez sélectionner la date et l\'heure');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time, status: 'Confirmed' }) 
        });
        
        if (res.ok) {
            showToast('success', 'Reprogrammé', 'Rendez-vous mis à jour avec succès');
            document.getElementById('reschedule-modal').remove();
            
            const appt = currentAppointments.find(a => a.id == id);
            if(appt) { appt.date = date; appt.time = time; appt.status = 'Confirmed'; }
           
            switchView('appointments');
        }
    } catch(e) {
        showToast('error', 'Erreur', 'Impossible de reprogrammer le rendez-vous');
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    const chatBox = document.getElementById('chat-messages');
    chatBox.innerHTML += `<div class="message user">${msg}</div>`;
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message bot typing';
    typingDiv.innerHTML = `<div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/chat`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ message: msg, sessionId: chatSessionId }) 
        });
        const data = await res.json();
        
        document.getElementById('typing-indicator').remove();
        chatBox.innerHTML += `<div class="message bot">${data.reply}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) { 
        document.getElementById('typing-indicator')?.remove();
        chatBox.innerHTML += `<div class="message bot">⚠️ Service Hors Ligne</div>`; 
        showToast('warning', 'Service IA Hors Ligne', 'Le backend Python n\'est pas accessible.');
    }
}

document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

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
            showToast('info', 'Info Rendez-vous', `Patient : ${info.event.extendedProps.type} pour ${info.event.title}`);
        }
    });

    calendar.render();
}

const styleSheet = document.createElement("style");
styleSheet.textContent = `
    .reveal-element { opacity: 0; transform: translateY(40px); transition: all 1s cubic-bezier(0.5, 0, 0, 1); } 
    .reveal-active { opacity: 1; transform: translateY(0); } 
    
    /* 🌟 STYLES DES POINTS 3D */
    .tooth-hotspot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.9);
        cursor: pointer;
        box-shadow: 0 0 12px rgba(0,0,0,0.4);
        transition: all 0.3s ease;
        padding: 0;
        margin: 0;
        display: block;
    }
    .tooth-hotspot:hover { transform: scale(1.3); }
    .tooth-hotspot[data-visible="false"] { opacity: 0; pointer-events: none; }
    
    .status-healthy { background: #4caf50; }
    .status-cavity { background: #f44336; animation: pulse-red 1.5s infinite; }
    .status-treated { background: #2196f3; box-shadow: 0 0 20px #2196f3; }
    
    @keyframes pulse-red {
        0% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(244, 67, 54, 0); }
        100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0); }
    }
    
    .tooth-tooltip {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 8px;
        padding: 10px 15px;
        font-family: sans-serif;
        font-size: 13px;
        color: #333;
        position: absolute;
        width: max-content;
        transform: translate(30px, -50%);
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        pointer-events: none;
        border: 1px solid rgba(0,0,0,0.05);
        z-index: 1000;
    }

    /* 🌟 BOUTON TOGGLE ANNOTATIONS */
    .toggle-btn-3d {
        background: white;
        border: 2px solid var(--primary, #008080);
        color: var(--primary, #008080);
        padding: 8px 15px;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s;
    }
    .toggle-btn-3d:hover {
        background: #e0f2f1;
    }

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