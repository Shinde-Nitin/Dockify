// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const toggleLoginBtn = document.getElementById('toggleLogin');
const toggleSignupBtn = document.getElementById('toggleSignup');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const logoutBtn = document.getElementById('logoutBtn');

// Auth state observer
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        logoutBtn.style.display = 'inline-flex';
        // Redirect to appropriate dashboard if on login page
        if (window.location.pathname.endsWith('login.html')) {
            getUserRole(user.uid).then(role => {
                redirectBasedOnRole(role);
            });
        }
    } else {
        // User is signed out
        logoutBtn.style.display = 'none';
        // Redirect to login if on dashboard pages
        if (window.location.pathname.includes('/teacher/') || window.location.pathname.includes('/principal/')) {
            window.location.href = '/login.html';
        }
    }
});

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    try {
        await firebase.auth().signOut();
        showSuccess('Logged out successfully!');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1500);
    } catch (error) {
        showError('Error logging out: ' + error.message);
    }
});

// Form toggle functionality
toggleLoginBtn.addEventListener('click', () => {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    clearMessages();
});

toggleSignupBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    clearMessages();
});

// Login functionality
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        if (rememberMe) {
            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        }
        showSuccess('Login successful!');
        // Redirect based on role
        const userRole = await getUserRole(userCredential.user.uid);
        redirectBasedOnRole(userRole);
    } catch (error) {
        showError(error.message);
    }
});

// Signup functionality
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('role').value;
    const terms = document.getElementById('terms').checked;

    if (!terms) {
        showError('Please accept the Terms of Service and Privacy Policy');
        return;
    }

    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await saveUserRole(userCredential.user.uid, role);
        showSuccess('Account created successfully!');
        redirectBasedOnRole(role);
    } catch (error) {
        showError(error.message);
    }
});

// Helper functions
async function getUserRole(uid) {
    try {
        const snapshot = await firebase.database().ref(`users/${uid}/role`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}

async function saveUserRole(uid, role) {
    try {
        await firebase.database().ref(`users/${uid}`).set({
            role: role,
            email: firebase.auth().currentUser.email,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error('Error saving user role:', error);
        throw error;
    }
}

function redirectBasedOnRole(role) {
    switch (role) {
        case 'teacher':
            window.location.href = 'teacher/dashboard.html';
            break;
        case 'principal':
            window.location.href = 'principal/dashboard.html';
            break;
        default:
            showError('Invalid user role');
    }
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(message) {
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }
}

function clearMessages() {
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
} 