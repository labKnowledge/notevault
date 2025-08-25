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

    chrome.contextMenus.create({
        id: 'explainPage',
        title: 'Explain this page',
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
    } else if (info.menuItemId === 'explainPage') {
        explainPageContent(tab);
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
    } else if (request.action === 'openSidepanel') {
        openSidepanelWithContext(request.context, request.originalText);
        sendResponse({ success: true });
        return true;
    } else if (request.action === 'aiQuery') {
        handleAIQuery(request.messages, request.temperature, request.maxTokens, sendResponse);
        return true; // Keep message channel open
    } else if (request.action === 'chatWithCurrentPage') {
        chatWithCurrentPage(request.tabId, sendResponse);
        return true;
    }
});

// Global AI agent variable for service worker context
let aiAgent = null;


// Simple markdown parser for better readability
function parseMarkdown(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    let result = text;
    
    // Process code blocks first (before other formatting)
    result = result.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Process headers (including ####, #####, ######)
    result = result.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    result = result.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    result = result.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    result = result.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    result = result.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    result = result.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Process divider lines
    result = result.replace(/^---$/gm, '<hr>');
    result = result.replace(/^\*\*\*$/gm, '<hr>');
    result = result.replace(/^___$/gm, '<hr>');
    
    // Process tables
    result = result.replace(/(\|.*\|.*\n\|[\s\-:|]+\|\n(\|.*\|\n?)*)/g, function(match) {
        const lines = match.trim().split('\n');
        if (lines.length < 3) return match; // Need header, separator, and at least one data row
        
        const headerRow = lines[0];
        const separatorRow = lines[1];
        const dataRows = lines.slice(2);
        
        // Parse header
        const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell);
        
        // Parse data rows
        const tableRows = dataRows.map(row => {
            const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
            return cells.map(cell => `<td>${cell}</td>`).join('');
        });
        
        const headerCells = headers.map(header => `<th>${header}</th>`).join('');
        const tableBody = tableRows.map(row => `<tr>${row}</tr>`).join('');
        
        return `<table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
            <thead>
                <tr>${headerCells}</tr>
            </thead>
            <tbody>
                ${tableBody}
            </tbody>
        </table>`;
    });
    
    // Process lists - handle unordered lists
    result = result.replace(/^(\*|-)\s+(.*$)/gm, '<li>$2</li>');
    
    // Process ordered lists
    result = result.replace(/^\d+\.\s+(.*$)/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in ul/ol tags
    result = result.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/gs, function(match) {
        // Check if it's an ordered list (contains numbers)
        const isOrdered = /\d+\.\s+/.test(match);
        const tag = isOrdered ? 'ol' : 'ul';
        return `<${tag}>${match}</${tag}>`;
    });
    
    // Process inline formatting (after headers and lists)
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
    result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
    result = result.replace(/_(.*?)_/g, '<em>$1</em>');
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle line breaks and paragraphs
    // Split by double line breaks to separate paragraphs
    const paragraphs = result.split(/\n\s*\n/);
    
    result = paragraphs.map(paragraph => {
        paragraph = paragraph.trim();
        if (!paragraph) return '';
        
        // If paragraph already contains HTML tags, don't wrap it
        if (/<[^>]+>/.test(paragraph)) {
            return paragraph;
        }
        
        // Replace single line breaks with <br> tags
        paragraph = paragraph.replace(/\n/g, '<br>');
        
        // Wrap in paragraph tags
        return `<p>${paragraph}</p>`;
    }).join('');
    
    // Clean up any empty paragraphs
    result = result.replace(/<p><\/p>/g, '');
    
    return result;
}

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

// Explain page content using AI
async function explainPageText(pageText, title, url) {
    const messages = [
        {
            role: "system",
            content: "You are an intelligent content analyzer and summarizer. Analyze the provided webpage content and create a comprehensive explanation and summary. Focus on:\n1. Main topics and key points\n2. Important information and insights\n3. Context and significance\n4. Summary of key takeaways\n5. Any actionable items or conclusions\n\nMake your explanation clear, well-structured, and valuable for someone who wants to understand the essence of this page quickly."
        },
        {
            role: "user",
            content: `Please analyze and explain this webpage content:\n\nPage URL: ${url}\n\n${pageText}\n\nProvide a comprehensive explanation and summary covering the main points, insights, and key takeaways from this page.`
        }
    ];
    
    return await aiAgent.makeAPICall(messages, 0.7, 2000);
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

// Explain page content using AI
function explainPageContent(tab) {
    // First inject the loading UI
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: showPageExplanationLoading
    });


    const parseMarkdown = (text) => {
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        let result = text;
        
        // Process code blocks first (before other formatting)
        result = result.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Process headers (including ####, #####, ######)
        result = result.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
        result = result.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
        result = result.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
        result = result.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        result = result.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        result = result.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Process divider lines
        result = result.replace(/^---$/gm, '<hr>');
        result = result.replace(/^\*\*\*$/gm, '<hr>');
        result = result.replace(/^___$/gm, '<hr>');
        
        // Process tables
        result = result.replace(/(\|.*\|.*\n\|[\s\-:|]+\|\n(\|.*\|\n?)*)/g, function(match) {
            const lines = match.trim().split('\n');
            if (lines.length < 3) return match; // Need header, separator, and at least one data row
            
            const headerRow = lines[0];
            const separatorRow = lines[1];
            const dataRows = lines.slice(2);
            
            // Parse header
            const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell);
            
            // Parse data rows
            const tableRows = dataRows.map(row => {
                const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
                return cells.map(cell => `<td>${cell}</td>`).join('');
            });
            
            const headerCells = headers.map(header => `<th>${header}</th>`).join('');
            const tableBody = tableRows.map(row => `<tr>${row}</tr>`).join('');
            
            return `<table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
                <thead>
                    <tr>${headerCells}</tr>
                </thead>
                <tbody>
                    ${tableBody}
                </tbody>
            </table>`;
        });
        
        // Process lists - handle unordered lists
        result = result.replace(/^(\*|-)\s+(.*$)/gm, '<li>$2</li>');
        
        // Process ordered lists
        result = result.replace(/^\d+\.\s+(.*$)/gm, '<li>$1</li>');
        
        // Wrap consecutive list items in ul/ol tags
        result = result.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/gs, function(match) {
            // Check if it's an ordered list (contains numbers)
            const isOrdered = /\d+\.\s+/.test(match);
            const tag = isOrdered ? 'ol' : 'ul';
            return `<${tag}>${match}</${tag}>`;
        });
        
        // Process inline formatting (after headers and lists)
        result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
        result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
        result = result.replace(/_(.*?)_/g, '<em>$1</em>');
        result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Handle line breaks and paragraphs
        // Split by double line breaks to separate paragraphs
        const paragraphs = result.split(/\n\s*\n/);
        
        result = paragraphs.map(paragraph => {
            paragraph = paragraph.trim();
            if (!paragraph) return '';
            
            // If paragraph already contains HTML tags, don't wrap it
            if (/<[^>]+>/.test(paragraph)) {
                return paragraph;
            }
            
            // Replace single line breaks with <br> tags
            paragraph = paragraph.replace(/\n/g, '<br>');
            
            // Wrap in paragraph tags
            return `<p>${paragraph}</p>`;
        }).join('');
        
        // Clean up any empty paragraphs
        result = result.replace(/<p><\/p>/g, '');
        
        return result;
    };

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractCleanPageContent
    }, async (results) => {
        if (results && results[0] && results[0].result) {
            const content = results[0].result;
            const pageText = `Title: ${content.title}\n\nContent: ${content.content}`;
            
            try {
                // Initialize AI if not already done
                if (!aiAgent) {
                    await initializeAI();
                }
                
                if (!aiAgent || !aiAgent.isAvailable()) {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: showPageExplanationError,
                        args: ['AI service not configured. Please set up your API key in extension settings.']
                    });
                    return;
                }
                
                // Explain the page content
                const explanation = await explainPageText(pageText, content.title, tab.url);
                
                // Show the explanation to the user
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: showPageExplanationResult,
                    args: [parseMarkdown(explanation), content.title, tab.url]
                });
                
                // Save the explanation as a note
                const newNote = {
                    id: generateId(),
                    title: `Page Explanation: ${content.title}`,
                    content: `${parseMarkdown(explanation)}\n\n---\nOriginal Page: ${tab.url}\nExplained: ${new Date().toLocaleString()}`,
                    tags: ['page-explanation', 'ai-generated'],
                    notebookId: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                saveNote(newNote, (response) => {
                    // Note saved silently in background
                });
                
            } catch (error) {
                console.error('Error explaining page:', error);
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: showPageExplanationError,
                    args: ['Failed to explain page content. Please try again.']
                });
            }
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

// Show loading UI for page explanation
function showPageExplanationLoading() {
    // Remove existing explanation container
    const existingContainer = document.getElementById('notevault-page-explanation');
    if (existingContainer) {
        existingContainer.remove();
    }

    const container = document.createElement('div');
    container.id = 'notevault-page-explanation';
    container.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: white;
            border: 2px solid #007bff;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            max-width: 400px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="
                    width: 20px;
                    height: 20px;
                    border: 2px solid #007bff;
                    border-top: 2px solid transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 10px;
                "></div>
                <h3 style="margin: 0; color: #333; font-size: 16px;">Analyzing Page</h3>
            </div>
            <p style="margin: 0; color: #666; font-size: 14px;">AI is analyzing the page content and generating an explanation...</p>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </div>
    `;
    document.body.appendChild(container);
}

// Show page explanation result
function showPageExplanationResult(explanation, title, url) {
    const existingContainer = document.getElementById('notevault-page-explanation');
    if (existingContainer) {
        existingContainer.remove();
    }

    // Function to open sidepanel with page context
    window.openPageSidepanel = function(explanationText, pageTitle, pageUrl) {
        chrome.runtime.sendMessage({
            action: 'openSidepanel',
            context: explanationText,
            originalText: pageTitle + ' - ' + pageUrl
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to open sidepanel:', chrome.runtime.lastError);
            } else {
                // Close the explanation modal
                const modal = document.getElementById('notevault-page-explanation');
                if (modal) modal.remove();
            }
        });
    };

    const container = document.createElement('div');
    container.id = 'notevault-page-explanation';
    container.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: white;
            border: 2px solid #28a745;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            max-width: 500px;
            max-height: 70vh;
            overflow-y: auto;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #333; font-size: 18px; display: flex; align-items: center;">
                    <span style="color: #28a745; margin-right: 8px;">✓</span>
                    Page Explanation
                </h3>
                <button onclick="this.closest('#notevault-page-explanation').remove()" style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #999;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">&times;</button>
            </div>
            
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0 0 5px 0; color: #555; font-size: 14px; font-weight: 600;">${title}</h4>
                <a href="${url}" target="_blank" style="color: #007bff; text-decoration: none; font-size: 12px; word-break: break-all;">${url}</a>
            </div>
            
            <div style="color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${explanation}</div>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; display: flex; gap: 10px; justify-content: center;">
                <button onclick="openPageSidepanel('${explanation.replace(/'/g, "\\'")}', '${title.replace(/'/g, "\\'")}', '${url}')" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                "><i class="fas fa-comments"></i> Continue in Sidepanel</button>
                <button onclick="this.closest('#notevault-page-explanation').remove()" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
}

// Show page explanation error
function showPageExplanationError(errorMessage) {
    const existingContainer = document.getElementById('notevault-page-explanation');
    if (existingContainer) {
        existingContainer.remove();
    }

    const container = document.createElement('div');
    container.id = 'notevault-page-explanation';
    container.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: white;
            border: 2px solid #dc3545;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            max-width: 400px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #dc3545; font-size: 16px; display: flex; align-items: center;">
                    <span style="margin-right: 8px;">⚠️</span>
                    Error
                </h3>
                <button onclick="this.closest('#notevault-page-explanation').remove()" style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #999;
                    padding: 0;
                ">&times;</button>
            </div>
            <p style="margin: 0; color: #666; font-size: 14px;">${errorMessage}</p>
            <div style="margin-top: 15px; text-align: center;">
                <button onclick="this.closest('#notevault-page-explanation').remove()" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(container);
}

// Sidepanel Functions - Simplified and Robust
async function openSidepanelWithContext(context, originalText) {
    try {
        console.log('🚀 Opening chat interface with context...');
        
        // Store context for the chat interface
        await chrome.storage.local.set({
            sidepanel_pending_context: {
                context: context,
                originalText: originalText,
                timestamp: Date.now()
            }
        });
        
        console.log('✅ Context stored');
        
        // Method 1: Try Chrome's native sidepanel (Chrome 114+)
        if (chrome.sidePanel && chrome.sidePanel.open) {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.windowId) {
                    await chrome.sidePanel.open({ windowId: tab.windowId });
                    console.log('✅ Sidepanel opened successfully');
                    return;
                }
            } catch (sidepanelError) {
                console.warn('⚠️ Sidepanel failed:', sidepanelError.message);
            }
        } else {
            console.warn('⚠️ Sidepanel API not available');
        }
        
        // Method 2: Fallback to popup window
        console.log('📱 Opening as popup window instead...');
        
        // Get current window to position popup relative to it
        const currentWindow = await chrome.windows.getCurrent();
        const popup = await chrome.windows.create({
            url: chrome.runtime.getURL('sidepanel.html'),
            type: 'popup',
            width: 420,
            height: 650,
            focused: true,
            left: (currentWindow.left || 0) + (currentWindow.width || 1200) - 450,
            top: (currentWindow.top || 0) + 50
        });
        
        console.log('✅ Chat opened as popup window:', popup.id);
        
    } catch (error) {
        console.error('❌ Failed to open chat interface:', error);
        throw error;
    }
}

// Handle AI queries from sidepanel
async function handleAIQuery(messages, temperature = 0.7, maxTokens = 1000, sendResponse) {
    try {
        // Initialize AI if not already done
        if (!aiAgent) {
            await initializeAI();
        }
        
        if (!aiAgent || !aiAgent.isAvailable()) {
            sendResponse({ success: false, error: 'AI service not configured' });
            return;
        }
        
        const result = await aiAgent.makeAPICall(messages, temperature, maxTokens);
        sendResponse({ success: true, result: result });
        
    } catch (error) {
        console.error('AI query failed:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Chat with current page function
async function chatWithCurrentPage(tabId, sendResponse) {
    try {
        console.log('Starting chat with current page:', tabId);
        
        // Extract page content first
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: extractCleanPageContent
        }, async (results) => {
            if (results && results[0] && results[0].result) {
                const content = results[0].result;
                const pageContext = `Page Title: ${content.title}\n\nPage Content: ${content.content.substring(0, 2000)}${content.content.length > 2000 ? '...' : ''}`;
                
                // Open sidepanel with page context
                try {
                    await openSidepanelWithContext(
                        `I'm ready to discuss this page: "${content.title}". Feel free to ask questions about the content, request summaries, explanations, or have a general conversation about the topics covered.`,
                        pageContext
                    );
                    sendResponse({ success: true });
                } catch (error) {
                    console.error('Failed to open sidepanel:', error);
                    sendResponse({ success: false, error: 'Failed to open chat' });
                }
            } else {
                sendResponse({ success: false, error: 'Could not extract page content' });
            }
        });
        
    } catch (error) {
        console.error('Error in chatWithCurrentPage:', error);
        sendResponse({ success: false, error: error.message });
    }
}


    