// DOM Elements
const teacherName = document.getElementById('teacherName');
const logoutBtn = document.getElementById('logoutBtn');
const uploadForm = document.getElementById('uploadForm');
const documentFile = document.getElementById('documentFile');
const documentType = document.getElementById('documentType');
const documentsList = document.getElementById('documentsList');

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

    if (!userData || userData.role !== 'teacher') {
        window.location.href = '../index.html';
        return;
    }

    // Set teacher name
    teacherName.textContent = userData.email.split('@')[0];

    // Load documents
    loadDocuments(user.uid);
});

// logoutBtn.addEventListener('click', event => {
//     event.preventDefault();
//     console.log('Logging out...');
//     auth.signOut();
//     window.location.href = '../index.html';
// });

// Logout functionality
logoutBtn.addEventListener('click', async () => {
    console.log('Logging out...');
    try {
        await auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Error logging out:', error);
    }
});

// Upload document functionality
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = documentType.value;
    const file = documentFile.files[0];

    if (!file) {
        alert('Please select a file to upload');
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        // Create a unique filename
        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop();
        const fileName = `${user.uid}_${timestamp}.${fileExtension}`;

        // Upload file to Firebase Storage
        const storageRef = storage.ref(`documents/${fileName}`);
        const uploadTask = storageRef.put(file);

        // Monitor upload progress
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload progress: ${Math.round(progress)}%`);
            },
            (error) => {
                throw error;
            },
            async () => {
                // Get download URL
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

                // Save document metadata to Firebase Database
                await database.ref(`documents/${user.uid}`).push({
                    type: type,
                    fileName: fileName,
                    fileURL: downloadURL,
                    fileType: file.type,
                    fileSize: file.size,
                    uploadedAt: database.ServerValue.TIMESTAMP,
                    status: 'pending'
                });

                alert('Document uploaded successfully!');
                
                // Reset form
                uploadForm.reset();
                
                // Refresh documents list
                loadDocuments(user.uid);
            }
        );
    } catch (error) {
        alert('Error uploading document: ' + error.message);
    }
});

// Load documents
async function loadDocuments(userId) {
    try {
        const documentsRef = database.ref(`documents/${userId}`);
        const snapshot = await documentsRef.once('value');
        const documents = snapshot.val();

        if (!documents) {
            documentsList.innerHTML = '<p>No documents uploaded yet.</p>';
            return;
        }

        documentsList.innerHTML = '';
        Object.entries(documents).forEach(([key, doc]) => {
            const card = createDocumentCard(doc, key);
            documentsList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading documents:', error);
        showError('Error loading documents. Please refresh the page.');
    }
}

// Create document card
function createDocumentCard(doc, docId) {
    const card = document.createElement('div');
    card.className = 'document-card';
    
    const formattedDate = new Date(doc.uploadedAt).toLocaleDateString();
    const formattedType = doc.type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    card.innerHTML = `
        <div class="document-info">
            <h3>${formattedType}</h3>
            <div class="document-meta">
                <span class="file-size">${formatFileSize(doc.fileSize)}</span>
                <span class="upload-date">${formattedDate}</span>
                <span class="status ${doc.status}">${doc.status}</span>
            </div>
        </div>
        <div class="document-actions">
            <a href="${doc.fileURL}" target="_blank" class="btn btn-icon" title="View">
                <i class="fas fa-eye"></i>
            </a>
            <button class="btn btn-icon delete-doc" data-id="${docId}" data-filename="${doc.fileName}" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Add delete handler
    const deleteBtn = card.querySelector('.delete-doc');
    deleteBtn.addEventListener('click', () => deleteDocument(docId, doc.fileName));

    return card;
}

// Delete document
async function deleteDocument(docId, fileName) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        // Delete from Storage
        const storageRef = storage.ref(`documents/${fileName}`);
        await storageRef.delete();

        // Delete from Database
        await database.ref(`documents/${user.uid}/${docId}`).remove();

        alert('Document deleted successfully!');
        loadDocuments(user.uid);
    } catch (error) {
        alert('Error deleting document: ' + error.message);
    }
}

// Utility functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTeacherName();
    loadDocuments();
}); 