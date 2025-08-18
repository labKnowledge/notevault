// NoteVault Content Script
(function() {
    'use strict';
    
    let saveButton = null;
    let selectedText = '';
    let selectionRange = null;
    
    // Create save button
    function createSaveButton() {
        if (saveButton) return saveButton;
        
        saveButton = document.createElement('button');
        saveButton.className = 'notevault-save-button';
        saveButton.textContent = 'Save as Note';
        saveButton.addEventListener('click', handleSaveNote);
        document.body.appendChild(saveButton);
        
        return saveButton;
    }
    
    // Position button near selection
    function positionButton(selection) {
        if (!saveButton || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        saveButton.style.display = 'block';
        saveButton.style.left = `${rect.left + window.scrollX}px`;
        saveButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
    }
    
    // Hide button
    function hideButton() {
        if (saveButton) {
            saveButton.style.display = 'none';
        }
    }
    
    // Handle text selection
    function handleSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 0) {
            selectedText = text;
            selectionRange = selection.getRangeAt(0).cloneRange();
            
            if (!saveButton) createSaveButton();
            positionButton(selection);
        } else {
            hideButton();
            selectedText = '';
            selectionRange = null;
        }
    }
    
    // Save note function
    function handleSaveNote() {
        if (!selectedText) return;
        
        // Get page title and URL for context
        const pageTitle = document.title;
        const pageUrl = window.location.href;
        
        // Generate unique ID (same as main app)
        function generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substring(2);
        }

        // Create note object matching main app structure
        const newNote = {
            id: generateId(),
            title: `Note from ${pageTitle}`,
            content: `${selectedText}\n\n---\nSource: ${pageUrl}`,
            tags: [],
            notebookId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Send message to background script to save note
        chrome.runtime.sendMessage({
            action: 'saveNote',
            note: newNote
        }, (response) => {
            if (response && response.success) {
                showToast('Note saved successfully!');
                hideButton();
                window.getSelection().removeAllRanges();
            } else {
                showToast('Failed to save note', 'error');
            }
        });
    }
    
    // Show toast notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4caf50' : '#f44336'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            z-index: 10001;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 3000);
    }
    
    // Event listeners
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    
    // Hide button when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (e.target !== saveButton && !saveButton?.contains(e.target)) {
            hideButton();
        }
    });
    
    // Hide button on scroll
    window.addEventListener('scroll', hideButton);
    window.addEventListener('resize', hideButton);
    
})();