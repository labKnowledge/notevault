// NoteVault Sidepanel - AI Assistant for Follow-up Conversations
class SidepanelAI {
    constructor() {
        this.conversation = [];
        this.currentContext = null;
        this.isProcessing = false;
        this.aiConfig = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeAI();
        this.loadConversationHistory();
        this.checkPendingContext();
        
        console.log('SidepanelAI initialized');
    }
    
    initializeElements() {
        this.elements = {
            conversationArea: document.getElementById('conversation-area'),
            messageInput: document.getElementById('message-input'),
            sendButton: document.getElementById('send-message'),
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
        this.currentContext = {
            explanation: context,
            originalText: originalText,
            timestamp: new Date().toISOString()
        };
        
        this.showContext();
        this.scrollToBottom();
        
        // Add initial system message
        if (this.conversation.length === 0) {
            this.addMessage('assistant', `I've provided an explanation above. Feel free to ask any follow-up questions to deepen your understanding!`);
        }
    }
    
    showContext() {
        if (!this.currentContext) return;
        
        this.elements.contextContent.innerHTML = this.formatContextContent(this.currentContext.explanation);
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
                systemPrompt += `\n\nOriginal text that was explained: "${this.currentContext.originalText}"`;
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
    
    
    scrollToBottom() {
        setTimeout(() => {
            this.elements.conversationArea.scrollTop = this.elements.conversationArea.scrollHeight;
        }, 100);
    }
    
    clearConversation() {
        if (confirm('Are you sure you want to clear the conversation?')) {
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
            this.clearContext();
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
    
    // Storage methods
    async saveConversationHistory() {
        try {
            await chrome.storage.local.set({
                sidepanel_conversation: this.conversation,
                sidepanel_context: this.currentContext
            });
        } catch (error) {
            console.error('Failed to save conversation:', error);
        }
    }
    
    async loadConversationHistory() {
        try {
            const result = await chrome.storage.local.get(['sidepanel_conversation', 'sidepanel_context']);
            
            if (result.sidepanel_conversation) {
                this.conversation = result.sidepanel_conversation;
                
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
            }
            
            if (result.sidepanel_context) {
                this.currentContext = result.sidepanel_context;
                this.showContext();
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sidepanelAI = new SidepanelAI();
});

// Handle page visibility for better performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, could pause some operations
    } else {
        // Page is visible, resume operations
        if (window.sidepanelAI) {
            window.sidepanelAI.scrollToBottom();
        }
    }
});