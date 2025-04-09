// DOM Elements
const principalName = document.getElementById('principalName');
const logoutBtn = document.getElementById('logoutBtn');
const teacherFilter = document.getElementById('teacherFilter');
const documentTypeFilter = document.getElementById('documentTypeFilter');
const searchInput = document.getElementById('searchInput');
const documentsList = document.getElementById('documentsList');

// State
let allDocuments = [];
let teachers = new Map();

// Check authentication and role
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // Get user data
    const userRef = database.ref(`users/${user.uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData || userData.role !== 'principal') {
        window.location.href = '../index.html';
        return;
    }

    // Set principal name
    principalName.textContent = userData.email.split('@')[0];

    // Load teachers and documents
    await loadTeachers();
    loadDocuments();
});

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
});

// Load teachers
async function loadTeachers() {
    try {
        const usersRef = database.ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val();

        if (!users) return;

        // Clear existing options
        teacherFilter.innerHTML = '<option value="">All Teachers</option>';

        // Add teacher options
        Object.entries(users).forEach(([uid, userData]) => {
            if (userData.role === 'teacher') {
                const teacherName = userData.email.split('@')[0];
                teachers.set(uid, teacherName);
                
                const option = document.createElement('option');
                option.value = uid;
                option.textContent = teacherName;
                teacherFilter.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading teachers:', error);
        showError('Error loading teachers list.');
    }
}

// Load documents
async function loadDocuments() {
    try {
        const documentsRef = database.ref('documents');
        const snapshot = await documentsRef.once('value');
        const documents = snapshot.val();

        if (!documents) {
            documentsList.innerHTML = '<p>No documents found.</p>';
            return;
        }

        // Convert documents object to array
        allDocuments = [];
        Object.entries(documents).forEach(([userId, userDocs]) => {
            Object.entries(userDocs).forEach(([docId, doc]) => {
                allDocuments.push({
                    id: docId,
                    userId,
                    ...doc
                });
            });
        });

        // Apply filters
        applyFilters();
    } catch (error) {
        console.error('Error loading documents:', error);
        showError('Error loading documents.');
    }
}

// Apply filters
function applyFilters() {
    const selectedTeacher = teacherFilter.value;
    const selectedType = documentTypeFilter.value;
    const searchTerm = searchInput.value.toLowerCase();

    let filteredDocs = allDocuments;

    // Filter by teacher
    if (selectedTeacher) {
        filteredDocs = filteredDocs.filter(doc => doc.userId === selectedTeacher);
    }

    // Filter by document type
    if (selectedType) {
        filteredDocs = filteredDocs.filter(doc => doc.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
        filteredDocs = filteredDocs.filter(doc => 
            doc.name.toLowerCase().includes(searchTerm) ||
            teachers.get(doc.userId).toLowerCase().includes(searchTerm)
        );
    }

    // Display filtered documents
    displayDocuments(filteredDocs);
}

// Display documents
function displayDocuments(documents) {
    documentsList.innerHTML = '';

    if (documents.length === 0) {
        documentsList.innerHTML = '<p>No documents found matching the filters.</p>';
        return;
    }

    documents.forEach(doc => {
        const card = createDocumentCard(doc);
        documentsList.appendChild(card);
    });
}

// Create document card
function createDocumentCard(doc) {
    const card = document.createElement('div');
    card.className = 'document-card';
    
    const formattedDate = new Date(doc.uploadedAt).toLocaleDateString();
    const formattedType = doc.type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    const teacherName = teachers.get(doc.userId);

    card.innerHTML = `
        <p class="teacher-name">${teacherName}</p>
        <h3>${formattedType}</h3>
        <p>${doc.name}</p>
        <p>Uploaded: ${formattedDate}</p>
        <div class="document-actions">
            <a href="${doc.url}" target="_blank" class="btn btn-primary">View</a>
        </div>
    `;

    return card;
}

// Event listeners for filters
teacherFilter.addEventListener('change', applyFilters);
documentTypeFilter.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);

// Utility functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
} 