// NoteVault Sidepanel - AI Assistant for Follow-up Conversations
class SidepanelAI {
    constructor() {
        this.conversation = [];
        this.currentContext = null;
        this.isProcessing = false;
        this.aiConfig = null;
        this.currentPageUrl = null;
        this.currentPageTitle = null;
        this.pageChangeCheckInterval = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeAI();
        this.loadConversationHistory();
        this.checkPendingContext();
        // Note: Page change monitoring disabled to allow separate chats per page
        // this.startPageChangeMonitoring();
        
        console.log('SidepanelAI initialized');
    }
    
    initializeElements() {
        this.elements = {
            conversationArea: document.getElementById('conversation-area'),
            messageInput: document.getElementById('message-input'),
            sendButton: document.getElementById('send-message'),
            refreshContextButton: document.getElementById('refresh-context'),
            clearButton: document.getElementById('clear-conversation'),
            minimizeButton: document.getElementById('minimize-panel'),
            contextSection: document.getElementById('context-section'),
            contextContent: document.getElementById('context-content'),
            clearContextButton: document.getElementById('clear-context'),
            statusIndicator: document.getElementById('status-indicator'),
            statusText: document.getElementById('status-text')
        };
    }
    
    initializeEventListeners() {
        // Send message
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter key to send
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Input validation
        this.elements.messageInput.addEventListener('input', () => {
            const hasText = this.elements.messageInput.value.trim().length > 0;
            this.elements.sendButton.disabled = !hasText || this.isProcessing;
        });
        
        // Refresh context
        this.elements.refreshContextButton.addEventListener('click', () => this.refreshPageContext());
        
        // Clear conversation
        this.elements.clearButton.addEventListener('click', () => this.clearConversation());
        
        // Clear context
        this.elements.clearContextButton.addEventListener('click', () => this.clearContext());
        
        // Minimize panel
        this.elements.minimizeButton.addEventListener('click', () => this.minimizePanel());
        
        // Quick actions
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleQuickAction(btn.dataset.action));
        });
        
        // Listen for messages from content script or background
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleRuntimeMessage(message, sender, sendResponse);
        });
    }
    
    async initializeAI() {
        try {
            // Wait for AI config to be available
            if (window.aiConfig) {
                await window.aiConfig.loadConfig();
                this.aiConfig = window.aiConfig;
                this.updateStatus('ready', 'AI Ready');
            } else {
                // Load config from storage
                const result = await chrome.storage.local.get(['ai_config']);
                if (result.ai_config) {
                    this.aiConfig = result.ai_config;
                    this.updateStatus('ready', 'AI Ready');
                } else {
                    this.updateStatus('warning', 'AI Not Configured');
                }
            }
        } catch (error) {
            console.error('Failed to initialize AI:', error);
            this.updateStatus('error', 'AI Error');
        }
    }
    
    handleRuntimeMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'openWithContext':
                this.openWithContext(message.context, message.originalText);
                break;
            case 'addToConversation':
                this.addExternalMessage(message.content, message.type);
                break;
            case 'streamChunk':
                this.handleStreamChunk(message.chunk, message.isComplete);
                break;
            case 'streamError':
                this.handleStreamError(message.error);
                break;
            default:
                break;
        }
    }
    
    openWithContext(context, originalText = null) {
        // Apply semantic tagging to originalText if it's not already tagged
        let processedOriginalText = originalText;
        if (originalText && !originalText.includes('<page-context>')) {
            // If it looks like raw content, apply semantic tagging
            const isRawContent = !originalText.includes('<') || 
                                originalText.startsWith('Page Title:') ||
                                originalText.startsWith('Page Content:');
            
            if (isRawContent) {
                // Extract title if present
                let title = '';
                let content = originalText;
                
                if (originalText.startsWith('Page Title:')) {
                    const lines = originalText.split('\n');
                    title = lines[0].replace('Page Title:', '').trim();
                    content = lines.slice(2).join('\n'); // Skip title and empty line
                }
                
                processedOriginalText = `<page-context>\n${this.addSemanticTags(content, title)}\n</page-context>`;
            }
        }
        
        this.currentContext = {
            explanation: context,
            originalText: processedOriginalText,
            timestamp: new Date().toISOString()
        };
        
        this.showContext();
        this.scrollToBottom();
        
        // Add initial system message
        if (this.conversation.length === 0) {
            this.addMessage('assistant', `I've provided an explanation above. Feel free to ask any follow-up questions to deepen your understanding!`);
        }
    }
    
    async showContext() {
        if (!this.currentContext) return;
        
        // Get current page info for display
        const pageInfo = await this.getCurrentPageInfo();
        const pageTitle = pageInfo?.title || this.currentPageTitle || 'Current Page';
        
        this.elements.contextContent.innerHTML = `
            <div class="context-page-info">
                <div class="page-title">${pageTitle}</div>
                <div class="page-url">${pageInfo?.url || this.currentPageUrl || ''}</div>
            </div>
            <div class="context-explanation">
                ${this.formatContextContent(this.currentContext.explanation)}
            </div>
        `;
        this.elements.contextSection.style.display = 'block';
        
        // Hide welcome message
        const welcomeMessage = this.elements.conversationArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }
    
    formatContextContent(content) {
        // Simple HTML formatting for context display
        let formatted = content;
        
        // Convert markdown-like formatting to HTML
        formatted = formatted
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
            
        // Truncate if too long
        if (formatted.length > 300) {
            formatted = formatted.substring(0, 300) + '...';
        }
        
        return formatted;
    }
    
    clearContext() {
        this.currentContext = null;
        this.elements.contextSection.style.display = 'none';
        
        // Show welcome message if no conversation
        if (this.conversation.length === 0) {
            const welcomeMessage = this.elements.conversationArea.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }
        }
    }
    
    handleQuickAction(action) {
        if (!this.currentContext) {
            this.showToast('Please start with an explanation first', 'warning');
            return;
        }
        
        let prompt = '';
        switch (action) {
            case 'explain-more':
                prompt = 'Can you explain this in more detail?';
                break;
            case 'simplify':
                prompt = 'Can you explain this in simpler terms?';
                break;
            case 'examples':
                prompt = 'Can you provide more examples?';
                break;
        }
        
        if (prompt) {
            this.elements.messageInput.value = prompt;
            this.sendMessage();
        }
    }
    
    async sendMessage() {
        const messageText = this.elements.messageInput.value.trim();
        if (!messageText || this.isProcessing) return;
        
        // Add user message
        this.addMessage('user', messageText);
        
        // Clear input
        this.elements.messageInput.value = '';
        this.elements.sendButton.disabled = true;
        
        // Show streaming response placeholder
        this.startStreamingResponse();
        
        try {
            this.isProcessing = true;
            this.updateStatus('streaming', 'Streaming response...');
            
            // Start streaming AI response
            await this.getStreamingAIResponse(messageText);
            
        } catch (error) {
            console.error('Failed to get AI response:', error);
            this.handleStreamError(error.message);
        }
    }
    
    startStreamingResponse() {
        // Create streaming message bubble
        this.currentStreamingMessage = {
            id: Date.now() + Math.random(),
            type: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            isStreaming: true
        };
        
        this.conversation.push(this.currentStreamingMessage);
        this.renderStreamingMessage(this.currentStreamingMessage);
        this.scrollToBottom();
        
        // Hide welcome message
        const welcomeMessage = this.elements.conversationArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }
    
    async getStreamingAIResponse(userMessage) {
        if (!this.aiConfig) {
            throw new Error('AI not configured');
        }
        
        // Build conversation context
        const messages = this.buildConversationContext(userMessage);
        
        // Make streaming API call through background script
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'aiQuery',
                messages: messages,
                temperature: 0.7,
                maxTokens: 1000
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                if (response && response.success && response.streaming) {
                    console.log('✅ Streaming started successfully');
                    resolve();
                } else {
                    reject(new Error(response?.error || 'Failed to start streaming'));
                }
            });
        });
    }
    
    handleStreamChunk(chunk, isComplete) {
        if (!this.currentStreamingMessage) {
            console.warn('⚠️ Received stream chunk but no streaming message active');
            return;
        }
        
        if (isComplete) {
            console.log('🏁 Stream completed');
            
            // Finalize the streaming message
            this.currentStreamingMessage.isStreaming = false;
            this.updateStreamingMessage(this.currentStreamingMessage);
            this.saveConversationHistory();
            
            // Reset state
            this.currentStreamingMessage = null;
            this.isProcessing = false;
            this.elements.sendButton.disabled = false;
            this.updateStatus('ready', 'Ready');
            
        } else {
            // Append chunk to current message
            this.currentStreamingMessage.content += chunk;
            this.updateStreamingMessage(this.currentStreamingMessage);
            this.scrollToBottom();
        }
    }
    
    handleStreamError(errorMessage) {
        console.error('❌ Stream error:', errorMessage);
        
        if (this.currentStreamingMessage) {
            // Replace streaming message with error
            this.currentStreamingMessage.content = 'Sorry, I encountered an error. Please try again.';
            this.currentStreamingMessage.isError = true;
            this.currentStreamingMessage.isStreaming = false;
            this.updateStreamingMessage(this.currentStreamingMessage);
        } else {
            // Add error message if no streaming message exists
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.', true);
        }
        
        // Reset state
        this.currentStreamingMessage = null;
        this.isProcessing = false;
        this.elements.sendButton.disabled = false;
        this.updateStatus('error', 'Error occurred');
    }
    
    buildConversationContext(userMessage) {
        const messages = [];
        
        // System message with context
        let systemPrompt = `You are a helpful AI assistant integrated into the NoteVault browser extension. You help users understand and explore topics through follow-up conversations.`;
        
        if (this.currentContext) {
            systemPrompt += `\n\nCurrent context: The user previously received this explanation: "${this.currentContext.explanation}"`;
            if (this.currentContext.originalText) {
                systemPrompt += `\n\nStructured page content with semantic tags: ${this.currentContext.originalText}
                
The content above uses semantic tags for better conversation flow:
- <page-title>: The main page title
- <heading level="X">: Section headings (levels 1-6)
- <content-section>: Large blocks of main content
- <text>: Regular text passages
- <list> and <list-item>: Lists and their items
- <code-comment>: Comments from code or HTML
- <quote>: Quoted text or blockquotes
- <code-block>: Code snippets or technical content
- <table-row>: Tabular data
- <metadata>: Key-value pairs or structured data
- <comments-section>: User comments and discussions from the page
- <user-comment author="username" timestamp="time" votes="count">: Individual user comments with metadata
- <replies>: Nested replies to comments
- <reply author="username">: Individual replies within comment threads

When responding, you can reference specific sections by their tags to provide more focused and clear answers. For example, if discussing user opinions, mention "Based on the <user-comment> from [author]..." or "Looking at the discussion in <comments-section>...". You can also compare different viewpoints by referencing multiple user comments.`;
            }
        }
        
        systemPrompt += `\n\nProvide helpful, accurate, and conversational responses. Keep responses concise but informative. Use markdown formatting when helpful.`;
        
        messages.push({
            role: 'system',
            content: systemPrompt
        });
        
        // Add recent conversation history (last 10 messages)
        const recentConversation = this.conversation.slice(-10);
        for (const msg of recentConversation) {
            messages.push({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
            });
        }
        
        // Add current user message
        messages.push({
            role: 'user',
            content: userMessage
        });
        
        return messages;
    }
    
    addMessage(type, content, isError = false) {
        const message = {
            id: Date.now() + Math.random(),
            type: type,
            content: content,
            timestamp: new Date().toISOString(),
            isError: isError
        };
        
        this.conversation.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
        this.saveConversationHistory();
        
        // Hide welcome message
        const welcomeMessage = this.elements.conversationArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }
    
    addExternalMessage(content, type = 'assistant') {
        this.addMessage(type, content);
    }
    
    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}`;
        messageElement.dataset.messageId = message.id;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        if (message.isError) {
            bubble.classList.add('error-message');
        }
        
        // Format message content
        bubble.innerHTML = this.formatMessageContent(message.content);
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-time';
        timestamp.textContent = this.formatTime(new Date(message.timestamp));
        
        messageElement.appendChild(bubble);
        messageElement.appendChild(timestamp);
        
        // Insert before typing indicator if it exists
        const typingIndicator = this.elements.conversationArea.querySelector('.typing-indicator');
        if (typingIndicator) {
            this.elements.conversationArea.insertBefore(messageElement, typingIndicator);
        } else {
            this.elements.conversationArea.appendChild(messageElement);
        }
    }
    
    renderStreamingMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}`;
        messageElement.dataset.messageId = message.id;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble streaming';
        
        const content = document.createElement('div');
        content.className = 'streaming-content';
        
        const cursor = document.createElement('span');
        cursor.className = 'streaming-cursor';
        cursor.innerHTML = '▊';
        
        bubble.appendChild(content);
        bubble.appendChild(cursor);
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-time';
        timestamp.textContent = this.formatTime(new Date(message.timestamp));
        
        messageElement.appendChild(bubble);
        messageElement.appendChild(timestamp);
        
        this.elements.conversationArea.appendChild(messageElement);
        
        return messageElement;
    }
    
    updateStreamingMessage(message) {
        const messageElement = this.elements.conversationArea.querySelector(`[data-message-id="${message.id}"]`);
        if (!messageElement) {
            console.warn('Could not find streaming message element');
            return;
        }
        
        const content = messageElement.querySelector('.streaming-content');
        const cursor = messageElement.querySelector('.streaming-cursor');
        
        if (content) {
            // Format and update content
            content.innerHTML = this.formatMessageContent(message.content);
        }
        
        if (message.isStreaming === false) {
            // Remove streaming indicators when complete
            if (cursor) {
                cursor.remove();
            }
            const bubble = messageElement.querySelector('.message-bubble');
            if (bubble) {
                bubble.classList.remove('streaming');
                if (message.isError) {
                    bubble.classList.add('error-message');
                }
            }
        }
    }
    
    formatMessageContent(content) {
        // Convert markdown to HTML
        let formatted = content
            // Headers
            .replace(/^### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^## (.*$)/gm, '<h3>$1</h3>')
            .replace(/^# (.*$)/gm, '<h2>$1</h2>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Lists
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Line breaks
            .replace(/\n/g, '<br>');
            
        // Wrap lists in ul tags
        formatted = formatted.replace(/(<li>.*?<\/li>(?:\s*<br>\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>');
        
        return formatted;
    }
    
    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    addSemanticTags(content, title = '') {
        // Create a structured representation with semantic tags for better AI conversation
        let taggedContent = '';
        
        // Add page title with tag
        if (title) {
            taggedContent += `<page-title>${title}</page-title>\n\n`;
        }
        
        // Split content into sections for analysis
        const lines = content.split('\n');
        let currentSection = '';
        let inCodeBlock = false;
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) {
                if (currentSection) {
                    currentSection += '\n';
                }
                continue;
            }
            
            // Detect code blocks
            if (line.match(/^```/)) {
                if (inCodeBlock) {
                    currentSection += line + '\n';
                    taggedContent += `<code-block>\n${currentSection}</code-block>\n\n`;
                    currentSection = '';
                    inCodeBlock = false;
                } else {
                    if (currentSection) {
                        taggedContent += this.wrapContentInTag(currentSection) + '\n\n';
                        currentSection = '';
                    }
                    currentSection = line + '\n';
                    inCodeBlock = true;
                }
                continue;
            }
            
            if (inCodeBlock) {
                currentSection += line + '\n';
                continue;
            }
            
            // Detect headings
            if (line.match(/^#{1,6}\s/)) {
                if (currentSection) {
                    taggedContent += this.wrapContentInTag(currentSection) + '\n\n';
                    currentSection = '';
                }
                const level = line.match(/^#{1,6}/)[0].length;
                const headingText = line.replace(/^#{1,6}\s*/, '');
                taggedContent += `<heading level="${level}">${headingText}</heading>\n\n`;
                continue;
            }
            
            // Detect list items
            if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
                if (!inList) {
                    if (currentSection) {
                        taggedContent += this.wrapContentInTag(currentSection) + '\n\n';
                        currentSection = '';
                    }
                    inList = true;
                    currentSection = '<list>\n';
                }
                const itemText = line.replace(/^[-*+]\s|^\d+\.\s/, '');
                currentSection += `<list-item>${itemText}</list-item>\n`;
                continue;
            } else if (inList) {
                currentSection += '</list>';
                taggedContent += currentSection + '\n\n';
                currentSection = '';
                inList = false;
            }
            
            // Detect comments (HTML comments, code comments) - not user comments
            if (line.match(/<!--.*-->/) || line.match(/^\/\//) || line.match(/^#/) || line.match(/^\/\*/)) {
                if (currentSection) {
                    taggedContent += this.wrapContentInTag(currentSection) + '\n\n';
                    currentSection = '';
                }
                taggedContent += `<code-comment>${line}</code-comment>\n\n`;
                continue;
            }
            
            // Detect quotes
            if (line.match(/^>\s/)) {
                if (currentSection) {
                    taggedContent += this.wrapContentInTag(currentSection) + '\n\n';
                    currentSection = '';
                }
                const quoteText = line.replace(/^>\s*/, '');
                taggedContent += `<quote>${quoteText}</quote>\n\n`;
                continue;
            }
            
            // Detect potential table headers or structured data
            if (line.includes('|') && line.split('|').length > 2) {
                if (currentSection) {
                    taggedContent += this.wrapContentInTag(currentSection) + '\n\n';
                    currentSection = '';
                }
                taggedContent += `<table-row>${line}</table-row>\n\n`;
                continue;
            }
            
            // Regular content - accumulate
            if (currentSection) {
                currentSection += ' ' + line;
            } else {
                currentSection = line;
            }
        }
        
        // Handle any remaining content
        if (inList && currentSection) {
            if (!currentSection.endsWith('</list>')) {
                currentSection += '</list>';
            }
            taggedContent += currentSection + '\n\n';
        } else if (currentSection) {
            taggedContent += this.wrapContentInTag(currentSection) + '\n\n';
        }
        
        return taggedContent.trim();
    }
    
    wrapContentInTag(content) {
        const trimmed = content.trim();
        if (!trimmed) return '';
        
        // Try to detect content type for better tagging
        if (trimmed.length > 200) {
            return `<content-section>\n${trimmed}\n</content-section>`;
        } else if (trimmed.match(/^\w+:/) || trimmed.includes('=')) {
            return `<metadata>${trimmed}</metadata>`;
        } else {
            return `<text>${trimmed}</text>`;
        }
    }
    
    
    scrollToBottom() {
        setTimeout(() => {
            this.elements.conversationArea.scrollTop = this.elements.conversationArea.scrollHeight;
        }, 100);
    }
    
    clearConversation(askConfirmation = true) {
        if (!askConfirmation || confirm('Are you sure you want to clear this conversation? This will only clear the chat for the current page.')) {
            this.conversation = [];
            
            // Clear messages
            const messages = this.elements.conversationArea.querySelectorAll('.message');
            messages.forEach(msg => msg.remove());
            
            // Show welcome message
            const welcomeMessage = this.elements.conversationArea.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }
            
            this.saveConversationHistory();
            
            if (askConfirmation) {
                this.clearContext(); // Only clear context if user manually clears
            }
        }
    }
    
    minimizePanel() {
        // Send message to close sidepanel (if supported)
        try {
            window.close();
        } catch (error) {
            console.log('Cannot close sidepanel programmatically');
        }
    }
    
    updateStatus(type, message) {
        const dot = this.elements.statusIndicator.querySelector('.status-dot');
        dot.className = `fas fa-circle status-dot ${type}`;
        this.elements.statusText.textContent = message;
        
        // Update status indicator class for streaming animation
        this.elements.statusIndicator.className = `status-indicator ${type}`;
    }
    
    showToast(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 16px;
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    // Storage methods - now page-specific
    async saveConversationHistory() {
        try {
            if (!this.currentPageUrl) return;
            
            const pageKey = this.getPageStorageKey();
            await chrome.storage.local.set({
                [`sidepanel_page_${pageKey}`]: {
                    url: this.currentPageUrl,
                    title: this.currentPageTitle,
                    conversation: this.conversation,
                    context: this.currentContext,
                    lastUpdated: Date.now()
                }
            });
            
            console.log('💾 Saved conversation for page:', this.currentPageTitle);
        } catch (error) {
            console.error('Failed to save conversation:', error);
        }
    }
    
    getPageStorageKey() {
        if (!this.currentPageUrl) return 'default';
        
        // Create a clean key from URL (remove protocol, www, and special chars)
        return this.currentPageUrl
            .replace(/^https?:\/\/(www\.)?/, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 50); // Limit length
    }
    
    async loadConversationHistory() {
        try {
            // First, try to get current page info
            const pageInfo = await this.getCurrentPageInfo();
            if (pageInfo) {
                this.currentPageUrl = pageInfo.url;
                this.currentPageTitle = pageInfo.title;
            }
            
            // If we have page info, try to load page-specific conversation
            if (this.currentPageUrl) {
                const pageKey = this.getPageStorageKey();
                const pageResult = await chrome.storage.local.get([`sidepanel_page_${pageKey}`]);
                const pageData = pageResult[`sidepanel_page_${pageKey}`];
                
                if (pageData && pageData.url === this.currentPageUrl) {
                    console.log('📖 Loading existing conversation for page:', pageData.title);
                    
                    this.conversation = pageData.conversation || [];
                    this.currentContext = pageData.context;
                    
                    // Render existing messages (excluding streaming ones)
                    for (const message of this.conversation) {
                        if (!message.isStreaming) {
                            this.renderMessage(message);
                        }
                    }
                    
                    if (this.conversation.length > 0) {
                        const welcomeMessage = this.elements.conversationArea.querySelector('.welcome-message');
                        if (welcomeMessage) {
                            welcomeMessage.style.display = 'none';
                        }
                        this.scrollToBottom();
                    }
                    
                    if (this.currentContext) {
                        this.showContext();
                    }
                    
                    return; // Successfully loaded page-specific data
                }
            }
            
            // Fallback: try to load old global conversation (for migration)
            const result = await chrome.storage.local.get(['sidepanel_conversation', 'sidepanel_context']);
            
            if (result.sidepanel_conversation && result.sidepanel_conversation.length > 0) {
                console.log('📖 Loading legacy conversation data');
                
                this.conversation = result.sidepanel_conversation;
                this.currentContext = result.sidepanel_context;
                
                // Render existing messages (excluding streaming ones)
                for (const message of this.conversation) {
                    if (!message.isStreaming) {
                        this.renderMessage(message);
                    }
                }
                
                if (this.conversation.length > 0) {
                    const welcomeMessage = this.elements.conversationArea.querySelector('.welcome-message');
                    if (welcomeMessage) {
                        welcomeMessage.style.display = 'none';
                    }
                    this.scrollToBottom();
                }
                
                if (this.currentContext) {
                    this.showContext();
                }
                
                // Migrate to new format and clear old data
                await this.saveConversationHistory();
                await chrome.storage.local.remove(['sidepanel_conversation', 'sidepanel_context']);
            }
            
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }
    
    // Check for pending context from storage
    async checkPendingContext() {
        try {
            console.log('🔍 Checking for pending context...');
            
            const result = await chrome.storage.local.get(['sidepanel_pending_context']);
            
            if (result.sidepanel_pending_context) {
                const pendingContext = result.sidepanel_pending_context;
                console.log('📋 Found pending context:', {
                    hasContext: !!pendingContext.context,
                    hasOriginalText: !!pendingContext.originalText,
                    timestamp: new Date(pendingContext.timestamp).toLocaleTimeString()
                });
                
                // Check if context is recent (within 5 minutes)
                const contextAge = Date.now() - pendingContext.timestamp;
                if (contextAge < 300000) { // 5 minutes
                    console.log('✅ Context is recent, opening with context...');
                    this.openWithContext(pendingContext.context, pendingContext.originalText);
                    
                    // Clear the pending context
                    await chrome.storage.local.remove(['sidepanel_pending_context']);
                    console.log('🧹 Cleared pending context');
                } else {
                    console.log('⏰ Context is too old, ignoring...');
                    await chrome.storage.local.remove(['sidepanel_pending_context']);
                }
            } else {
                console.log('📭 No pending context found');
            }
        } catch (error) {
            console.error('❌ Failed to check pending context:', error);
        }
    }
    
    // Start monitoring for page changes
    startPageChangeMonitoring() {
        // Initial page info capture
        this.getCurrentPageInfo();
        
        // Check for page changes every 2 seconds
        this.pageChangeCheckInterval = setInterval(() => {
            this.checkForPageChange();
        }, 2000);
    }
    
    async getCurrentPageInfo() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                return {
                    url: tab.url,
                    title: tab.title
                };
            }
        } catch (error) {
            console.error('Failed to get current page info:', error);
        }
        return null;
    }
    
    async checkForPageChange() {
        const pageInfo = await this.getCurrentPageInfo();
        if (!pageInfo) return;
        
        // Check if this is the first time or if page has changed
        if (this.currentPageUrl && this.currentPageUrl !== pageInfo.url) {
            console.log('🔄 Page changed from', this.currentPageUrl, 'to', pageInfo.url);
            await this.handlePageChange(pageInfo);
        } else if (!this.currentPageUrl) {
            // First time - just set the current page info
            this.currentPageUrl = pageInfo.url;
            this.currentPageTitle = pageInfo.title;
        }
    }
    
    async handlePageChange(newPageInfo) {
        console.log('📄 Handling page change to:', newPageInfo.title);
        
        // Show notification about page change
        this.showToast(`Switched to: ${newPageInfo.title}`, 'info');
        this.updateStatus('processing', 'Loading new page context...');
        
        // Update page tracking
        this.currentPageUrl = newPageInfo.url;
        this.currentPageTitle = newPageInfo.title;
        
        // Clear conversation and context
        this.clearConversation(false); // false = don't ask for confirmation
        this.clearContext();
        
        // Get new page context and set it up
        await this.refreshPageContext(true); // true = silent refresh for page change
        
        console.log('✅ Page context switched successfully');
    }
    
    async refreshPageContext(silent = false) {
        try {
            if (!silent) {
                console.log('🔄 Refreshing page context...');
                this.updateStatus('processing', 'Refreshing context...');
                
                // Add visual feedback
                this.elements.refreshContextButton.classList.add('spinning');
            }
            
            // Get current tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs || !tabs[0]) {
                throw new Error('No active tab found');
            }
            
            const tab = tabs[0];
            console.log('📄 Current tab:', { id: tab.id, url: tab.url, title: tab.title });
            
            // Update our tracking
            this.currentPageUrl = tab.url;
            this.currentPageTitle = tab.title;
            
            // Extract fresh page content via background script (more reliable)
            console.log('📞 Requesting page content extraction...');
            let pageContent = null;
            
            try {
                pageContent = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Request timeout - background script not responding'));
                    }, 8000); // 8 second timeout
                    
                    chrome.runtime.sendMessage({
                        action: 'extractPageContent',
                        tabId: tab.id
                    }, (response) => {
                        clearTimeout(timeout);
                        
                        if (chrome.runtime.lastError) {
                            console.error('Chrome runtime error:', chrome.runtime.lastError);
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        
                        console.log('📨 Background response:', response);
                        
                        if (response && response.success && response.content) {
                            resolve(response.content);
                        } else {
                            reject(new Error(response?.error || 'Failed to extract content - no valid response'));
                        }
                    });
                });
            } catch (backgroundError) {
                console.warn('⚠️ Background extraction failed, trying direct extraction:', backgroundError.message);
                
                // Fallback: Try direct extraction via scripting API
                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        function: () => {
                            // Enhanced content extraction with structure preservation and user comments
                            const title = document.title || 'Untitled Page';
                            let content = '';
                            
                            // Try to get main content
                            const main = document.querySelector('main') || 
                                         document.querySelector('[role="main"]') || 
                                         document.querySelector('.main-content') ||
                                         document.querySelector('#content') ||
                                         document.querySelector('article') ||
                                         document.body;
                            
                            if (main) {
                                content = extractStructuredContent(main);
                            }
                            
                            // Extract user comments separately
                            const comments = extractUserComments();
                            if (comments) {
                                content += '\n\n' + comments;
                            }
                            
                            return {
                                title: title,
                                content: content || 'No content available'
                            };
                            
                            function extractStructuredContent(element) {
                                let structuredContent = '';
                                
                                // Get all child elements and process them in order
                                const walker = document.createTreeWalker(
                                    element,
                                    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
                                    null,
                                    false
                                );
                                
                                let currentNode;
                                
                                while (currentNode = walker.nextNode()) {
                                    if (currentNode.nodeType === Node.TEXT_NODE) {
                                        const text = currentNode.textContent.trim();
                                        if (text && text.length > 2) {
                                            structuredContent += text + ' ';
                                        }
                                    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                                        const tagName = currentNode.tagName.toLowerCase();
                                        
                                        // Handle different element types with structure preservation
                                        switch (tagName) {
                                            case 'h1':
                                            case 'h2':
                                            case 'h3':
                                            case 'h4':
                                            case 'h5':
                                            case 'h6':
                                                const level = parseInt(tagName.charAt(1));
                                                const headingText = currentNode.textContent.trim();
                                                if (headingText) {
                                                    structuredContent += `\n${'#'.repeat(level)} ${headingText}\n\n`;
                                                }
                                                break;
                                                
                                            case 'li':
                                                const listText = currentNode.textContent.trim();
                                                if (listText) {
                                                    structuredContent += `- ${listText}\n`;
                                                }
                                                break;
                                                
                                            case 'p':
                                                const pText = currentNode.textContent.trim();
                                                if (pText) {
                                                    structuredContent += `\n${pText}\n\n`;
                                                }
                                                break;
                                                
                                            case 'blockquote':
                                                const quoteText = currentNode.textContent.trim();
                                                if (quoteText) {
                                                    structuredContent += `\n> ${quoteText}\n\n`;
                                                }
                                                break;
                                                
                                            case 'code':
                                                const codeText = currentNode.textContent.trim();
                                                if (codeText) {
                                                    structuredContent += `\`${codeText}\``;
                                                }
                                                break;
                                                
                                            case 'pre':
                                                const preText = currentNode.textContent.trim();
                                                if (preText) {
                                                    structuredContent += `\n\`\`\`\n${preText}\n\`\`\`\n\n`;
                                                }
                                                break;
                                        }
                                    }
                                }
                                
                                // Clean up the content
                                return structuredContent
                                    .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines
                                    .replace(/\s+/g, ' ')        // Normalize spaces
                                    .trim();
                            }
                            
                            function extractUserComments() {
                                let commentsContent = '';
                                
                                // Common comment section selectors for various platforms
                                const commentSelectors = [
                                    // Generic comment containers
                                    '[class*="comment" i]:not([class*="button" i]):not([class*="form" i])',
                                    '[id*="comment" i]',
                                    '[data-testid*="comment" i]',
                                    
                                    // Popular platforms
                                    // YouTube
                                    '#comments ytd-comment-thread-renderer',
                                    'ytd-comment-view-model',
                                    
                                    // Reddit
                                    '[data-testid="comment"]',
                                    '.Comment',
                                    '[class*="Comment" i]',
                                    
                                    // News sites
                                    '.comment-content',
                                    '.comment-body',
                                    '.user-comment',
                                    
                                    // Social media
                                    '[role="article"]',
                                    '[data-testid*="tweet" i]',
                                    '[aria-label*="comment" i]',
                                    
                                    // Generic discussion forums
                                    '.post-content',
                                    '.message-content',
                                    '.reply',
                                    '[class*="discussion" i]',
                                    
                                    // Disqus and other comment systems
                                    '.post-message',
                                    '.comment-text',
                                    '.comment-message'
                                ];
                                
                                // Try each selector and collect comments
                                let foundComments = [];
                                
                                for (const selector of commentSelectors) {
                                    try {
                                        const elements = document.querySelectorAll(selector);
                                        
                                        elements.forEach(element => {
                                            // Skip if already processed or too small
                                            if (element.dataset.processed || element.textContent.trim().length < 10) {
                                                return;
                                            }
                                            
                                            // Mark as processed to avoid duplicates
                                            element.dataset.processed = 'true';
                                            
                                            // Extract comment data
                                            const commentData = extractSingleComment(element);
                                            if (commentData && !isDuplicate(foundComments, commentData)) {
                                                foundComments.push(commentData);
                                            }
                                        });
                                        
                                        // If we found comments with this selector, we can be more confident
                                        if (foundComments.length > 0) {
                                            break;
                                        }
                                    } catch (e) {
                                        // Continue with next selector if this one fails
                                        continue;
                                    }
                                }
                                
                                // Format found comments
                                if (foundComments.length > 0) {
                                    commentsContent = '<comments-section>\n';
                                    
                                    foundComments.forEach((comment) => {
                                        commentsContent += `<user-comment${comment.author ? ` author="${comment.author}"` : ''}${comment.timestamp ? ` timestamp="${comment.timestamp}"` : ''}${comment.votes ? ` votes="${comment.votes}"` : ''}>\n`;
                                        commentsContent += `${comment.content}\n`;
                                        
                                        // Add replies if any
                                        if (comment.replies && comment.replies.length > 0) {
                                            commentsContent += '<replies>\n';
                                            comment.replies.forEach(reply => {
                                                commentsContent += `<reply${reply.author ? ` author="${reply.author}"` : ''}>\n${reply.content}\n</reply>\n`;
                                            });
                                            commentsContent += '</replies>\n';
                                        }
                                        
                                        commentsContent += '</user-comment>\n\n';
                                    });
                                    
                                    commentsContent += '</comments-section>';
                                }
                                
                                return commentsContent;
                            }
                            
                            function extractSingleComment(element) {
                                const comment = {
                                    content: '',
                                    author: null,
                                    timestamp: null,
                                    votes: null,
                                    replies: []
                                };
                                
                                // Extract main comment content
                                let contentElement = element.querySelector([
                                    '[class*="content" i]',
                                    '[class*="text" i]',
                                    '[class*="body" i]',
                                    '[class*="message" i]',
                                    'p',
                                    '.comment-text',
                                    '[data-testid*="text" i]'
                                ].join(',')) || element;
                                
                                comment.content = contentElement.textContent.trim();
                                
                                // Extract author information
                                const authorElement = element.querySelector([
                                    '[class*="author" i]',
                                    '[class*="user" i]',
                                    '[class*="name" i]',
                                    '.username',
                                    '[data-testid*="author" i]',
                                    '[data-testid*="user" i]',
                                    'a[href*="/user/"]',
                                    'a[href*="/u/"]',
                                    'strong',
                                    'b'
                                ].join(','));
                                
                                if (authorElement) {
                                    comment.author = authorElement.textContent.trim();
                                }
                                
                                // Extract timestamp
                                const timeElement = element.querySelector([
                                    'time',
                                    '[class*="time" i]',
                                    '[class*="date" i]',
                                    '[datetime]',
                                    '.timestamp'
                                ].join(','));
                                
                                if (timeElement) {
                                    comment.timestamp = timeElement.textContent.trim() || timeElement.getAttribute('datetime');
                                }
                                
                                // Extract vote count
                                const voteElement = element.querySelector([
                                    '[class*="vote" i]',
                                    '[class*="score" i]',
                                    '[class*="point" i]',
                                    '[class*="like" i]',
                                    '.upvote-count'
                                ].join(','));
                                
                                if (voteElement) {
                                    const voteText = voteElement.textContent.trim();
                                    const voteMatch = voteText.match(/\d+/);
                                    if (voteMatch) {
                                        comment.votes = voteMatch[0];
                                    }
                                }
                                
                                // Extract replies (nested comments)
                                const replyElements = element.querySelectorAll([
                                    '[class*="reply" i]',
                                    '[class*="child" i]',
                                    '.comment-reply'
                                ].join(','));
                                
                                replyElements.forEach(replyEl => {
                                    if (replyEl.textContent.trim().length > 10) {
                                        const replyAuthor = replyEl.querySelector([
                                            '[class*="author" i]',
                                            '[class*="user" i]',
                                            'strong',
                                            'b'
                                        ].join(','))?.textContent.trim();
                                        
                                        comment.replies.push({
                                            content: replyEl.textContent.trim(),
                                            author: replyAuthor
                                        });
                                    }
                                });
                                
                                return comment.content.length > 10 ? comment : null;
                            }
                            
                            function isDuplicate(existingComments, newComment) {
                                return existingComments.some(existing => 
                                    existing.content === newComment.content ||
                                    (existing.content.length > 50 && newComment.content.includes(existing.content.substring(0, 50)))
                                );
                            }
                        }
                    });
                    
                    if (results && results[0] && results[0].result) {
                        pageContent = results[0].result;
                        console.log('✅ Fallback extraction successful');
                    } else {
                        throw new Error('Fallback extraction failed');
                    }
                } catch (fallbackError) {
                    console.error('❌ Fallback extraction also failed:', fallbackError);
                    throw new Error(`Both extraction methods failed: ${backgroundError.message}; ${fallbackError.message}`);
                }
            }
            
            console.log('📝 Extracted content:', { 
                title: pageContent.title, 
                contentLength: pageContent.content?.length || 0 
            });
            
            if (pageContent && pageContent.title && pageContent.content) {
                // Update context with fresh content using semantic tags
                const contextText = `I'm ready to discuss this page: "${pageContent.title}". Feel free to ask questions about the content, request summaries, explanations, or have a general conversation about the topics covered.`;
                const taggedContent = this.addSemanticTags(pageContent.content, pageContent.title);
                const originalText = `<page-context>\n${taggedContent}\n</page-context>`;
                
                this.openWithContext(contextText, originalText);
                
                if (!silent) {
                    this.showToast('Context refreshed with latest page content!', 'success');
                }
                
                console.log('✅ Page context refreshed successfully');
            } else {
                throw new Error(`Invalid page content received: ${JSON.stringify(pageContent)}`);
            }
            
        } catch (error) {
            console.error('❌ Failed to refresh context:', error);
            if (!silent) {
                this.showToast(`Failed to refresh context: ${error.message}`, 'error');
            }
        } finally {
            if (!silent) {
                this.elements.refreshContextButton.classList.remove('spinning');
                this.updateStatus('ready', 'Ready');
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sidepanelAI = new SidepanelAI();
});

// Handle page visibility for better performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, could pause some operations
        if (window.sidepanelAI && window.sidepanelAI.pageChangeCheckInterval) {
            clearInterval(window.sidepanelAI.pageChangeCheckInterval);
        }
    } else {
        // Page is visible, resume operations
        if (window.sidepanelAI) {
            window.sidepanelAI.scrollToBottom();
            // Restart page monitoring
            if (!window.sidepanelAI.pageChangeCheckInterval) {
                window.sidepanelAI.startPageChangeMonitoring();
            }
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.sidepanelAI && window.sidepanelAI.pageChangeCheckInterval) {
        clearInterval(window.sidepanelAI.pageChangeCheckInterval);
    }
});