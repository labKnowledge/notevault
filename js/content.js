// NoteVault Content Script
(function() {
    'use strict';
    
    let buttonContainer = null;
    let selectedText = '';
    let selectionRange = null;
    let isEditableField = false;
    let currentModal = null;
    
    // Create button container with multiple buttons
    function createButtonContainer() {
        if (buttonContainer) return buttonContainer;
        
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'notevault-button-container';
        
        // Save as Note button (always visible)
        const saveButton = document.createElement('button');
        saveButton.className = 'notevault-button notevault-save-button';
        saveButton.textContent = 'Save as Note';
        saveButton.addEventListener('click', handleSaveNote);
        buttonContainer.appendChild(saveButton);
        
        // Explain button (always visible)
        const explainButton = document.createElement('button');
        explainButton.className = 'notevault-button notevault-explain-button';
        explainButton.textContent = 'Explain';
        explainButton.addEventListener('click', handleExplain);
        buttonContainer.appendChild(explainButton);
        
        // Proofread button (only for editable fields)
        const proofreadButton = document.createElement('button');
        proofreadButton.className = 'notevault-button notevault-proofread-button';
        proofreadButton.textContent = 'Proofread';
        proofreadButton.addEventListener('click', handleProofread);
        buttonContainer.appendChild(proofreadButton);
        
        // Refine button (only for editable fields)
        const refineButton = document.createElement('button');
        refineButton.className = 'notevault-button notevault-refine-button';
        refineButton.textContent = 'Refine';
        refineButton.addEventListener('click', handleRefine);
        buttonContainer.appendChild(refineButton);
        
        document.body.appendChild(buttonContainer);
        
        return buttonContainer;
    }
    
    // Check if the selection is in an editable field
    function checkIfEditableField(selection) {
        if (!selection.rangeCount) return false;
        
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        
        // Check if element is contentEditable or is within an editable element
        let current = element;
        while (current && current !== document.body) {
            if (current.contentEditable === 'true' || 
                current.tagName === 'TEXTAREA' || 
                current.tagName === 'INPUT' || 
                current.isContentEditable) {
                return true;
            }
            current = current.parentElement;
        }
        return false;
    }
    
    // Position buttons near selection
    function positionButtons(selection) {
        if (!buttonContainer || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        buttonContainer.style.display = 'flex';
        buttonContainer.style.left = `${rect.left + window.scrollX}px`;
        buttonContainer.style.top = `${rect.bottom + window.scrollY + 5}px`;
        
        // Show/hide buttons based on context
        const proofreadButton = buttonContainer.querySelector('.notevault-proofread-button');
        const refineButton = buttonContainer.querySelector('.notevault-refine-button');
        
        if (isEditableField) {
            proofreadButton.style.display = 'block';
            refineButton.style.display = 'block';
        } else {
            proofreadButton.style.display = 'none';
            refineButton.style.display = 'none';
        }
    }
    
    // Hide buttons
    function hideButtons() {
        if (buttonContainer) {
            buttonContainer.style.display = 'none';
        }
    }
    
    // Handle text selection
    function handleSelection() {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 0) {
            selectedText = text;
            selectionRange = selection.getRangeAt(0).cloneRange();
            isEditableField = checkIfEditableField(selection);
            
            if (!buttonContainer) createButtonContainer();
            positionButtons(selection);
        } else {
            hideButtons();
            selectedText = '';
            selectionRange = null;
            isEditableField = false;
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
                hideButtons();
                window.getSelection().removeAllRanges();
            } else {
                showToast('Failed to save note', 'error');
            }
        });
    }
    
    // Check AI configuration
    function checkAIConfig(callback) {
        chrome.storage.local.get(['ai_config'], (result) => {
            const config = result.ai_config;
            if (!config || !config.apiKey) {
                callback(false, 'AI not configured. Please set up your API key in the extension settings.');
                return;
            }
            callback(true, null);
        });
    }
    
    // Explain text function
    function handleExplain() {
        if (!selectedText) return;
        console.log(`Selected text for explanation: "${selectedText}"`);
        
        // Check AI configuration first
        checkAIConfig((isConfigured, error) => {
            if (!isConfigured) {
                showToast(error, 'error');
                return;
            }
            
            // Check if modal creation is working
            try {
                // Show loading modal
                createModal('Explaining Text', 'Generating explanation...', 'loading');
                hideButtons();
            } catch (error) {
                console.error('Error creating loading modal:', error);
                showToast('Error showing loading indicator', 'error');
                return;
            }
            
            // Continue with AI request
            sendExplainRequest();
        });
    }
    
    function sendExplainRequest() {
        // Send message to background script for AI processing
        chrome.runtime.sendMessage({
            action: 'explainText',
            text: selectedText
        }, (response) => {
            console.log('Explain response:', response);
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                closeModal();
                showToast('Extension communication error', 'error');
                return;
            }
            
            if (response && response.success && response.result) {
                // Show explanation in modal
                createModal('Explanation', response.result, 'info');
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to generate explanation';
                console.error('Explain failed:', errorMsg);
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    // Proofread text function
    function handleProofread() {
        if (!selectedText || !isEditableField) return;
        console.log(`Selected text for proofreading: "${selectedText}"`);

        // Check AI configuration first
        checkAIConfig((isConfigured, error) => {
            if (!isConfigured) {
                showToast(error, 'error');
                return;
            }
            
            // Show loading modal
            createModal('Proofreading Text', 'Checking grammar and spelling...', 'loading');
            hideButtons();
            
            sendProofreadRequest();
        });
    }
    
    function sendProofreadRequest() {
        // Send message to background script for AI processing
        chrome.runtime.sendMessage({
            action: 'proofreadText',
            text: selectedText
        }, (response) => {
            console.log('Proofread response:', response);
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                closeModal();
                showToast('Extension communication error', 'error');
                return;
            }
            
            if (response && response.success && response.result) {
                // Show proofread text in modal with action buttons
                createModal('Proofread Text', response.result, 'editable');
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to proofread text';
                console.error('Proofread failed:', errorMsg);
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    // Refine text function
    function handleRefine() {
        if (!selectedText || !isEditableField) return;
        
        console.log(`Selected text for refinement: "${selectedText}"`);
        
        // Check AI configuration first
        checkAIConfig((isConfigured, error) => {
            if (!isConfigured) {
                showToast(error, 'error');
                return;
            }
            
            // Show loading modal
            createModal('Refining Text', 'Enhancing text quality...', 'loading');
            hideButtons();
            
            sendRefineRequest();
        });
    }
    
    function sendRefineRequest() {
        // Send message to background script for AI processing
        chrome.runtime.sendMessage({
            action: 'refineText',
            text: selectedText
        }, (response) => {
            console.log('Refine response:', response);
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                closeModal();
                showToast('Extension communication error', 'error');
                return;
            }
            
            if (response && response.success && response.result) {
                // Show refined text in modal with action buttons
                createModal('Refined Text', response.result, 'editable');
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to refine text';
                console.error('Refine failed:', errorMsg);
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    // Replace selected text with new text
    function replaceSelectedText(newText) {
        if (!selectionRange) return;
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(selectionRange);
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(newText));
            
            // Clear selection
            selection.removeAllRanges();
        }
    }
    
    // Append text after selected text
    function appendToSelectedText(newText) {
        if (!selectionRange) return;
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(selectionRange);
        
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.collapse(false); // Move to end of selection
            range.insertNode(document.createTextNode(' ' + newText));
            
            // Clear selection
            selection.removeAllRanges();
        }
    }
    
    // Copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    }
    
    // Create and show modal
    function createModal(title, content, type = 'info') {
        try {
            console.log('Creating modal:', title, type);
            if (currentModal) {
                currentModal.remove();
            }
            
            const modal = document.createElement('div');
            modal.className = 'notevault-modal';
        
        const overlay = document.createElement('div');
        overlay.className = 'notevault-modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'notevault-modal-content';
        
        const header = document.createElement('div');
        header.className = 'notevault-modal-header';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'notevault-modal-close';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', closeModal);
        
        header.appendChild(titleElement);
        header.appendChild(closeButton);
        
        const body = document.createElement('div');
        body.className = 'notevault-modal-body';
        
        if (type === 'loading') {
            body.innerHTML = `
                <div class="notevault-loading">
                    <div class="notevault-spinner"></div>
                    <p>${content}</p>
                </div>
            `;
        } else {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'notevault-modal-text';
            contentDiv.textContent = content;
            body.appendChild(contentDiv);
            
            if (type === 'editable') {
                const actions = document.createElement('div');
                actions.className = 'notevault-modal-actions';
                
                const replaceBtn = document.createElement('button');
                replaceBtn.className = 'notevault-modal-btn notevault-btn-primary';
                replaceBtn.textContent = 'Replace';
                replaceBtn.addEventListener('click', () => {
                    replaceSelectedText(content);
                    closeModal();
                    showToast('Text replaced!');
                });
                
                const appendBtn = document.createElement('button');
                appendBtn.className = 'notevault-modal-btn notevault-btn-secondary';
                appendBtn.textContent = 'Append';
                appendBtn.addEventListener('click', () => {
                    appendToSelectedText(content);
                    closeModal();
                    showToast('Text appended!');
                });
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'notevault-modal-btn notevault-btn-outline';
                copyBtn.textContent = 'Copy';
                copyBtn.addEventListener('click', () => {
                    copyToClipboard(content);
                    closeModal();
                });
                
                actions.appendChild(replaceBtn);
                actions.appendChild(appendBtn);
                actions.appendChild(copyBtn);
                body.appendChild(actions);
            } else if (type === 'info') {
                const actions = document.createElement('div');
                actions.className = 'notevault-modal-actions';
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'notevault-modal-btn notevault-btn-primary';
                copyBtn.textContent = 'Copy';
                copyBtn.addEventListener('click', () => {
                    copyToClipboard(content);
                    closeModal();
                });
                
                const closeBtn = document.createElement('button');
                closeBtn.className = 'notevault-modal-btn notevault-btn-outline';
                closeBtn.textContent = 'Close';
                closeBtn.addEventListener('click', closeModal);
                
                actions.appendChild(copyBtn);
                actions.appendChild(closeBtn);
                body.appendChild(actions);
            }
        }
        
        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modal.appendChild(overlay);
        modal.appendChild(modalContent);
        
            document.body.appendChild(modal);
            currentModal = modal;
            
            // Close on overlay click
            overlay.addEventListener('click', closeModal);
            
            // Close on escape key
            document.addEventListener('keydown', handleModalKeydown);
            
            console.log('Modal created and added to DOM');
            return modal;
        } catch (error) {
            console.error('Error creating modal:', error);
            showToast('Error showing modal: ' + error.message, 'error');
            return null;
        }
    }
    
    // Close modal
    function closeModal() {
        if (currentModal) {
            currentModal.remove();
            currentModal = null;
            document.removeEventListener('keydown', handleModalKeydown);
        }
    }
    
    // Handle modal keyboard events
    function handleModalKeydown(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
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
    
    // Hide buttons when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (e.target !== buttonContainer && !buttonContainer?.contains(e.target)) {
            hideButtons();
        }
    });
    
    // Hide buttons on scroll
    window.addEventListener('scroll', hideButtons);
    window.addEventListener('resize', hideButtons);
    
})();