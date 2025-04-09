// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const loginToggle = document.getElementById('loginToggle');
const signupToggle = document.getElementById('signupToggle');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const backToLoginBtn = document.getElementById('backToLoginBtn');
const authContainer = document.querySelector('.auth-container');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const logoutBtn = document.getElementById('logoutBtn');

// Get role-specific form elements
const roleSelect = document.getElementById('signupRole');
const principalFields = document.getElementById('principalFields');
const teacherFields = document.getElementById('teacherFields');

// Hide messages on page load
document.addEventListener('DOMContentLoaded', () => {
    clearMessages();
});

// Toggle between login and signup forms
if (loginToggle && signupToggle) {
    loginToggle.addEventListener('click', () => {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        resetPasswordForm.style.display = 'none';
        clearMessages();
    });

    signupToggle.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        resetPasswordForm.style.display = 'none';
        clearMessages();
    });
}

// Handle role selection change
if (roleSelect) {
    roleSelect.addEventListener('change', () => {
        const selectedRole = roleSelect.value;
        if (selectedRole === 'principal') {
            principalFields.style.display = 'block';
            teacherFields.style.display = 'none';
            // Make principal-specific fields required
            document.getElementById('collegeAddress').required = true;
            // Make teacher-specific fields not required
            document.getElementById('signupName').required = false;
            document.getElementById('department').required = false;
        } else if (selectedRole === 'teacher') {
            principalFields.style.display = 'none';
            teacherFields.style.display = 'block';
            // Make teacher-specific fields required
            document.getElementById('signupName').required = true;
            document.getElementById('department').required = true;
            // Make principal-specific fields not required
            document.getElementById('collegeAddress').required = false;
        } else {
            principalFields.style.display = 'none';
            teacherFields.style.display = 'none';
        }
    });
}

// Toggle to reset password form
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'none';
        resetPasswordForm.style.display = 'block';
        clearMessages();
    });
}

// Back to login button
if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', () => {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        resetPasswordForm.style.display = 'none';
        clearMessages();
    });
}

// Handle Reset Password
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const email = document.getElementById('resetEmail').value;

        try {
            await auth.sendPasswordResetEmail(email);
            showSuccess('Password reset email sent! Please check your inbox.');
            
            // Clear the form
            resetPasswordForm.reset();
            
            // Switch back to login form after 3 seconds
            setTimeout(() => {
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
                resetPasswordForm.style.display = 'none';
            }, 3000);
        } catch (error) {
            let errorMsg = 'Failed to send reset email. ';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMsg += 'No account found with this email.';
                    break;
                case 'auth/invalid-email':
                    errorMsg += 'Invalid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMsg += 'Too many attempts. Please try again later.';
                    break;
                default:
                    errorMsg += error.message;
            }
            showError(errorMsg);
        }
    });
}

// Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Get user role from database
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val();

            if (!userData) {
                throw new Error('User data not found');
            }

            showSuccess('Login successful! Redirecting...');

            // Redirect based on role
            setTimeout(() => {
                if (userData.role === 'teacher') {
                    window.location.href = '/teacher/dashboard.html';
                } else if (userData.role === 'principal') {
                    window.location.href = '/principal/dashboard.html';
                } else {
                    window.location.href = '/index.html';
                }
            }, 1500);

        } catch (error) {
            let errorMsg = 'Login failed. ';
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMsg += 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    errorMsg += 'Incorrect password.';
                    break;
                case 'auth/invalid-email':
                    errorMsg += 'Invalid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMsg += 'Too many failed attempts. Please try again later.';
                    break;
                default:
                    errorMsg += error.message;
            }
            showError(errorMsg);
        }
    });
}

// Handle Signup
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        // Get form values with fallbacks for missing elements
        const email = document.getElementById('signupEmail')?.value || '';
        const password = document.getElementById('signupPassword')?.value || '';
        const role = document.getElementById('signupRole')?.value || 'teacher'; // Default to teacher if not specified
        const name = document.getElementById('signupName')?.value || '';
        const department = document.getElementById('department')?.value || '';
        const collegeCode = document.getElementById('collegeCode')?.value || '';
        const collegeName = document.getElementById('collegeName')?.value || '';

        // Validate required fields
        if (!email || !password || !role || !collegeCode || !collegeName) {
            showError('Please fill in all required fields.');
            return;
        }

        try {
            // If role is principal, check if college code is already in use
            if (role === 'principal') {
                const principalsRef = firebase.database().ref('users');
                const snapshot = await principalsRef.orderByChild('collegeCode').equalTo(collegeCode).once('value');
                
                if (snapshot.exists()) {
                    // College code is already in use
                    showError('This college code is already registered. Please use a different college code or contact support.');
                    return;
                }
            }
            
            // Create user account
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Prepare user data
            const userData = {
                email: email,
                role: role,
                collegeCode: collegeCode,
                collegeName: collegeName,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            // Add role-specific data
            if (role === 'principal') {
                const collegeAddress = document.getElementById('collegeAddress')?.value || '';
                userData.collegeAddress = collegeAddress;
                // Store college data
                await firebase.database().ref(`colleges/${collegeCode}`).set({
                    name: `College ${collegeCode}`,
                    principalId: user.uid,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            } else if (role === 'teacher') {
                userData.name = name || 'New Teacher'; // Default name if not provided
                userData.department = department || 'Not Specified'; // Default department if not provided
                userData.qualification = ''; // Will be updated later
                userData.experience = ''; // Will be updated later
                userData.status = 'active';
            }

            // Check if this is the first entry in the database
            const usersRef = firebase.database().ref('users');
            const snapshot = await usersRef.once('value');
            
            if (!snapshot.exists()) {
                // This is the first user, create the users node
                await usersRef.set({
                    [user.uid]: userData
                });
            } else {
                // Add to existing users
                await usersRef.child(user.uid).set(userData);
            }

            // Send email verification
            await user.sendEmailVerification();

            // Show success message and redirect
            showSuccess('Account created successfully! Please check your email for verification.');
            
            // Clear form
            signupForm.reset();

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);

        } catch (error) {
            console.error('Signup error:', error);
            switch (error.code) {
                case 'auth/email-already-in-use':
                    showError('This email is already registered. Please use a different email or sign in.');
                    break;
                case 'auth/invalid-email':
                    showError('Please enter a valid email address.');
                    break;
                case 'auth/operation-not-allowed':
                    showError('Email/password accounts are not enabled. Please contact support.');
                    break;
                case 'auth/weak-password':
                    showError('Please choose a stronger password (at least 6 characters).');
                    break;
                default:
                    showError('An error occurred during signup. Please try again.');
            }
        }
    });
}

// Handle Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            showSuccess('Logged out successfully!');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1500);
        } catch (error) {
            showError('Error logging out: ' + error.message);
        }
    });
}

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        try {
            const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
            const userData = userSnapshot.val();

            if (userData) {
                // Show logout button if on dashboard
                if (logoutBtn) {
                    logoutBtn.style.display = 'block';
                }

                // Redirect to appropriate dashboard if on login page
                if (window.location.pathname.includes('login.html')) {
                    if (userData.role === 'teacher') {
                        window.location.href = '/teacher/dashboard.html';
                    } else if (userData.role === 'principal') {
                        window.location.href = '/principal/dashboard.html';
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    } else {
        // User is signed out
        if (logoutBtn) {
            logoutBtn.style.display = 'none';
        }

        // Redirect to login if on dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            window.location.href = '/login.html';
        }
    }
});

// Utility functions
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }
}

function showSuccess(message) {
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }
}

function clearMessages() {
    if (errorMessage) {
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
    }
    if (successMessage) {
        successMessage.textContent = '';
        successMessage.style.display = 'none';
    }
} 