// Simplified Sidepanel Opening with Better Fallback
// This approach prioritizes compatibility over advanced features

async function openChatInterface(context, originalText) {
    try {
        console.log('🚀 Opening chat interface...');
        
        // Store context for the chat interface
        await chrome.storage.local.set({
            chat_context: {
                context: context,
                originalText: originalText,
                timestamp: Date.now()
            }
        });
        
        console.log('✅ Context stored, attempting to open interface...');
        
        // Method 1: Try Chrome's native sidepanel (Chrome 114+)
        if (chrome.sidePanel) {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    await chrome.sidePanel.open({ windowId: tab.windowId });
                    console.log('✅ Sidepanel opened successfully');
                    return true;
                }
            } catch (error) {
                console.warn('⚠️ Sidepanel failed:', error.message);
            }
        }
        
        // Method 2: Fallback to popup window
        console.log('📱 Opening as popup window...');
        const popup = await chrome.windows.create({
            url: chrome.runtime.getURL('sidepanel.html'),
            type: 'popup',
            width: 420,
            height: 650,
            focused: true,
            left: screen.width - 450,
            top: 50
        });
        
        console.log('✅ Popup window created:', popup.id);
        return true;
        
    } catch (error) {
        console.error('❌ Failed to open chat interface:', error);
        return false;
    }
}

// Export for use in background script
if (typeof window === 'undefined') {
    // Running in service worker
    self.openChatInterface = openChatInterface;
} else {
    // Running in regular window
    window.openChatInterface = openChatInterface;
}