// Advanced AI Features for NoteVault
class NoteVaultAIFeatures {
    constructor(aiService) {
        this.aiService = aiService;
        this.app = aiService.app;
        this.smartSuggestions = [];
        this.contextualInsights = new Map();
        this.userPreferences = {};
        this.activityPatterns = [];
        
        this.initializeFeatures();
    }

    // Initialize advanced AI features
    async initializeFeatures() {
        // Load user preferences
        await this.loadUserPreferences();
        
        // Start pattern learning
        this.startPatternLearning();
        
        // Initialize contextual awareness
        this.initializeContextualAwareness();
        
        // Start smart notifications
        this.initializeSmartNotifications();
    }

    // Load user preferences from storage
    async loadUserPreferences() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const stored = await chrome.storage.local.get(['ai_user_preferences']);
                this.userPreferences = stored.ai_user_preferences || {
                    preferredTags: [],
                    preferredNotebooks: [],
                    writingStyle: 'casual',
                    notificationFrequency: 'moderate',
                    autoEnhanceLevel: 'conservative'
                };
            }
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }
    }

    // Save user preferences
    async saveUserPreferences() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ ai_user_preferences: this.userPreferences });
            }
        } catch (error) {
            console.error('Failed to save user preferences:', error);
        }
    }

    // Start learning user patterns
    startPatternLearning() {
        // Track user interactions
        this.trackUserInteractions();
        
        // Analyze patterns periodically
        setInterval(() => {
            this.analyzeUserPatterns();
        }, 600000); // Every 10 minutes
    }

    // Track user interactions for pattern learning
    trackUserInteractions() {
        const originalSaveNote = window.NoteVaultApp?.saveNotes;
        if (originalSaveNote) {
            window.NoteVaultApp.saveNotes = (...args) => {
                this.recordActivity('note_saved', {
                    timestamp: new Date().toISOString(),
                    dayOfWeek: new Date().getDay(),
                    hourOfDay: new Date().getHours()
                });
                return originalSaveNote.apply(this, args);
            };
        }
    }

    // Record user activity for learning
    recordActivity(type, data) {
        this.activityPatterns.push({
            type,
            data,
            timestamp: new Date().toISOString()
        });
        
        // Keep only recent activities (last 100)
        if (this.activityPatterns.length > 100) {
            this.activityPatterns = this.activityPatterns.slice(-100);
        }
    }

    // Analyze user patterns
    analyzeUserPatterns() {
        if (this.activityPatterns.length < 10) return;
        
        // Analyze peak activity times
        const hourCounts = {};
        this.activityPatterns.forEach(activity => {
            const hour = new Date(activity.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const peakHour = Object.keys(hourCounts).reduce((a, b) => 
            hourCounts[a] > hourCounts[b] ? a : b
        );
        
        this.userPreferences.peakActivityHour = parseInt(peakHour);
        
        // Analyze preferred days
        const dayCounts = {};
        this.activityPatterns.forEach(activity => {
            const day = new Date(activity.timestamp).getDay();
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        
        const peakDay = Object.keys(dayCounts).reduce((a, b) => 
            dayCounts[a] > dayCounts[b] ? a : b
        );
        
        this.userPreferences.peakActivityDay = parseInt(peakDay);
        
        // Save learned preferences
        this.saveUserPreferences();
    }

    // Initialize contextual awareness
    initializeContextualAwareness() {
        // Monitor current page context when extension is used
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.onActivated.addListener(() => {
                this.updateContextualAwareness();
            });
        }
    }

    // Update contextual awareness
    async updateContextualAwareness() {
        try {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    const context = {
                        url: tab.url,
                        title: tab.title,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Generate contextual suggestions based on current page
                    this.generateContextualSuggestions(context);
                }
            }
        } catch (error) {
            console.error('Failed to update contextual awareness:', error);
        }
    }

    // Generate contextual suggestions based on current browsing context
    async generateContextualSuggestions(context) {
        if (!this.aiService.ai.isAvailable()) return;
        
        const suggestionPrompt = [
            {
                role: "system",
                content: `You are an AI assistant that provides contextual note-taking suggestions based on the user's current web browsing context. Suggest relevant note topics, templates, or actions.

Respond in JSON format: {
  "suggestions": [{"title": string, "type": string, "template": string, "reason": string}]
}`
            },
            {
                role: "user",
                content: `Current page: "${context.title}" at ${context.url}\n\nSuggest relevant note-taking actions.`
            }
        ];

        try {
            const result = await this.aiService.ai.makeAPICall(suggestionPrompt, 0.7);
            const suggestions = JSON.parse(result);
            
            if (suggestions.suggestions && suggestions.suggestions.length > 0) {
                this.contextualInsights.set(context.url, suggestions.suggestions);
                this.showContextualSuggestion(suggestions.suggestions[0]);
            }
        } catch (error) {
            console.error('Failed to generate contextual suggestions:', error);
        }
    }

    // Show contextual suggestion
    showContextualSuggestion(suggestion) {
        const notification = {
            title: "Smart Note Suggestion",
            description: `${suggestion.title}\n\nReason: ${suggestion.reason}`,
            action: suggestion.template ? 'create_from_template' : 'create_note',
            data: suggestion
        };
        
        this.aiService.showCustomNotification(notification);
    }

    // Initialize smart notifications
    initializeSmartNotifications() {
        // Daily review reminders
        this.scheduleSmartReminders();
        
        // Abandoned note detection
        this.startAbandonedNoteDetection();
        
        // Knowledge gap analysis
        this.scheduleKnowledgeGapAnalysis();
    }

    // Schedule smart reminders based on user patterns
    scheduleSmartReminders() {
        const checkReminders = () => {
            const now = new Date();
            const hour = now.getHours();
            const day = now.getDay();
            
            // Send reminders during peak activity times
            if (this.userPreferences.peakActivityHour && 
                Math.abs(hour - this.userPreferences.peakActivityHour) <= 1) {
                this.sendSmartReminder();
            }
        };
        
        // Check every hour
        setInterval(checkReminders, 3600000);
    }

    // Send smart reminder
    async sendSmartReminder() {
        if (!this.aiService.ai.isAvailable()) return;
        
        const recentNotes = this.app.notes.slice(0, 5);
        const reminderPrompt = [
            {
                role: "system",
                content: `You are an AI assistant that provides personalized reminders for note management. Based on recent notes, suggest a helpful reminder or action.

Respond in JSON format: {
  "reminder": {"title": string, "message": string, "action": string}
}`
            },
            {
                role: "user",
                content: `Recent notes: ${recentNotes.map(n => n.title).join(', ')}\n\nSuggest a helpful reminder.`
            }
        ];

        try {
            const result = await this.aiService.ai.makeAPICall(reminderPrompt, 0.6);
            const reminder = JSON.parse(result).reminder;
            
            if (reminder) {
                this.aiService.showCustomNotification(reminder);
            }
        } catch (error) {
            console.error('Failed to generate smart reminder:', error);
        }
    }

    // Start abandoned note detection
    startAbandonedNoteDetection() {
        setInterval(() => {
            this.detectAbandonedNotes();
        }, 86400000); // Daily check
    }

    // Detect notes that might need attention
    detectAbandonedNotes() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const abandonedNotes = this.app.notes.filter(note => {
            const lastUpdate = new Date(note.updatedAt);
            const isOld = lastUpdate < weekAgo;
            const isShort = this.aiService.ai.stripHTML(note.content).length < 100;
            const hasGenericTitle = this.aiService.needsSmartTitle(note.title);
            
            return isOld && (isShort || hasGenericTitle);
        });

        if (abandonedNotes.length > 0) {
            this.suggestNoteCleanup(abandonedNotes);
        }
    }

    // Suggest note cleanup
    suggestNoteCleanup(abandonedNotes) {
        const suggestion = {
            title: "Note Cleanup Suggestion",
            description: `Found ${abandonedNotes.length} notes that might need attention. Would you like me to help organize them?`,
            action: 'cleanup_notes',
            data: { notes: abandonedNotes.map(n => n.id) }
        };
        
        this.aiService.showCustomNotification(suggestion);
    }

    // Schedule knowledge gap analysis
    scheduleKnowledgeGapAnalysis() {
        // Weekly analysis
        setInterval(() => {
            this.analyzeKnowledgeGaps();
        }, 604800000); // Weekly
    }

    // Analyze knowledge gaps in notes
    async analyzeKnowledgeGaps() {
        if (!this.aiService.ai.isAvailable() || this.app.notes.length < 10) return;
        
        const analysisPrompt = [
            {
                role: "system",
                content: `You are an AI that analyzes note collections to identify knowledge gaps and suggest areas for exploration. Look for missing connections, incomplete topics, and areas that could be expanded.

Respond in JSON format: {
  "gaps": [{"topic": string, "description": string, "priority": string, "suggestions": [string]}]
}`
            },
            {
                role: "user",
                content: `Note titles: ${this.app.notes.slice(0, 30).map(n => n.title).join(', ')}\n\nAnalyze for knowledge gaps and suggest areas to explore.`
            }
        ];

        try {
            const result = await this.aiService.ai.makeAPICall(analysisPrompt, 0.5);
            const analysis = JSON.parse(result);
            
            if (analysis.gaps && analysis.gaps.length > 0) {
                this.presentKnowledgeGaps(analysis.gaps);
            }
        } catch (error) {
            console.error('Failed to analyze knowledge gaps:', error);
        }
    }

    // Present knowledge gaps to user
    presentKnowledgeGaps(gaps) {
        const highPriorityGaps = gaps.filter(gap => gap.priority === 'high');
        
        if (highPriorityGaps.length > 0) {
            const suggestion = {
                title: "Knowledge Gap Identified",
                description: `Consider exploring: ${highPriorityGaps[0].topic}\n\n${highPriorityGaps[0].description}`,
                action: 'explore_topic',
                data: highPriorityGaps[0]
            };
            
            this.aiService.showCustomNotification(suggestion);
        }
    }

    // Generate note template based on context
    async generateNoteTemplate(context) {
        if (!this.aiService.ai.isAvailable()) return null;
        
        const templatePrompt = [
            {
                role: "system",
                content: `Generate a note template based on the given context. Include structured sections, prompts, and placeholders.

Respond in JSON format: {
  "template": {
    "title": string,
    "sections": [{"heading": string, "content": string, "type": string}]
  }
}`
            },
            {
                role: "user",
                content: `Context: ${JSON.stringify(context)}\n\nGenerate an appropriate note template.`
            }
        ];

        try {
            const result = await this.aiService.ai.makeAPICall(templatePrompt, 0.6);
            return JSON.parse(result).template;
        } catch (error) {
            console.error('Failed to generate note template:', error);
            return null;
        }
    }

    // Export insights for user review
    exportInsights() {
        return {
            userPreferences: this.userPreferences,
            activityPatterns: this.activityPatterns.slice(-30), // Last 30 activities
            contextualInsights: Array.from(this.contextualInsights.entries()),
            smartSuggestions: this.smartSuggestions
        };
    }

    // Get feature status
    getStatus() {
        return {
            patternLearningActive: this.activityPatterns.length > 0,
            contextualAwarenessActive: this.contextualInsights.size > 0,
            smartNotificationsActive: true,
            userPreferencesLearned: Object.keys(this.userPreferences).length > 4
        };
    }
}

// Export for use in other modules
window.NoteVaultAIFeatures = NoteVaultAIFeatures;