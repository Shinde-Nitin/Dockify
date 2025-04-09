// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const documentFile = document.getElementById('documentFile');
const documentType = document.getElementById('documentType');
const customTypeGroup = document.getElementById('customTypeGroup');
const customDocumentType = document.getElementById('customDocumentType');
const documentsList = document.getElementById('documentsList');
const teacherName = document.getElementById('teacherName');
const loadingOverlay = document.getElementById('loadingOverlay');
const searchInput = document.getElementById('searchInput');
const documentTypeFilter = document.getElementById('documentTypeFilter');
const statusFilter = document.getElementById('statusFilter');

// Store all documents for filtering
let allDocuments = [];

// Load teacher's name
async function loadTeacherName() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const snapshot = await firebase.database().ref(`users/${user.uid}`).once('value');
        const userData = snapshot.val();
        
        if (userData && userData.name) {
            teacherName.textContent = userData.name;
        }
    } catch (error) {
        console.error('Error loading teacher name:', error);
    }
}

// Handle document type change
documentType.addEventListener('change', function() {
    if (this.value === 'other') {
        customTypeGroup.style.display = 'block';
        customDocumentType.required = true;
    } else {
        customTypeGroup.style.display = 'none';
        customDocumentType.required = false;
        customDocumentType.value = '';
    }
});

// Upload form submit handler
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent form submission and page refresh
    
    let type = documentType.value;
    // If "Other" is selected, use the custom type value
    if (type === 'other') {
        type = customDocumentType.value.trim();
        if (!type) {
            alert('Please specify the document type');
            return;
        }
    }
    
    const file = documentFile.files[0];

    if (!file) {
        alert('Please select a file to upload');
        return;
    }

    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not authenticated');

        // Show loading overlay
        loadingOverlay.style.display = 'flex';

        // Create a unique filename
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${user.uid}_${timestamp}.${fileExtension}`;

        // Upload file to Firebase Storage
        const storageRef = firebase.storage().ref(`documents/${fileName}`);
        const uploadTask = storageRef.put(file);

        // Monitor upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload progress: ${Math.round(progress)}%`);
            },
            (error) => {
                loadingOverlay.style.display = 'none';
                alert('Error uploading file: ' + error.message);
            },
            async () => {
                try {
                    // Get download URL
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

                    // Create a new document entry in the database
                    const newDocRef = firebase.database().ref('documents').push();
                    const docId = newDocRef.key;

                    // Save document metadata to Firebase Database
                    await firebase.database().ref(`documents/${docId}`).set({
                        userId: user.uid,
                        type: type,
                        fileName: fileName,
                        fileURL: downloadURL,
                        fileType: file.type,
                        fileSize: file.size,
                        uploadedAt: firebase.database.ServerValue.TIMESTAMP,
                        status: 'pending',
                        originalName: file.name
                    });

                    // Also save reference in user's documents
                    await firebase.database().ref(`users/${user.uid}/documents/${docId}`).set(true);

                    // Hide loading overlay
                    loadingOverlay.style.display = 'none';

                    // Show success message
                    alert('Document uploaded successfully!');
                    
                    // Reset form
                    uploadForm.reset();
                    
                    // Refresh documents list
                    loadDocuments();
                } catch (error) {
                    loadingOverlay.style.display = 'none';
                    alert('Error saving document metadata: ' + error.message);
                }
            }
        );
    } catch (error) {
        loadingOverlay.style.display = 'none';
        alert('Error uploading document: ' + error.message);
    }
});

// Load documents
async function loadDocuments() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not authenticated');

        // Get user's document references
        const userDocsSnapshot = await firebase.database().ref(`users/${user.uid}/documents`).once('value');
        const userDocs = userDocsSnapshot.val() || {};
        const docIds = Object.keys(userDocs);

        // Get all documents
        allDocuments = [];
        for (const docId of docIds) {
            const docSnapshot = await firebase.database().ref(`documents/${docId}`).once('value');
            const docData = docSnapshot.val();
            if (docData) {
                allDocuments.push({
                    id: docId,
                    ...docData
                });
            }
        }

        // Sort documents by upload date (newest first)
        allDocuments.sort((a, b) => b.uploadedAt - a.uploadedAt);

        // Apply current filters and display
        filterAndDisplayDocuments();
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

// Filter and display documents
function filterAndDisplayDocuments() {
    const searchTerm = searchInput.value.toLowerCase();
    const typeFilter = documentTypeFilter.value;
    const statusFilterValue = statusFilter.value;

    const filteredDocs = allDocuments.filter(doc => {
        const matchesSearch = !searchTerm || 
            doc.originalName.toLowerCase().includes(searchTerm) ||
            doc.type.toLowerCase().includes(searchTerm);
        const matchesType = !typeFilter || doc.type === typeFilter;
        const matchesStatus = !statusFilterValue || doc.status === statusFilterValue;

        return matchesSearch && matchesType && matchesStatus;
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
        const docCard = document.createElement('div');
        docCard.className = 'document-card';
        docCard.innerHTML = `
            <div class="document-info">
                <h3>${doc.type}</h3>
                <p class="document-name">${doc.originalName}</p>
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
                <button class="btn btn-icon delete-doc" data-id="${doc.id}" data-filename="${doc.fileName}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add delete handler
        const deleteBtn = docCard.querySelector('.delete-doc');
        deleteBtn.addEventListener('click', () => deleteDocument(doc.id, doc.fileName));

        documentsList.appendChild(docCard);
    });
}

// Delete document
async function deleteDocument(docId, fileName) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('User not authenticated');

        // Delete from Storage
        const storageRef = firebase.storage().ref(`documents/${fileName}`);
        await storageRef.delete();

        // Delete from Database
        await firebase.database().ref(`documents/${docId}`).remove();
        await firebase.database().ref(`users/${user.uid}/documents/${docId}`).remove();

        alert('Document deleted successfully!');
        loadDocuments();
    } catch (error) {
        alert('Error deleting document: ' + error.message);
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

// Add event listeners for search and filters
searchInput.addEventListener('input', filterAndDisplayDocuments);
documentTypeFilter.addEventListener('change', filterAndDisplayDocuments);
statusFilter.addEventListener('change', filterAndDisplayDocuments);

// Initialize dashboard
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadTeacherName();
        loadDocuments();
        
        // Set up real-time listeners for documents
        setupRealtimeListeners(user.uid);
    } else {
        window.location.href = '../login.html';
    }
});

// Set up real-time listeners for documents
function setupRealtimeListeners(userId) {
    // Listen for document changes
    firebase.database().ref('documents').on('value', async snapshot => {
        const documents = snapshot.val() || {};
        
        // Get user's document references
        const userDocsSnapshot = await firebase.database().ref(`users/${userId}/documents`).once('value');
        const userDocs = userDocsSnapshot.val() || {};
        const docIds = Object.keys(userDocs);
        
        // Update allDocuments array
        allDocuments = [];
        for (const docId of docIds) {
            if (documents[docId]) {
                allDocuments.push({
                    id: docId,
                    ...documents[docId]
                });
            }
        }
        
        // Sort documents by upload date (newest first)
        allDocuments.sort((a, b) => b.uploadedAt - a.uploadedAt);
        
        // Apply current filters and display
        filterAndDisplayDocuments();
    });
} 