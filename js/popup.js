document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const openFullAppBtn = document.getElementById('open-full-app');
    const newNoteBtn = document.getElementById('new-note');
    const chatWithPageBtn = document.getElementById('chat-with-page');
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

    // Chat with current page
    chatWithPageBtn.addEventListener('click', async function() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showToast('No active tab found', 'error');
                return;
            }
            
            // Send message to background to open sidepanel with page context
            chrome.runtime.sendMessage({
                action: 'chatWithCurrentPage',
                tabId: tab.id
            }, (response) => {
                if (response && response.success) {
                    const message = response.hasExistingChat 
                        ? 'Reopening existing chat...' 
                        : 'Starting new chat...';
                    showToast(message, 'success');
                    window.close();
                } else {
                    showToast('Failed to open chat', 'error');
                }
            });
        } catch (error) {
            console.error('Error opening chat:', error);
            showToast('Error opening chat', 'error');
        }
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

    // Settings modal elements
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    const testApiBtn = document.getElementById('test-api');
    const apiKeyInput = document.getElementById('api-key-input');
    const modelSelect = document.getElementById('model-select');
    const aiStatusText = document.getElementById('ai-status-text');

    // Settings button - open modal
    settingsBtn.addEventListener('click', function() {
        loadSettings();
        settingsModal.style.display = 'block';
    });

    // Close settings modal
    closeSettingsBtn.addEventListener('click', function() {
        settingsModal.style.display = 'none';
    });

    // Close modal when clicking outside
    settingsModal.addEventListener('click', function(e) {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Load current settings
    async function loadSettings() {
        try {
            const stored = await chrome.storage.local.get(['ai_config']);
            const config = stored.ai_config || {
                apiKey: '',
                baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
                model: 'qwen-plus'
            };
            
            apiKeyInput.value = config.apiKey || '';
            modelSelect.value = config.model || 'qwen-plus';
            
            const isConfigured = config.apiKey && config.baseUrl && config.model;
            aiStatusText.textContent = isConfigured ? 
                `AI Status: Connected (${config.model})` : 
                'AI Status: Not configured';
        } catch (error) {
            console.error('Error loading settings:', error);
            aiStatusText.textContent = 'AI Status: Error loading config';
        }
    }

    // Save settings
    saveSettingsBtn.addEventListener('click', async function() {
        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;
        
        if (!apiKey) {
            alert('Please enter an API key');
            return;
        }
        
        try {
            const config = {
                apiKey: apiKey,
                baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
                model: model
            };
            
            await chrome.storage.local.set({ ai_config: config });
            
            const isConfigured = config.apiKey && config.baseUrl && config.model;
            aiStatusText.textContent = isConfigured ? 
                `AI Status: Connected (${config.model})` : 
                'AI Status: Configuration error';
            
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings: ' + error.message);
        }
    });

    // Test API connection
    testApiBtn.addEventListener('click', async function() {
        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;
        
        if (!apiKey) {
            alert('Please enter an API key first');
            return;
        }
        
        testApiBtn.disabled = true;
        testApiBtn.textContent = 'Testing...';
        
        try {
            // Simple test request to verify API key works
            const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                })
            });
            
            if (response.ok || response.status === 429) { // 429 = rate limit, but API key is valid
                alert('API connection test successful!');
                aiStatusText.textContent = `AI Status: Connected (${model})`;
            } else {
                alert('API connection test failed. Please check your API key.');
                aiStatusText.textContent = 'AI Status: Connection failed';
            }
        } catch (error) {
            alert('API connection test failed: ' + error.message);
            aiStatusText.textContent = 'AI Status: Connection failed';
        } finally {
            testApiBtn.disabled = false;
            testApiBtn.textContent = 'Test Connection';
        }
    });

    // Simple toast notification
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            max-width: 200px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 2000);
    }

    // Load notes when popup opens
    loadNotes();
});