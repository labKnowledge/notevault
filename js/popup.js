document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const openFullAppBtn = document.getElementById('open-full-app');
    const newNoteBtn = document.getElementById('new-note');
    const notesContainer = document.getElementById('notes-container');
    const settingsBtn = document.getElementById('settings-btn');

    // Load notes from storage
    function loadNotes() {
        chrome.storage.local.get(['notevault-notes'], function(result) {
            const notes = result['notevault-notes'] || [];
            
            if (notes.length === 0) {
                notesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-sticky-note"></i>
                        <p>No notes yet</p>
                    </div>
                `;
                return;
            }
            
            // Sort notes by updated date (most recent first)
            notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            
            // Display up to 5 most recent notes
            const recentNotes = notes.slice(0, 5);
            
            notesContainer.innerHTML = '';
            
            recentNotes.forEach(note => {
                const noteElement = document.createElement('div');
                noteElement.className = 'note-item';
                noteElement.dataset.id = note.id;
                
                const date = new Date(note.updatedAt);
                const formattedDate = date.toLocaleDateString();
                
                noteElement.innerHTML = `
                    <div class="note-title">${note.title}</div>
                    <div class="note-preview">${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}</div>
                    <div class="note-date">${formattedDate}</div>
                `;
                
                noteElement.addEventListener('click', function() {
                    openNoteInApp(note.id);
                });
                
                notesContainer.appendChild(noteElement);
            });
        });
    }

    // Open full app in a new tab
    openFullAppBtn.addEventListener('click', function() {
        chrome.tabs.create({ url: chrome.runtime.getURL('notevault.html') });
        window.close();
    });

    // Create a new note
    newNoteBtn.addEventListener('click', function() {
        // Create a new note with default content
        const newNote = {
            id: Date.now().toString(),
            title: 'New Note',
            content: '',
            tags: [],
            notebookId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Get existing notes
        chrome.storage.local.get(['notevault-notes'], function(result) {
            const notes = result['notevault-notes'] || [];
            notes.unshift(newNote);
            
            // Save notes
            chrome.storage.local.set({ 'notevault-notes': notes }, function() {
                // Open the app with the new note
                chrome.tabs.create({ 
                    url: `${chrome.runtime.getURL('notevault.html')}?noteId=${newNote.id}` 
                });
                window.close();
            });
        });
    });

    // Open a specific note in the app
    function openNoteInApp(noteId) {
        chrome.tabs.create({ 
            url: `${chrome.runtime.getURL('notevault.html')}?noteId=${noteId}` 
        });
        window.close();
    }

    // Settings button (placeholder for future functionality)
    settingsBtn.addEventListener('click', function() {
        alert('Settings feature coming soon!');
    });

    // Load notes when popup opens
    loadNotes();
});