

ADENTI is a full-stack, AI-powered healthcare management solution designed to streamline dental clinic operations. This project features a dual-service architecture with a real-time dashboard for staff and a smart AI chatbot for patient interaction.

🚀 Key Features

👤 Multi-Role Dashboard

Dentist: Full clinic overview, revenue tracking, and medical record management.

Secretary: Appointment scheduling, patient check-ins, and real-time notifications.

Patient: 24/7 self-booking portal and appointment history.

🤖 AI DentBot

Integrated Python/Flask AI service.

Handles patient inquiries regarding prices, hours, and services using natural language processing.

⚡ Real-Time Operations

Powered by Socket.io for instant synchronization.

Appointments booked by patients appear instantly on the secretary's dashboard without page refreshes.

🌙 Modern UI/UX

Responsive design for mobile and desktop.

Dark Mode support for medical environments.

🛠️ Tech Stack

Frontend

HTML5 / CSS3 / JavaScript (ES6+)

Tailwind CSS for modern styling.

Socket.io Client for real-time updates.

Backend (Main Engine)

Node.js & Express

Socket.io Server for bidirectional communication.

Axios for communication with the AI service.

AI Service (The Brain)

Python 3.x

Flask with CORS support.

🏗️ Architecture

This project uses a Microservices-style architecture:

The Dashboard Service (Node.js): Handles users, authentication, and frontend serving.

The AI Service (Python): A dedicated lightweight API that processes chatbot logic.

🌐 Deployment Note (Render Free Tier)

The platform is deployed on Render.

Note: On the free plan, the services "spin down" after 15 minutes of inactivity. Please allow 30-60 seconds for the initial load if the site has been idle.

Data persistence is currently in-memory (RAM) for demo purposes, resetting periodically to maintain a clean environment for reviewers.

Author :

Project developed for Kassimi Mustapha. Building the future of dental care, one line of code at a time.

<img width="1892" height="826" alt="image" src="https://github.com/user-attachments/assets/db9b9d53-3cb6-4535-8ea1-b1669680b992" />

