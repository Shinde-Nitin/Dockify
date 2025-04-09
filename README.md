# Dockify

A document management system for educational institutions, built with HTML, CSS, JavaScript, and Firebase.

## Features

- 🔐 Secure authentication system with role-based access
- 👨‍🏫 Teacher Dashboard for document upload and management
- 👨‍💼 Principal Dashboard for document oversight
- 📁 Document storage and management
- 🔍 Advanced filtering and search capabilities

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase
  - Authentication
  - Realtime Database
  - Storage

## Setup Instructions

1. Clone the repository
2. Create a Firebase project and enable:
   - Email/Password Authentication
   - Realtime Database
   - Storage
3. Copy your Firebase configuration to `config.js`
4. Open `index.html` in a web browser

## Project Structure

```
dockify/
├── index.html          # Landing page with authentication
├── styles.css          # Main stylesheet
├── auth.js            # Authentication logic
├── config.js          # Firebase configuration
├── teacher/           # Teacher dashboard files
└── principal/         # Principal dashboard files
```

## Security

- All routes are protected with authentication
- Role-based access control
- Secure file uploads with type validation 