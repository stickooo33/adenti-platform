const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const axios = require('axios'); // Ensure you run: npm install axios

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const MAX_SECRETARIES = 4;
const STAFF_CODE = "TEAM2026";
const ADMIN_CODE = "MYCLINIC123";

// --- Middleware ---
app.use(cors());
app.use(express.json());
// 🚀 FIX 1: Correct path to public folder (since server.js is in root)
app.use(express.static(path.join(__dirname, 'public'))); 

// --- In-Memory Database (Safe for Cloud Demo) ---
// 🚀 FIX 2: Replaced fs (files) with arrays to prevent crashes on Render
let users = [];
let appointments = [
    { id: 101, patientName: 'John Doe', date: '2026-02-19', time: '10:00', type: 'Cleaning', status: 'Confirmed' },
    { id: 102, patientName: 'Sarah Smith', date: '2026-02-19', time: '11:30', type: 'Root Canal', status: 'Pending' }
];
let ratings = [];

// --- 📡 SOCKET.IO CONNECTION ---
io.on('connection', (socket) => {
    // console.log('⚡ Client connected:', socket.id);
});

// --- API ROUTES ---

// 1. AUTHENTICATION
app.post('/api/signup', (req, res) => {
    const { fullName, email, password, role, accessCode } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields!' });

    if (users.find(u => u.email === email)) return res.status(400).json({ success: false, message: 'Email taken!' });

    if (role === 'dentist') {
        if (users.find(u => u.role === 'dentist')) return res.status(403).json({ success: false, message: 'Only 1 Dentist allowed.' });
        if (accessCode !== ADMIN_CODE) return res.status(403).json({ success: false, message: 'Invalid Admin Code!' });
    } else if (role === 'secretary') {
        if (accessCode !== STAFF_CODE) return res.status(403).json({ success: false, message: 'Invalid Staff Code!' });
        if (users.filter(u => u.role === 'secretary').length >= MAX_SECRETARIES) return res.status(403).json({ success: false, message: 'Secretary limit reached.' });
    }

    const newUser = { id: Date.now(), fullName, email, password, role: role || 'patient', createdAt: new Date().toISOString() };
    users.push(newUser);
    res.json({ success: true, message: 'Account created!' });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Check in-memory users OR the mock demo users
    let user = users.find(u => u.email === email && u.password === password);
    
    // Backdoor for Demo (so you can log in immediately)
    if (!user) {
        if(email.includes('admin')) user = { id: 999, fullName: 'Demo Secretary', role: 'secretary' };
        else if(email.includes('doc')) user = { id: 888, fullName: 'Dr. Dentist', role: 'dentist' };
        else if(email.includes('pat')) user = { id: 777, fullName: 'Demo Patient', role: 'patient' };
    }

    if (user) {
        res.json({ success: true, user: { id: user.id, name: user.fullName, role: user.role, email: user.email } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// 2. APPOINTMENTS SYSTEM
app.get('/api/appointments', (req, res) => {
    const { role, userId } = req.query;
    if (role === 'patient') {
        res.json(appointments.filter(a => a.patientId == userId));
    } else {
        res.json(appointments);
    }
});

app.post('/api/appointments', (req, res) => {
    const { patientId, patientName, date, time, type } = req.body;
    
    const newAppt = {
        id: Date.now(),
        patientId,
        patientName,
        date,
        time,
        type,
        status: 'Pending'
    };

    appointments.push(newAppt);

    // 🔔 NOTIFY SECRETARIES
    io.emit('new_appointment', newAppt);

    res.json({ success: true, message: 'Request sent!' });
});

app.patch('/api/appointments/:id', (req, res) => {
    const { status, date, time } = req.body;
    const { id } = req.params;
    const appt = appointments.find(a => a.id == id);
    
    if (appt) {
        if(status) appt.status = status;
        if(date) appt.date = date; // Allow rescheduling
        if(time) appt.time = time;
        
        // 🔔 NOTIFY CLIENTS
        io.emit('status_update', { id, status, date, time, patientName: appt.patientName });
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// 3. 🆕 RATINGS SYSTEM
app.post('/api/ratings', (req, res) => {
    const { stars, patientId } = req.body;
    ratings.push({ id: Date.now(), patientId, stars: Number(stars) });

    // Calculate new average
    const total = ratings.reduce((sum, r) => sum + r.stars, 0);
    const average = (total / ratings.length).toFixed(1);

    res.json({ success: true, average });
});

app.get('/api/ratings', (req, res) => {
    if (ratings.length === 0) return res.json({ average: 4.9 }); // Default fallback
    
    const total = ratings.reduce((sum, r) => sum + r.stars, 0);
    const average = (total / ratings.length).toFixed(1);
    res.json({ average });
});

// 4. CHATBOT PROXY
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    
    // 🚀 FIX 3: Use Environment Variable for Python URL (Render will provide this)
    // If running locally, fallback to localhost. On Render, set PYTHON_URL in settings.
    const pythonUrl = process.env.PYTHON_URL || 'http://127.0.0.1:5000/chat';

    try {
        const response = await axios.post(pythonUrl, { message });
        res.json(response.data);
    } catch (e) {
        console.error("AI Service Error:", e.message);
        res.json({ reply: "I am currently offline. Please call the clinic directly! 📞" });
    }
});

// Handle Frontend Routing (SPA Support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));