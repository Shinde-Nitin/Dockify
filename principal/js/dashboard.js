// DOM Elements
const principalName = document.getElementById('principalName');
const teacherFilter = document.getElementById('teacherFilter');
const documentTypeFilter = document.getElementById('documentTypeFilter');
const searchInput = document.getElementById('searchInput');
const documentsList = document.getElementById('documentsList');
const teachersList = document.getElementById('teachersList');
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const confirmDeleteBtn = document.getElementById('confirmDelete');

// Store all documents and teachers for filtering
let allDocuments = [];
let allTeachers = {};
let teacherToDelete = null;
let principalCollegeCode = null;

// Load principal's name and college code
async function loadPrincipalName() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const snapshot = await firebase.database().ref(`users/${user.uid}`).once('value');
        const userData = snapshot.val();
        
        if (userData) {
            if (userData.name) {
                principalName.textContent = userData.name;
            }
            
            // Store the principal's college code for filtering
            if (userData.collegeCode) {
                principalCollegeCode = userData.collegeCode;
                console.log('Principal college code:', principalCollegeCode);
            } else {
                console.error('Principal college code not found');
                showNotification('Error: College code not found. Please contact support.', 'error');
            }
        }
    } catch (error) {
        console.error('Error loading principal data:', error);
    }
}

// Load and display teachers
async function loadTeachers() {
    try {
        // Get the current user's college code if not already loaded
        if (!principalCollegeCode) {
            const user = firebase.auth().currentUser;
            if (!user) return;
            
            const snapshot = await firebase.database().ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();
            
            if (userData && userData.collegeCode) {
                principalCollegeCode = userData.collegeCode;
            } else {
                console.error('Principal college code not found');
                showNotification('Error: College code not found. Please contact support.', 'error');
                return;
            }
        }
        
        // Query teachers with the same college code as the principal
        const snapshot = await firebase.database().ref('users')
            .orderByChild('role')
            .equalTo('teacher')
            .once('value');
            
        const teachers = snapshot.val() || {};
        
        // Clear existing teachers
        teachersList.innerHTML = '';
        teacherFilter.innerHTML = '<option value="">All Teachers</option>';
        allTeachers = {};
        
        // Filter teachers by college code
        const filteredTeachers = {};
        Object.entries(teachers).forEach(([uid, teacher]) => {
            if (teacher.collegeCode === principalCollegeCode) {
                filteredTeachers[uid] = teacher;
            }
        });
        
        // Check if there are any teachers
        if (Object.keys(filteredTeachers).length === 0) {
            teachersList.innerHTML = `
                <div class="no-teachers">
                    <i class="fas fa-users"></i>
                    <p>No teachers found in your college</p>
                </div>
            `;
            return;
        }
        
        // Add teachers to the grid and filter dropdown
        Object.entries(filteredTeachers).forEach(([uid, teacher]) => {
            allTeachers[uid] = teacher;
            
            // Add to filter dropdown
            const option = document.createElement('option');
            option.value = uid;
            option.textContent = teacher.name;
            teacherFilter.appendChild(option);
            
            // Create teacher card
            const teacherCard = createTeacherCard(uid, teacher);
            teachersList.appendChild(teacherCard);
        });
    } catch (error) {
        console.error('Error loading teachers:', error);
        showNotification('Error loading teachers list.', 'error');
    }
}

// Create teacher card
function createTeacherCard(uid, teacher) {
    const card = document.createElement('div');
    card.className = 'teacher-card';
    
    // Get document count for this teacher
    const teacherDocs = allDocuments.filter(doc => doc.userId === uid);
    const pendingDocs = teacherDocs.filter(doc => doc.status === 'pending').length;
    const approvedDocs = teacherDocs.filter(doc => doc.status === 'approved').length;
    
    card.innerHTML = `
        <div class="teacher-info">
            <div class="teacher-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="teacher-details">
                <h3>${teacher.name}</h3>
                <p class="teacher-email">${teacher.email}</p>
                <div class="teacher-stats" style="display: none; gap: 10px;">
                    <span class="stat-item">
                        <i class="fas fa-file"></i>
                        ${teacherDocs.length} Documents
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-clock"></i>
                        ${pendingDocs} Pending
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-check"></i>
                        ${approvedDocs} Approved
                    </span>
                </div>
            </div>
        </div>
        <div class="teacher-actions">
            <button class="delete-teacher" data-uid="${uid}">Delete Teacher</button>
        </div>
    `;
    
    // Add delete handler
    const deleteBtn = card.querySelector('.delete-teacher');
    deleteBtn.addEventListener('click', () => showDeleteConfirmation(uid, teacher.name));
    
    return card;
}

// Show delete confirmation modal
function showDeleteConfirmation(uid, teacherName) {
    teacherToDelete = uid;
    const modalBody = deleteModal.querySelector('.modal-body p');
    modalBody.textContent = `Are you sure you want to delete ${teacherName}? This action cannot be undone and will remove all their documents.`;
    deleteModal.classList.add('show');
}

// Hide delete confirmation modal
function hideDeleteModal() {
    deleteModal.classList.remove('show');
    // Don't reset teacherToDelete here, it will be reset after successful deletion
}

// Delete teacher and their documents
async function deleteTeacher(uid) {
    try {
        // Show loading overlay
        showLoading('Deleting teacher and associated documents...');
        
        console.log('Starting deletion process for teacher:', uid);
        
        // Delete teacher's documents from storage and database
        const teacherDocs = allDocuments.filter(doc => doc.userId === uid);
        console.log('Found documents to delete:', teacherDocs.length);
        
        for (const doc of teacherDocs) {
            try {
                console.log('Deleting document:', doc.id);
                
                // Delete from storage - using a more robust approach
                if (doc.fileURL) {
                    try {
                        // Try to get a reference from the URL
                        const storageRef = firebase.storage().refFromURL(doc.fileURL);
                        await storageRef.delete();
                        console.log('File deleted from storage:', doc.fileURL);
                    } catch (storageError) {
                        console.error('Error deleting from storage:', storageError);
                        
                        // Fallback: Try to delete using the path if URL method fails
                        if (doc.filePath) {
                            try {
                                const fallbackRef = firebase.storage().ref(doc.filePath);
                                await fallbackRef.delete();
                                console.log('File deleted from storage using path:', doc.filePath);
                            } catch (fallbackError) {
                                console.error('Fallback deletion failed:', fallbackError);
                            }
                        }
                    }
                }
                
                // Delete from database
                await firebase.database().ref(`documents/${doc.id}`).remove();
                console.log('Document deleted successfully from database:', doc.id);
            } catch (error) {
                console.error('Error deleting document:', error);
            }
        }
        
        // Delete teacher from database
        console.log('Deleting teacher from database:', uid);
        await firebase.database().ref(`users/${uid}`).remove();
        console.log('Teacher deleted successfully from database');
        
        // Hide loading overlay
        hideLoading();
        
        // Show success notification
        showNotification('Teacher and associated documents deleted successfully.', 'success');
        
        // Reload teachers and documents
        await loadTeachers();
        await loadDocuments();
        
    } catch (error) {
        console.error('Error deleting teacher:', error);
        hideLoading();
        showNotification('Error deleting teacher. Please try again.', 'error');
    }
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    const loadingOverlay = document.querySelector('.loading-overlay');
    const loadingMessage = loadingOverlay.querySelector('.loading-message');
    loadingMessage.textContent = message;
    loadingOverlay.classList.add('show');
}

// Hide loading overlay
function hideLoading() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    loadingOverlay.classList.remove('show');
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<span class="notification-message">${message}</span>`;
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Event listeners for delete modal
cancelDeleteBtn.addEventListener('click', () => {
    hideDeleteModal();
    teacherToDelete = null; // Only reset teacherToDelete when canceling
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (teacherToDelete) {
        const uidToDelete = teacherToDelete; // Store the ID in a local variable
        hideDeleteModal();
        console.log('Deleting teacher with ID:', uidToDelete);
        await deleteTeacher(uidToDelete);
        teacherToDelete = null; // Reset after deletion is complete
    }
});

// Load all documents
async function loadDocuments() {
    try {
        // Get the current user's college code if not already loaded
        if (!principalCollegeCode) {
            const user = firebase.auth().currentUser;
            if (!user) return;
            
            const snapshot = await firebase.database().ref(`users/${user.uid}`).once('value');
            const userData = snapshot.val();
            
            if (userData && userData.collegeCode) {
                principalCollegeCode = userData.collegeCode;
            } else {
                console.error('Principal college code not found');
                showNotification('Error: College code not found. Please contact support.', 'error');
                return;
            }
        }

        // First, get all teachers in the same college
        const teachersSnapshot = await firebase.database().ref('users')
            .orderByChild('collegeCode')
            .equalTo(principalCollegeCode)
            .once('value');
        
        const teachers = teachersSnapshot.val() || {};
        const teacherIds = Object.keys(teachers);
        
        // Then, get all documents
        const documentsSnapshot = await firebase.database().ref('documents').once('value');
        const documents = documentsSnapshot.val() || {};
        
        // Clear existing documents
        allDocuments = [];
        
        // Filter documents by teacher IDs
        Object.entries(documents).forEach(([docId, doc]) => {
            if (teacherIds.includes(doc.userId)) {
                allDocuments.push({
                    id: docId,
                    ...doc
                });
            }
        });
        
        // Sort documents by upload date (newest first)
        allDocuments.sort((a, b) => b.uploadedAt - a.uploadedAt);
        
        // Apply current filters
        filterAndDisplayDocuments();
        
        console.log('Loaded documents:', allDocuments.length);
    } catch (error) {
        console.error('Error loading documents:', error);
        showNotification('Error loading documents. Please try again.', 'error');
    }
}

// Filter and display documents
function filterAndDisplayDocuments() {
    const selectedTeacher = teacherFilter.value;
    const selectedType = documentTypeFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    
    const filteredDocs = allDocuments.filter(doc => {
        const teacher = allTeachers[doc.userId];
        if (!teacher) return false; // Skip if teacher not found
        
        const matchesTeacher = !selectedTeacher || doc.userId === selectedTeacher;
        const matchesType = !selectedType || doc.type === selectedType;
        const teacherName = teacher.name?.toLowerCase() || '';
        const matchesSearch = !searchTerm || 
            doc.type.toLowerCase().includes(searchTerm) ||
            teacherName.includes(searchTerm) ||
            doc.originalName.toLowerCase().includes(searchTerm);
        
        return matchesTeacher && matchesType && matchesSearch;
    });
    
    displayDocuments(filteredDocs);
}

// Display documents in grid
function displayDocuments(documents) {
    documentsList.innerHTML = '';
    
    if (documents.length === 0) {
        documentsList.innerHTML = `
            <div class="no-documents">
                <i class="fas fa-folder-open"></i>
                <p>No documents found</p>
            </div>
        `;
        return;
    }
    
    documents.forEach(doc => {
        const teacher = allTeachers[doc.userId];
        const teacherName = teacher ? teacher.name : 'Unknown Teacher';
        const docCard = document.createElement('div');
        docCard.className = 'document-card';
        docCard.innerHTML = `
            <div class="document-info">
                <h3>${doc.type}</h3>
                <p class="document-name">${doc.originalName}</p>
                <p class="teacher-name">Uploaded by: ${teacherName}</p>
                <div class="document-meta">
                    <span class="file-size">${formatFileSize(doc.fileSize)}</span>
                    <span class="upload-date">${formatDate(doc.uploadedAt)}</span>
                    <span class="status ${doc.status}">${doc.status}</span>
                </div>
            </div>
            <div class="document-actions">
                <a href="${doc.fileURL}" target="_blank" class="btn btn-icon" title="View">
                    <i class="fas fa-eye"></i>
                </a>
                <button class="btn btn-icon approve-doc ${doc.status === 'approved' ? 'active' : ''}" 
                        data-id="${doc.id}" title="Approve">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-icon reject-doc ${doc.status === 'rejected' ? 'active' : ''}" 
                        data-id="${doc.id}" title="Reject">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add event listeners for document actions
        const approveBtn = docCard.querySelector('.approve-doc');
        const rejectBtn = docCard.querySelector('.reject-doc');
        
        approveBtn.addEventListener('click', () => updateDocumentStatus(doc.id, 'approved'));
        rejectBtn.addEventListener('click', () => updateDocumentStatus(doc.id, 'rejected'));
        
        documentsList.appendChild(docCard);
    });
}

// Update document status
async function updateDocumentStatus(docId, status) {
    try {
        // Show loading indicator on the specific document card
        const docCard = document.querySelector(`[data-id="${docId}"]`).closest('.document-card');
        const statusSpan = docCard.querySelector('.status');
        const originalStatus = statusSpan.textContent;
        statusSpan.textContent = 'Updating...';
        
        // Update the document status in the database
        await firebase.database().ref(`documents/${docId}`).update({
            status: status,
            reviewedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Update the UI without refreshing
        const doc = allDocuments.find(d => d.id === docId);
        if (doc) {
            doc.status = status;
            
            // Update the status span
            statusSpan.textContent = status;
            statusSpan.className = `status ${status}`;
            
            // Update the approve/reject buttons
            const approveBtn = docCard.querySelector('.approve-doc');
            const rejectBtn = docCard.querySelector('.reject-doc');
            
            if (status === 'approved') {
                approveBtn.classList.add('active');
                rejectBtn.classList.remove('active');
            } else if (status === 'rejected') {
                approveBtn.classList.remove('active');
                rejectBtn.classList.add('active');
            }
            
            // Show success notification
            showNotification(`Document ${status} successfully.`, 'success');
        }
    } catch (error) {
        console.error('Error updating document status:', error);
        showNotification('Error updating document status. Please try again.', 'error');
    }
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to format date
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Add event listeners for filters
teacherFilter.addEventListener('change', filterAndDisplayDocuments);
documentTypeFilter.addEventListener('change', filterAndDisplayDocuments);
searchInput.addEventListener('input', filterAndDisplayDocuments);

// Initialize dashboard
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadPrincipalName();
        loadTeachers();
        loadDocuments();
        
        // Set up real-time listeners for documents
        setupRealtimeListeners();
    } else {
        window.location.href = '../login.html';
    }
});

// Set up real-time listeners for documents and teachers
function setupRealtimeListeners() {
    // Listen for document changes
    firebase.database().ref('documents').on('value', (snapshot) => {
        const documents = snapshot.val() || {};
        const updatedDocuments = [];
        
        // Convert documents object to array and add document ID
        Object.entries(documents).forEach(([docId, doc]) => {
            // Only include documents from teachers in the same college
            if (doc.userId && allTeachers[doc.userId] && allTeachers[doc.userId].collegeCode === principalCollegeCode) {
                updatedDocuments.push({
                    id: docId,
                    ...doc
                });
            }
        });
        
        // Sort documents by upload date (newest first)
        updatedDocuments.sort((a, b) => b.uploadedAt - a.uploadedAt);
        
        // Update allDocuments array
        allDocuments = updatedDocuments;
        
        // Apply current filters without clearing the documents list first
        const selectedTeacher = teacherFilter.value;
        const selectedType = documentTypeFilter.value;
        const searchTerm = searchInput.value.toLowerCase();
        
        const filteredDocs = allDocuments.filter(doc => {
            const teacher = allTeachers[doc.userId];
            if (!teacher) return false; // Skip if teacher not found
            
            const matchesTeacher = !selectedTeacher || doc.userId === selectedTeacher;
            const matchesType = !selectedType || doc.type === selectedType;
            const teacherName = teacher.name?.toLowerCase() || '';
            const matchesSearch = !searchTerm || 
                doc.type.toLowerCase().includes(searchTerm) ||
                teacherName.includes(searchTerm) ||
                doc.originalName.toLowerCase().includes(searchTerm);
            
            return matchesTeacher && matchesType && matchesSearch;
        });
        
        // Update the UI without clearing first
        updateDocumentsUI(filteredDocs);
    });
    
    // Listen for teacher changes
    firebase.database().ref('users').orderByChild('role').equalTo('teacher').on('value', (snapshot) => {
        const teachers = snapshot.val() || {};
        
        // Clear existing teachers
        teachersList.innerHTML = '';
        teacherFilter.innerHTML = '<option value="">All Teachers</option>';
        allTeachers = {};
        
        // Filter teachers by college code
        const filteredTeachers = {};
        Object.entries(teachers).forEach(([uid, teacher]) => {
            if (teacher.collegeCode === principalCollegeCode) {
                filteredTeachers[uid] = teacher;
            }
        });
        
        // Check if there are any teachers
        if (Object.keys(filteredTeachers).length === 0) {
            teachersList.innerHTML = `
                <div class="no-teachers">
                    <i class="fas fa-users"></i>
                    <p>No teachers found in your college</p>
                </div>
            `;
            return;
        }
        
        // Add teachers to the grid and filter dropdown
        Object.entries(filteredTeachers).forEach(([uid, teacher]) => {
            allTeachers[uid] = teacher;
            
            // Add to filter dropdown
            const option = document.createElement('option');
            option.value = uid;
            option.textContent = teacher.name;
            teacherFilter.appendChild(option);
            
            // Create teacher card
            const teacherCard = createTeacherCard(uid, teacher);
            teachersList.appendChild(teacherCard);
        });
    });
}

// Update documents UI without clearing first
function updateDocumentsUI(documents) {
    // If there are no documents, show the no documents message
    if (documents.length === 0) {
        documentsList.innerHTML = `
            <div class="no-documents">
                <i class="fas fa-folder-open"></i>
                <p>No documents found</p>
            </div>
        `;
        return;
    }
    
    // Create a map of existing document cards by ID
    const existingCards = {};
    documentsList.querySelectorAll('.document-card').forEach(card => {
        const docId = card.querySelector('.approve-doc').getAttribute('data-id');
        if (docId) {
            existingCards[docId] = card;
        }
    });
    
    // Update or create document cards
    documents.forEach(doc => {
        const teacher = allTeachers[doc.userId];
        const teacherName = teacher ? teacher.name : 'Unknown Teacher';
        
        if (existingCards[doc.id]) {
            // Update existing card
            const card = existingCards[doc.id];
            
            // Update status
            const statusSpan = card.querySelector('.status');
            statusSpan.textContent = doc.status;
            statusSpan.className = `status ${doc.status}`;
            
            // Update buttons
            const approveBtn = card.querySelector('.approve-doc');
            const rejectBtn = card.querySelector('.reject-doc');
            
            if (doc.status === 'approved') {
                approveBtn.classList.add('active');
                rejectBtn.classList.remove('active');
            } else if (doc.status === 'rejected') {
                approveBtn.classList.remove('active');
                rejectBtn.classList.add('active');
            }
            
            // Remove from map to track which ones to keep
            delete existingCards[doc.id];
        } else {
            // Create new card
            const docCard = document.createElement('div');
            docCard.className = 'document-card';
            docCard.innerHTML = `
                <div class="document-info">
                    <h3>${doc.type}</h3>
                    <p class="document-name">${doc.originalName}</p>
                    <p class="teacher-name">Uploaded by: ${teacherName}</p>
                    <div class="document-meta">
                        <span class="file-size">${formatFileSize(doc.fileSize)}</span>
                        <span class="upload-date">${formatDate(doc.uploadedAt)}</span>
                        <span class="status ${doc.status}">${doc.status}</span>
                    </div>
                </div>
                <div class="document-actions">
                    <a href="${doc.fileURL}" target="_blank" class="btn btn-icon" title="View">
                        <i class="fas fa-eye"></i>
                    </a>
                    <button class="btn btn-icon approve-doc ${doc.status === 'approved' ? 'active' : ''}" 
                            data-id="${doc.id}" title="Approve">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-icon reject-doc ${doc.status === 'rejected' ? 'active' : ''}" 
                            data-id="${doc.id}" title="Reject">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Add event listeners for document actions
            const approveBtn = docCard.querySelector('.approve-doc');
            const rejectBtn = docCard.querySelector('.reject-doc');
            
            approveBtn.addEventListener('click', () => updateDocumentStatus(doc.id, 'approved'));
            rejectBtn.addEventListener('click', () => updateDocumentStatus(doc.id, 'rejected'));
            
            documentsList.appendChild(docCard);
        }
    });
    
    // Remove cards that are no longer in the filtered list
    Object.values(existingCards).forEach(card => {
        card.remove();
    });
} 