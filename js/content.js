// NoteVault Content Script
(function() {
    'use strict';
    
    let buttonContainer = null;
    let selectedText = '';
    let selectionRange = null;
    let selectionInfo = null; // Store additional selection info for form elements
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
        saveButton.title = 'Save as Note';
        saveButton.addEventListener('click', handleSaveNote);
        buttonContainer.appendChild(saveButton);
        
        // Explain button (always visible)
        const explainButton = document.createElement('button');
        explainButton.className = 'notevault-button notevault-explain-button';
        explainButton.title = 'Explain';
        explainButton.addEventListener('click', handleExplain);
        buttonContainer.appendChild(explainButton);
        
        // Proofread button (only for editable fields)
        const proofreadButton = document.createElement('button');
        proofreadButton.className = 'notevault-button notevault-proofread-button';
        proofreadButton.title = 'Proofread';
        proofreadButton.addEventListener('click', handleProofread);
        buttonContainer.appendChild(proofreadButton);
        
        // Refine button (only for editable fields)
        const refineButton = document.createElement('button');
        refineButton.className = 'notevault-button notevault-refine-button';
        refineButton.title = 'Refine';
        refineButton.addEventListener('click', handleRefine);
        buttonContainer.appendChild(refineButton);
        
        // Expand button (only for editable fields)
        const expandButton = document.createElement('button');
        expandButton.className = 'notevault-button notevault-expand-button';
        expandButton.title = 'Expand';
        expandButton.addEventListener('click', handleExpand);
        buttonContainer.appendChild(expandButton);
        
        // Humanize button (only for editable fields)
        const humanizeButton = document.createElement('button');
        humanizeButton.className = 'notevault-button notevault-humanize-button';
        humanizeButton.title = 'Humanize';
        humanizeButton.addEventListener('click', handleHumanize);
        buttonContainer.appendChild(humanizeButton);
        
        // Generate button (only for editable fields)
        const generateButton = document.createElement('button');
        generateButton.className = 'notevault-button notevault-generate-button';
        generateButton.title = 'Generate';
        generateButton.addEventListener('click', handleGenerate);
        buttonContainer.appendChild(generateButton);
        
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
        const expandButton = buttonContainer.querySelector('.notevault-expand-button');
        const humanizeButton = buttonContainer.querySelector('.notevault-humanize-button');
        const generateButton = buttonContainer.querySelector('.notevault-generate-button');
        
        if (isEditableField) {
            proofreadButton.style.display = 'block';
            refineButton.style.display = 'block';
            expandButton.style.display = 'block';
            humanizeButton.style.display = 'block';
            generateButton.style.display = 'block';
        } else {
            proofreadButton.style.display = 'none';
            refineButton.style.display = 'none';
            expandButton.style.display = 'none';
            humanizeButton.style.display = 'none';
            generateButton.style.display = 'none';
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
            
            // Store additional info for form elements
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
                selectionInfo = {
                    element: activeElement,
                    selectionStart: activeElement.selectionStart,
                    selectionEnd: activeElement.selectionEnd
                };
            } else {
                selectionInfo = null;
            }
            
            if (!buttonContainer) createButtonContainer();
            positionButtons(selection);
        } else {
            hideButtons();
            selectedText = '';
            selectionRange = null;
            selectionInfo = null;
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
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                closeModal();
                showToast('Extension communication error', 'error');
                return;
            }
            
            if (response && response.success && response.result) {
                // Show explanation in modal with markdown parsing
                createModal('Explanation', response.result, 'info');
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to generate explanation';
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    // Proofread text function
    function handleProofread() {
        if (!selectedText || !isEditableField) return;

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
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                closeModal();
                showToast('Extension communication error', 'error');
                return;
            }
            
            if (response && response.success && response.result) {
                // Preserve selection data for the modal actions
                const preservedSelectionData = {
                    selectedText: selectedText,
                    selectionRange: selectionRange,
                    selectionInfo: selectionInfo
                };
                // Show proofread text in modal with action buttons
                createModal('Proofread Text', response.result, 'editable', preservedSelectionData);
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to proofread text';
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    // Refine text function
    function handleRefine() {
        if (!selectedText || !isEditableField) return;
        
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
    
    // Expand text function
    function handleExpand() {
        if (!selectedText || !isEditableField) return;
        
        // Check AI configuration first
        checkAIConfig((isConfigured, error) => {
            if (!isConfigured) {
                showToast(error, 'error');
                return;
            }
            
            // Show loading modal
            createModal('Expanding Text', 'Adding more detail and context...', 'loading');
            hideButtons();
            
            sendExpandRequest();
        });
    }
    
    // Humanize text function
    function handleHumanize() {
        if (!selectedText || !isEditableField) return;
        
        // Check AI configuration first
        checkAIConfig((isConfigured, error) => {
            if (!isConfigured) {
                showToast(error, 'error');
                return;
            }
            
            // Show loading modal
            createModal('Humanizing Text', 'Making text more natural and conversational...', 'loading');
            hideButtons();
            
            sendHumanizeRequest();
        });
    }
    
    // Generate text function (open-ended)
    function handleGenerate() {
        if (!selectedText || !isEditableField) return;
        
        // Check AI configuration first
        checkAIConfig((isConfigured, error) => {
            if (!isConfigured) {
                showToast(error, 'error');
                return;
            }
            
            // Show loading modal
            createModal('Generating Content', 'Using selected text as a prompt...', 'loading');
            hideButtons();
            
            sendGenerateRequest();
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
                // Preserve selection data for the modal actions
                const preservedSelectionData = {
                    selectedText: selectedText,
                    selectionRange: selectionRange,
                    selectionInfo: selectionInfo
                };
                // Show refined text in modal with action buttons
                createModal('Refined Text', response.result, 'editable', preservedSelectionData);
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to refine text';
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    function sendExpandRequest() {
        // Send message to background script for AI processing
        chrome.runtime.sendMessage({
            action: 'expandText',
            text: selectedText
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                closeModal();
                showToast('Extension communication error', 'error');
                return;
            }
            
            if (response && response.success && response.result) {
                // Preserve selection data for the modal actions
                const preservedSelectionData = {
                    selectedText: selectedText,
                    selectionRange: selectionRange,
                    selectionInfo: selectionInfo
                };
                // Show expanded text in modal with action buttons
                createModal('Expanded Text', response.result, 'editable', preservedSelectionData);
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to expand text';
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    function sendHumanizeRequest() {
        // Send message to background script for AI processing
        chrome.runtime.sendMessage({
            action: 'humanizeText',
            text: selectedText
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                closeModal();
                showToast('Extension communication error', 'error');
                return;
            }
            
            if (response && response.success && response.result) {
                // Preserve selection data for the modal actions
                const preservedSelectionData = {
                    selectedText: selectedText,
                    selectionRange: selectionRange,
                    selectionInfo: selectionInfo
                };
                // Show humanized text in modal with action buttons
                createModal('Humanized Text', response.result, 'editable', preservedSelectionData);
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to humanize text';
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    function sendGenerateRequest() {
        // Send message to background script for AI processing
        chrome.runtime.sendMessage({
            action: 'generateText',
            text: selectedText
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                closeModal();
                showToast('Extension communication error', 'error');
                return;
            }
            
            if (response && response.success && response.result) {
                // Preserve selection data for the modal actions
                const preservedSelectionData = {
                    selectedText: selectedText,
                    selectionRange: selectionRange,
                    selectionInfo: selectionInfo
                };
                // Show generated text in modal with action buttons
                createModal('Generated Content', response.result, 'editable', preservedSelectionData);
            } else {
                closeModal();
                const errorMsg = response?.error || 'Failed to generate content';
                showToast(errorMsg, 'error');
            }
            window.getSelection().removeAllRanges();
        });
    }
    
    // Replace selected text with new text
    function replaceSelectedText(newText) {
        console.log('replaceSelectedText called with:', { newText, selectedText, selectionRange, selectionInfo });
        if (!selectionRange || !selectedText) {
            console.log('Early return: missing selectionRange or selectedText');
            return;
        }
        
        try {
            const selection = window.getSelection();
            
            // Find the element that contains the selection
            const container = selectionRange.commonAncestorContainer;
            const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
            
            console.log('Selection details:', { container, element, tagName: element.tagName });
            
            // Try to find the correct editable element
            let targetElement = element;
            
            // If we have stored selection info, use that element
            if (selectionInfo && selectionInfo.element) {
                targetElement = selectionInfo.element;
                console.log('Using stored selection element:', targetElement);
            }
            
            // Handle different types of editable elements
            if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
                console.log('Processing textarea/input element');
                // For textarea and input elements - use stored selection info if available
                let startPos, endPos;
                if (selectionInfo && selectionInfo.element === targetElement) {
                    startPos = selectionInfo.selectionStart;
                    endPos = selectionInfo.selectionEnd;
                    console.log('Using stored positions:', { startPos, endPos });
                } else {
                    startPos = targetElement.selectionStart;
                    endPos = targetElement.selectionEnd;
                    console.log('Using current positions:', { startPos, endPos });
                }
                
                const currentValue = targetElement.value;
                console.log('Current value:', currentValue.substring(0, 50) + '...');
                
                // Replace the selected text
                const newValue = currentValue.substring(0, startPos) + newText + currentValue.substring(endPos);
                targetElement.value = newValue;
                
                // Set cursor position after the new text
                targetElement.selectionStart = targetElement.selectionEnd = startPos + newText.length;
                targetElement.focus();
                
                console.log('Text replacement completed for form element');
                
            } else if (element.isContentEditable || element.contentEditable === 'true') {
                // For contentEditable elements
                selection.removeAllRanges();
                selection.addRange(selectionRange);
                
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    
                    // Create a text node or HTML content based on the newText
                    if (newText.includes('\n')) {
                        // Replace newlines with <br> for contentEditable
                        const htmlContent = newText.replace(/\n/g, '<br>');
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = htmlContent;
                        
                        // Insert all child nodes
                        while (tempDiv.firstChild) {
                            range.insertNode(tempDiv.firstChild);
                        }
                    } else {
                        range.insertNode(document.createTextNode(newText));
                    }
                    
                    // Position cursor after inserted text
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } else {
                // Fallback for other elements (read-only)
                showToast('Cannot replace text in this element', 'error');
                return;
            }
            
            console.log('Text replaced successfully');
            
        } catch (error) {
            console.error('Error replacing text:', error);
            showToast('Error replacing text', 'error');
        }
    }
    
    // Append text after selected text
    function appendToSelectedText(newText) {
        console.log('appendToSelectedText called with:', { newText, selectedText, selectionRange, selectionInfo });
        if (!selectionRange || !selectedText) {
            console.log('Early return: missing selectionRange or selectedText');
            return;
        }
        
        try {
            const selection = window.getSelection();
            
            // Find the element that contains the selection
            const container = selectionRange.commonAncestorContainer;
            const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
            
            console.log('Append selection details:', { container, element, tagName: element.tagName });
            
            // Try to find the correct editable element
            let targetElement = element;
            
            // If we have stored selection info, use that element
            if (selectionInfo && selectionInfo.element) {
                targetElement = selectionInfo.element;
                console.log('Using stored selection element for append:', targetElement);
            }
            
            // Handle different types of editable elements
            if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
                console.log('Processing textarea/input element for append');
                // For textarea and input elements - use stored selection info if available
                let startPos, endPos;
                if (selectionInfo && selectionInfo.element === targetElement) {
                    startPos = selectionInfo.selectionStart;
                    endPos = selectionInfo.selectionEnd;
                    console.log('Using stored positions for append:', { startPos, endPos });
                } else {
                    startPos = targetElement.selectionStart;
                    endPos = targetElement.selectionEnd;
                    console.log('Using current positions for append:', { startPos, endPos });
                }
                
                const currentValue = targetElement.value;
                
                // Append after the selected text
                const textToAppend = ' ' + newText;
                const newValue = currentValue.substring(0, endPos) + textToAppend + currentValue.substring(endPos);
                targetElement.value = newValue;
                
                // Set cursor position after the appended text
                targetElement.selectionStart = targetElement.selectionEnd = endPos + textToAppend.length;
                targetElement.focus();
                
                console.log('Text append completed for form element');
                
            } else if (element.isContentEditable || element.contentEditable === 'true') {
                // For contentEditable elements
                selection.removeAllRanges();
                selection.addRange(selectionRange);
                
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.collapse(false); // Move to end of selection
                    
                    // Create text to append (with a space prefix)
                    const textToAppend = ' ' + newText;
                    
                    // Handle newlines in the appended text
                    if (textToAppend.includes('\n')) {
                        // Replace newlines with <br> for contentEditable
                        const htmlContent = textToAppend.replace(/\n/g, '<br>');
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = htmlContent;
                        
                        // Insert all child nodes
                        while (tempDiv.firstChild) {
                            range.insertNode(tempDiv.firstChild);
                        }
                    } else {
                        range.insertNode(document.createTextNode(textToAppend));
                    }
                    
                    // Position cursor after inserted text
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } else {
                // Fallback for other elements (read-only)
                showToast('Cannot append text to this element', 'error');
                return;
            }
            
            console.log('Text appended successfully');
            
        } catch (error) {
            console.error('Error appending text:', error);
            showToast('Error appending text', 'error');
        }
    }
    
    // Simple markdown parser for better readability
    function parseMarkdown(text) {
        return text
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bold text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            // Italic text
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Lists
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
            // Wrap lists
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraphs
            .replace(/^(?!<[hul])/gm, '<p>')
            .replace(/$/gm, '</p>')
            // Clean up extra tags
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<[hul])/g, '$1')
            .replace(/(<\/[hul][^>]*>)<\/p>/g, '$1');
    }
    
    // Copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    }
    
    // Open sidepanel with context
    function openSidepanelWithContext(explanationContent, originalText) {
        console.log('Requesting sidepanel to open with context...');
        
        // Send message to background script to open sidepanel
        chrome.runtime.sendMessage({
            action: 'openSidepanel',
            context: explanationContent,
            originalText: originalText
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to open sidepanel:', chrome.runtime.lastError);
                showToast('Failed to open sidepanel: ' + chrome.runtime.lastError.message, 'error');
            } else if (response && response.success) {
                console.log('Sidepanel request successful');
                showToast('Chat interface opened!');
            } else {
                console.error('Sidepanel request failed:', response);
                showToast('Failed to open chat interface', 'error');
            }
        });
    }
    
    // Create and show modal
    function createModal(title, content, type = 'info', preservedSelection = null) {
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
            
            // Parse markdown for explanation content
            if (type === 'info' && title === 'Explanation') {
                contentDiv.innerHTML = parseMarkdown(content);
            } else {
                contentDiv.textContent = content;
            }
            
            body.appendChild(contentDiv);
            
            if (type === 'editable') {
                const actions = document.createElement('div');
                actions.className = 'notevault-modal-actions';
                
                const replaceBtn = document.createElement('button');
                replaceBtn.className = 'notevault-modal-btn notevault-btn-primary';
                replaceBtn.textContent = 'Replace';
                replaceBtn.addEventListener('click', () => {
                    // Restore selection data if preserved
                    if (preservedSelection) {
                        selectedText = preservedSelection.selectedText;
                        selectionRange = preservedSelection.selectionRange;
                        selectionInfo = preservedSelection.selectionInfo;
                        console.log('Restored selection data for replace:', preservedSelection);
                    }
                    replaceSelectedText(content);
                    closeModal();
                    showToast('Text replaced!');
                });
                
                const appendBtn = document.createElement('button');
                appendBtn.className = 'notevault-modal-btn notevault-btn-secondary';
                appendBtn.textContent = 'Append';
                appendBtn.addEventListener('click', () => {
                    // Restore selection data if preserved
                    if (preservedSelection) {
                        selectedText = preservedSelection.selectedText;
                        selectionRange = preservedSelection.selectionRange;
                        selectionInfo = preservedSelection.selectionInfo;
                        console.log('Restored selection data for append:', preservedSelection);
                    }
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
                
                // Add "Continue in Sidepanel" button for explanations
                if (title === 'Explanation') {
                    const sidepanelBtn = document.createElement('button');
                    sidepanelBtn.className = 'notevault-modal-btn notevault-btn-primary';
                    sidepanelBtn.innerHTML = '<i class="fas fa-comments"></i> Continue in Sidepanel';
                    sidepanelBtn.style.marginRight = '8px';
                    sidepanelBtn.addEventListener('click', () => {
                        openSidepanelWithContext(content, selectedText);
                        closeModal();
                    });
                    actions.appendChild(sidepanelBtn);
                }
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'notevault-modal-btn notevault-btn-secondary';
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