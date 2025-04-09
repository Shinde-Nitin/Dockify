// DOM Elements
const loginButtons = document.querySelectorAll('a[href="/login.html"]');

// Add click event listeners to login buttons
loginButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        checkAuthState();
    });
});

// Function to check auth state
function checkAuthState() {
    const userRole = sessionStorage.getItem('userRole');
    const userId = sessionStorage.getItem('userId');
    
    if (userRole && userId) {
        // User is already logged in, redirect to appropriate dashboard
        redirectBasedOnRole(userRole);
    } else {
        // User is not logged in, proceed to login page
        window.location.href = '/login.html';
    }
}

// Function to redirect based on role
function redirectBasedOnRole(role) {
    if (role === 'teacher') {
        window.location.href = '/teacher/dashboard.html';
    } else if (role === 'principal') {
        window.location.href = '/principal/dashboard.html';
    } else {
        window.location.href = '/index.html';
    }
} 