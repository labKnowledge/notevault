// This background script handles extension events

chrome.runtime.onInstalled.addListener(function() {
    // Create context menu
    chrome.contextMenus.create({
        id: 'saveSelectedText',
        title: 'Save selected text as note',
        contexts: ['selection']
    });

    chrome.contextMenus.create({
        id: 'savePageAsNote',
        title: 'Save page as note',
        contexts: ['page']
    });
    // Initialize storage with default data if needed
    chrome.storage.local.get(['notevault-notes', 'notevault-notebooks', 'notevault-tags'], function(result) {
        if (!result['notevault-notes']) {
            chrome.storage.local.set({ 'notevault-notes': [] });
        }
        
        if (!result['notevault-notebooks']) {
            const defaultNotebooks = [
                {
                    id: 'default-personal',
                    name: 'Personal',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'default-work',
                    name: 'Work',
                    createdAt: new Date().toISOString()
                }
            ];
            chrome.storage.local.set({ 'notevault-notebooks': defaultNotebooks });
        }
        
        if (!result['notevault-tags']) {
            const defaultTags = [
                {
                    id: 'default-important',
                    name: 'Important',
                    color: '#f44336'
                },
                {
                    id: 'default-ideas',
                    name: 'Ideas',
                    color: '#2196f3'
                },
                {
                    id: 'default-todo',
                    name: 'To-Do',
                    color: '#4caf50'
                }
            ];
            chrome.storage.local.set({ 'notevault-tags': defaultTags });
        }
    });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(function(command) {
    if (command === 'open-notevault') {
        chrome.tabs.create({ url: chrome.runtime.getURL('notevault.html') });
    }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === 'saveSelectedText' && info.selectionText) {
        saveSelectedTextAsNote(info.selectionText, tab);
    } else if (info.menuItemId === 'savePageAsNote') {
        savePageAsNote(tab);
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'saveNote') {
        saveNote(request.note, sendResponse);
        return true; // Keep message channel open for async response
    } else if (request.action === 'extractPageContent') {
        sendResponse({ success: true });
        return true;
    }
});

// Save selected text as note
function saveSelectedTextAsNote(selectedText, tab) {
    const newNote = {
        id: generateId(),
        title: `Note from ${tab.title}`,
        content: `${selectedText}\n\n---\nSource: ${tab.url}`,
        tags: [],
        notebookId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    saveNote(newNote, (response) => {
        if (response.success) {
            // Show notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'NoteVault',
                message: 'Note saved successfully!'
            });
        }
    });
}

// Save page content as note
function savePageAsNote(tab) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractCleanPageContent
    }, (results) => {
        if (results && results[0] && results[0].result) {
            const content = results[0].result;
            const newNote = {
                id: generateId(),
                title: content.title || tab.title,
                content: `${content.content}\n\n---\nSource: ${tab.url}\nSaved: ${new Date().toLocaleString()}`,
                tags: ['webpage'],
                notebookId: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            saveNote(newNote, (response) => {
                if (response.success) {
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: 'NoteVault',
                        message: 'Page saved successfully!'
                    });
                }
            });
        }
    });
}

// Generate unique ID (same as main app)
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Save note to chrome.storage.local (same as main app)
function saveNote(note, callback) {
    chrome.storage.local.get(['notevault-notes'], function(result) {
        const notes = result['notevault-notes'] || [];
        notes.unshift(note);
        
        chrome.storage.local.set({ 'notevault-notes': notes }, function() {
            if (chrome.runtime.lastError) {
                callback({ success: false, error: chrome.runtime.lastError });
            } else {
                callback({ success: true, noteId: note.id });
            }
        });
    });
}

// Function to extract clean page content (injected into the page)
function extractCleanPageContent() {
    // Remove unwanted elements
    const unwantedSelectors = [
        'header', 'nav', 'footer', 'aside', '.sidebar', '#sidebar',
        '.advertisement', '.ads', '.ad', '[class*="ad-"]', '[id*="ad-"]',
        '.social-share', '.social-media', '.comments', '.comment',
        '.popup', '.modal', '.overlay', '.banner', '.cookie',
        'script', 'style', 'iframe[src*="ads"]', '[class*="popup"]',
        '.header', '.footer', '.nav', '.navigation', '.menu',
        '[role="banner"]', '[role="navigation"]', '[role="complementary"]',
        '.promo', '.promotion', '.newsletter', '.subscription'
    ];
    
    // Clone the document to avoid modifying the original
    const clone = document.cloneNode(true);
    
    // Remove unwanted elements from clone
    unwantedSelectors.forEach(selector => {
        const elements = clone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
    });
    
    // Try to find the main content area
    let mainContent = null;
    const contentSelectors = [
        'main', '[role="main"]', '.main-content', '.content', '.post-content',
        '.article-content', '.entry-content', 'article', '.article-body',
        '.post-body', '.story-body', '.text-content', '#content'
    ];
    
    for (const selector of contentSelectors) {
        const element = clone.querySelector(selector);
        if (element && element.textContent.trim().length > 200) {
            mainContent = element;
            break;
        }
    }
    
    // If no main content found, use body but clean it more aggressively
    if (!mainContent) {
        mainContent = clone.querySelector('body');
        if (mainContent) {
            // Remove more unwanted elements for body content
            const moreUnwanted = [
                '.widget', '.widgets', '.related', '.recommendations',
                '.trending', '.popular', '.most-read', '.tags',
                '.categories', '.meta', '.author', '.date'
            ];
            moreUnwanted.forEach(selector => {
                const elements = mainContent.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
        }
    }
    
    if (!mainContent) {
        return {
            title: document.title,
            content: 'Could not extract clean content from this page.'
        };
    }
    
    // Clean up the content text
    let cleanText = mainContent.textContent || mainContent.innerText || '';
    
    // Remove extra whitespace and normalize
    cleanText = cleanText
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n\n')  // Clean up line breaks
        .trim();
    
    // Get page title
    const title = document.title || 'Untitled Page';
    
    return {
        title: title,
        content: cleanText
    };
}