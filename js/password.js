// Password visibility toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Password strength calculation
    const signupPassword = document.getElementById('signupPassword');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text span');

    if (signupPassword) {
        signupPassword.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            updateStrengthIndicator(strength);
        });
    }
});

// Calculate password strength
function calculatePasswordStrength(password) {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Contains number
    if (/\d/.test(password)) strength += 1;
    
    // Contains lowercase letter
    if (/[a-z]/.test(password)) strength += 1;
    
    // Contains uppercase letter
    if (/[A-Z]/.test(password)) strength += 1;
    
    // Contains special character
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    return strength;
}

// Update strength indicator
function updateStrengthIndicator(strength) {
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text span');
    
    let strengthLabel = '';
    let strengthColor = '';
    let width = 0;
    
    switch(strength) {
        case 0:
            strengthLabel = 'Very Weak';
            strengthColor = '#e53e3e';
            width = 20;
            break;
        case 1:
            strengthLabel = 'Weak';
            strengthColor = '#f6ad55';
            width = 40;
            break;
        case 2:
            strengthLabel = 'Fair';
            strengthColor = '#f6ad55';
            width = 60;
            break;
        case 3:
            strengthLabel = 'Good';
            strengthColor = '#48bb78';
            width = 80;
            break;
        case 4:
            strengthLabel = 'Strong';
            strengthColor = '#48bb78';
            width = 100;
            break;
        case 5:
            strengthLabel = 'Very Strong';
            strengthColor = '#48bb78';
            width = 100;
            break;
    }
    
    strengthBar.style.width = `${width}%`;
    strengthBar.style.backgroundColor = strengthColor;
    strengthText.textContent = strengthLabel;
    strengthText.style.color = strengthColor;
} 