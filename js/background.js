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
    console.log('Background received message:', request.action, request.text?.substring(0, 50));
    
    if (request.action === 'saveNote') {
        saveNote(request.note, sendResponse);
        return true; // Keep message channel open for async response
    } else if (request.action === 'extractPageContent') {
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'explainText') {
        handleAIAction('explain', request.text, sendResponse);
        return true;
    } else if (request.action === 'proofreadText') {
        handleAIAction('proofread', request.text, sendResponse);
        return true;
    } else if (request.action === 'refineText') {
        handleAIAction('refine', request.text, sendResponse);
        return true;
    } else if (request.action === 'expandText') {
        handleAIAction('expand', request.text, sendResponse);
        return true;
    } else if (request.action === 'humanizeText') {
        handleAIAction('humanize', request.text, sendResponse);
        return true;
    } else if (request.action === 'generateText') {
        handleAIAction('generate', request.text, sendResponse);
        return true;
    }
});

// Global AI agent variable for service worker context
let aiAgent = null;

// Handle AI actions (explain, proofread, refine)
async function handleAIAction(action, text, callback) {
    console.log(`AI Action requested: ${action} for text: "${text.substring(0, 50)}..."`);
    
    try {
        // Initialize AI if not already done
        if (!aiAgent) {
            console.log('Initializing AI agent...');
            await initializeAI();
        }
        
        if (!aiAgent) {
            console.error('AI agent failed to initialize');
            callback({ success: false, error: 'AI agent failed to initialize' });
            return;
        }
        
        if (!aiAgent.isAvailable()) {
            console.error('AI agent not available - missing configuration');
            callback({ success: false, error: 'AI service not available. Please configure your API settings in the extension options.' });
            return;
        }
        
        console.log('AI agent is available, proceeding with action:', action);
        let result = '';
        
        switch (action) {
            case 'explain':
                result = await explainText(text);
                console.log('Explain result:', result.substring(0, 100) + '...');
                callback({ success: true, result: result });
                break;
                
            case 'proofread':
                result = await proofreadText(text);
                console.log('Proofread result:', result.substring(0, 100) + '...');
                callback({ success: true, result: result });
                break;
                
            case 'refine':
                result = await refineText(text);
                console.log('Refine result:', result.substring(0, 100) + '...');
                callback({ success: true, result: result });
                break;
                
            case 'expand':
                result = await expandText(text);
                console.log('Expand result:', result.substring(0, 100) + '...');
                callback({ success: true, result: result });
                break;
                
            case 'humanize':
                result = await humanizeText(text);
                console.log('Humanize result:', result.substring(0, 100) + '...');
                callback({ success: true, result: result });
                break;
                
            case 'generate':
                result = await generateText(text);
                console.log('Generate result:', result.substring(0, 100) + '...');
                callback({ success: true, result: result });
                break;
                
            default:
                console.error('Unknown AI action:', action);
                callback({ success: false, error: 'Unknown action' });
        }
    } catch (error) {
        console.error('AI Action failed:', error);
        callback({ success: false, error: error.message });
    }
}

// Initialize AI agent
async function initializeAI() {
    try {
        console.log('Loading AI config from storage...');
        // Load AI config from storage (compatible with main app config)
        const stored = await chrome.storage.local.get(['ai_config']);
        const config = stored.ai_config || {
            apiKey: '',
            baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
            model: 'qwen-plus'
        };
        
        console.log('AI config loaded:', { 
            hasApiKey: !!config.apiKey, 
            baseUrl: config.baseUrl, 
            model: config.model 
        });
        
        // Create AI agent using the stored configuration (service worker compatible)
        aiAgent = {
            config: config,
            isAvailable() {
                const available = this.config.apiKey && this.config.baseUrl && this.config.model;
                console.log('AI availability check:', available);
                return available;
            },
            async makeAPICall(messages, temperature = 0.7, maxTokens = 1000) {
                if (!this.isAvailable()) {
                    throw new Error('AI Agent not configured. Please set your API key in the extension options.');
                }
                
                const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: this.config.model,
                        messages: messages,
                        temperature: temperature,
                        max_tokens: maxTokens,
                        stream: false
                    })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API call failed: ${response.status} - ${errorText}`);
                }
                
                const data = await response.json();
                
                if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                    throw new Error('Invalid API response structure');
                }
                
                return data.choices[0].message.content;
            }
        };
    } catch (error) {
        console.error('Failed to initialize AI:', error);
        throw error;
    }
}

// Explain text using AI
async function explainText(text) {
    const messages = [
        {
            role: "system",
            content: "You are a helpful assistant that explains text clearly and comprehensively. Provide detailed explanations that help users understand the content, context, key concepts, and implications."
        },
        {
            role: "user",
            content: `Please explain this text in detail:\n\n"${text}"\n\nProvide a clear explanation covering:\n1. Main concepts and ideas\n2. Context and background\n3. Key points and takeaways\n4. Any implications or significance`
        }
    ];
    
    return await aiAgent.makeAPICall(messages, 0.7, 1500);
}

// Proofread text using AI
async function proofreadText(text) {
    const messages = [
        {
            role: "system",
            content: "You are a professional proofreader and editor. Fix grammar, spelling, punctuation, and improve clarity while maintaining the original meaning and tone. Return only the corrected text without explanations."
        },
        {
            role: "user",
            content: `Please proofread and correct this text:\n\n"${text}"`
        }
    ];
    
    return await aiAgent.makeAPICall(messages, 0.3, 1000);
}

// Refine text using AI
async function refineText(text) {
    const messages = [
        {
            role: "system",
            content: "You are a professional writer and editor. Enhance the given text by improving clarity, flow, word choice, and overall quality while preserving the original meaning and intent. Make it more polished and professional. Return only the refined text without explanations."
        },
        {
            role: "user",
            content: `Please refine and enhance this text:\n\n"${text}"`
        }
    ];
    
    return await aiAgent.makeAPICall(messages, 0.7, 1000);
}

// Expand text using AI
async function expandText(text) {
    const messages = [
        {
            role: "system",
            content: "You are a skilled content writer. Expand the given text by adding more detail, context, examples, and supporting information while maintaining the original tone and style. Make it more comprehensive and informative. Return only the expanded text without explanations."
        },
        {
            role: "user",
            content: `Please expand this text with more detail and context:\n\n"${text}"`
        }
    ];
    
    return await aiAgent.makeAPICall(messages, 0.7, 1500);
}

// Humanize text using AI
async function humanizeText(text) {
    const messages = [
        {
            role: "system",
            content: "You are a conversational writing expert. Transform the given text to make it more natural, conversational, and human-like while maintaining its core message. Use a friendly tone, varied sentence structure, and natural language patterns. Return only the humanized text without explanations."
        },
        {
            role: "user",
            content: `Please make this text more natural and conversational:\n\n"${text}"`
        }
    ];
    
    return await aiAgent.makeAPICall(messages, 0.8, 1000);
}

// Generate text using AI (open-ended based on input as prompt)
async function generateText(text) {
    const messages = [
        {
            role: "system",
            content: "You are a creative and helpful AI assistant. Use the provided text as a prompt or instruction to generate relevant, useful, and well-structured content. Interpret the user's intent and create appropriate content based on what they've provided. Be creative but maintain quality and relevance."
        },
        {
            role: "user",
            content: text
        }
    ];
    
    return await aiAgent.makeAPICall(messages, 0.8, 1500);
}


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