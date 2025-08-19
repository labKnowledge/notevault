// AI Configuration Manager for NoteVault
class AIConfig {
    constructor() {
        this.config = {
            apiKey: '',
            baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
            model: 'qwen-plus'
        };
        this.loadConfig();
    }

    // Load configuration from Chrome storage or fallback to defaults
    async loadConfig() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const stored = await chrome.storage.local.get(['ai_config']);
                if (stored.ai_config) {
                    this.config = { ...this.config, ...stored.ai_config };
                } else {
                    // Save default config on first run
                    await this.saveConfig();
                }
            }
        } catch (error) {
            console.warn('Could not load AI config from storage:', error);
        }
    }

    // Save configuration to Chrome storage
    async saveConfig() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ ai_config: this.config });
            }
        } catch (error) {
            console.error('Could not save AI config:', error);
        }
    }

    // Get configuration
    getConfig() {
        return { ...this.config };
    }

    // Update configuration
    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        await this.saveConfig();
    }

    // Validate configuration
    isValid() {
        return this.config.apiKey && this.config.baseUrl && this.config.model;
    }

    // Get status
    getStatus() {
        return {
            configured: this.isValid(),
            model: this.config.model,
            provider: 'Qwen (Alibaba Cloud)'
        };
    }
}

// Create global instance
window.aiConfig = new AIConfig();

// Initialize configuration
window.aiConfig.loadConfig().then(() => {
    console.log('AI Configuration loaded:', window.aiConfig.getStatus());
});

// Export for use in other modules
window.AIConfig = AIConfig;
