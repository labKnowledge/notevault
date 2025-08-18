// AI Service Layer - Integrates AI agent with NoteVault functionality
class NoteVaultAIService {
    constructor(appInstance) {
        this.app = appInstance;
        this.ai = new NoteVaultAI();
        this.activeAnalysis = new Map();
        this.suggestionQueue = [];
        this.autoEnhanceEnabled = true;
        this.smartTaggingEnabled = true;
        this.autonomousMode = true;
        
        this.initializeService();
    }

    // Initialize the AI service
    async initializeService() {
        try {
            // Load configuration from .env values
            await this.loadEnvConfig();
            
            // Initialize advanced AI features
            if (window.NoteVaultAIFeatures) {
                this.aiFeatures = new window.NoteVaultAIFeatures(this);
            }
            
            // Set up periodic autonomous suggestions
            if (this.autonomousMode) {
                this.startAutonomousMode();
            }
            
            console.log('AI Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AI Service:', error);
        }
    }

    // Load configuration from environment
    async loadEnvConfig() {
        // Wait for configuration to be ready
        if (window.aiConfig) {
            await window.aiConfig.loadConfig();
            const config = window.aiConfig.getConfig();
            this.ai.setConfig(config.apiKey, config.baseUrl, config.model);
        } else {
            console.warn('AI Service: Configuration manager not available');
        }
    }

    // Enhanced note saving with AI analysis
    async saveNoteWithAI(noteData, options = {}) {
        const {
            enableSmartTitling = true,
            enableSmartTagging = true,
            enableNotebookSuggestion = true,
            enableContentEnhancement = false,
            showSuggestions = true
        } = options;

        try {
            // Create or update the base note first
            let note = noteData;
            
            // Generate smart title if requested and title is generic or empty
            if (enableSmartTitling && this.needsSmartTitle(note.title)) {
                const titleSuggestions = await this.ai.generateSmartTitle(note.content);
                if (titleSuggestions.length > 0) {
                    // Use the first suggestion, but save others for user selection
                    note.aiTitleSuggestions = titleSuggestions;
                    if (showSuggestions) {
                        this.showTitleSuggestions(note, titleSuggestions);
                    } else {
                        note.title = titleSuggestions[0];
                    }
                }
            }

            // Generate smart tags
            if (enableSmartTagging && this.ai.isAvailable()) {
                const tagSuggestions = await this.ai.generateSmartTags(note, this.app.tags);
                if (tagSuggestions.length > 0) {
                    note.aiTagSuggestions = tagSuggestions;
                    if (showSuggestions) {
                        this.showTagSuggestions(note, tagSuggestions);
                    } else {
                        // Auto-apply suggested tags
                        await this.applyTagSuggestions(note, tagSuggestions.slice(0, 3));
                    }
                }
            }

            // Suggest notebook categorization
            if (enableNotebookSuggestion && this.ai.isAvailable()) {
                const notebookSuggestion = await this.ai.suggestNotebook(note, this.app.notebooks);
                if (notebookSuggestion.confidence > 0.7) {
                    note.aiNotebookSuggestion = notebookSuggestion;
                    if (showSuggestions) {
                        this.showNotebookSuggestion(note, notebookSuggestion);
                    } else {
                        // Auto-apply if high confidence
                        this.applyNotebookSuggestion(note, notebookSuggestion);
                    }
                }
            }

            // Enhance content if requested
            if (enableContentEnhancement && this.ai.isAvailable()) {
                const enhancement = await this.ai.enhanceContent(note);
                if (enhancement) {
                    note.aiContentEnhancement = enhancement;
                    if (showSuggestions) {
                        this.showContentEnhancement(note, enhancement);
                    }
                }
            }

            // Perform analysis in background
            this.analyzeNoteInBackground(note);

            return note;
        } catch (error) {
            console.error('AI-enhanced note saving failed:', error);
            return noteData; // Return original note if AI fails
        }
    }

    // Analyze note in background
    async analyzeNoteInBackground(note) {
        if (!this.ai.isAvailable()) return;

        try {
            const analysis = await this.ai.analyzeNote(note);
            if (analysis) {
                // Store analysis results
                note.aiAnalysis = analysis;
                
                // Update UI with insights if note is currently open
                this.updateNoteAnalysisUI(note, analysis);
                
                // Queue autonomous suggestions based on analysis
                if (analysis.priority_level === 'urgent') {
                    this.queueUrgentNotification(note);
                }
                
                if (analysis.actionable_items.length > 0) {
                    this.queueActionableItemsSuggestion(note, analysis.actionable_items);
                }
            }
        } catch (error) {
            console.error('Background analysis failed:', error);
        }
    }

    // Smart title detection
    needsSmartTitle(title) {
        if (!title || title.trim() === '') return true;
        
        const genericTitles = [
            'new note', 'untitled', 'note', 'document', 'draft',
            'meeting', 'idea', 'thought', 'reminder', 'todo'
        ];
        
        return genericTitles.some(generic => 
            title.toLowerCase().includes(generic) || title.length < 5
        );
    }

    // Apply tag suggestions
    async applyTagSuggestions(note, tagSuggestions) {
        for (const tagSuggestion of tagSuggestions) {
            // Check if tag exists
            let existingTag = this.app.tags.find(t => t.name.toLowerCase() === tagSuggestion.name.toLowerCase());
            
            if (!existingTag) {
                // Create new tag
                const newTag = {
                    id: this.generateId(),
                    name: tagSuggestion.name,
                    color: tagSuggestion.color || this.getRandomTagColor()
                };
                this.app.tags.push(newTag);
                existingTag = newTag;
            }
            
            // Add tag to note if not already present
            if (!note.tags.includes(existingTag.id)) {
                note.tags.push(existingTag.id);
            }
        }
    }

    // Apply notebook suggestion
    applyNotebookSuggestion(note, suggestion) {
        if (suggestion.is_new) {
            // Create new notebook
            const newNotebook = {
                id: this.generateId(),
                name: suggestion.suggested_notebook,
                createdAt: new Date().toISOString()
            };
            this.app.notebooks.push(newNotebook);
            note.notebookId = newNotebook.id;
        } else {
            // Find existing notebook
            const existingNotebook = this.app.notebooks.find(nb => 
                nb.name.toLowerCase() === suggestion.suggested_notebook.toLowerCase()
            );
            if (existingNotebook) {
                note.notebookId = existingNotebook.id;
            }
        }
    }

    // Show title suggestions UI
    showTitleSuggestions(note, suggestions) {
        const suggestionPanel = this.createSuggestionPanel('Title Suggestions', suggestions, (selectedTitle) => {
            note.title = selectedTitle;
            document.getElementById('note-title-input').value = selectedTitle;
            this.closeSuggestionPanel();
        });
        
        this.showSuggestionPanel(suggestionPanel);
    }

    // Show tag suggestions UI
    showTagSuggestions(note, suggestions) {
        const tagElements = suggestions.map(tag => ({
            display: `${tag.name} <span style="color: ${tag.color}">●</span>`,
            value: tag,
            reason: tag.reason
        }));
        
        const suggestionPanel = this.createMultiSelectSuggestionPanel(
            'Smart Tag Suggestions',
            tagElements,
            (selectedTags) => {
                this.applyTagSuggestions(note, selectedTags);
                this.closeSuggestionPanel();
                // Update UI
                this.updateTagSelector();
            }
        );
        
        this.showSuggestionPanel(suggestionPanel);
    }

    // Show notebook suggestions UI
    showNotebookSuggestion(note, suggestion) {
        const message = `AI suggests categorizing this note under "${suggestion.suggested_notebook}" (${Math.round(suggestion.confidence * 100)}% confidence)\n\nReason: ${suggestion.reason}`;
        
        if (confirm(message)) {
            this.applyNotebookSuggestion(note, suggestion);
            // Update UI
            document.getElementById('note-notebook-select').value = note.notebookId;
        }
    }

    // Show content enhancement suggestions
    showContentEnhancement(note, enhancement) {
        const enhancementPanel = this.createContentEnhancementPanel(enhancement, (action) => {
            if (action === 'apply') {
                document.getElementById('note-content-input').innerHTML = enhancement.enhanced_content;
            } else if (action === 'view_suggestions') {
                this.showContentSuggestionsList(enhancement.suggestions);
            }
            this.closeSuggestionPanel();
        });
        
        this.showSuggestionPanel(enhancementPanel);
    }
    
    // Create content enhancement panel
    createContentEnhancementPanel(enhancement, onAction) {
        const panel = document.createElement('div');
        panel.className = 'ai-suggestion-panel content-enhancement';
        panel.innerHTML = `
            <div class="ai-suggestion-header">
                <h3><i class="fas fa-magic"></i> Content Enhancement</h3>
                <button class="ai-close-btn">&times;</button>
            </div>
            <div class="ai-suggestion-content">
                <div class="enhancement-preview">
                    <h4>Enhanced Content Preview:</h4>
                    <div class="preview-content">${enhancement.enhanced_content}</div>
                </div>
                ${enhancement.suggestions && enhancement.suggestions.length > 0 ? `
                    <div class="enhancement-suggestions">
                        <h4>Additional Suggestions:</h4>
                        <ul>
                            ${enhancement.suggestions.map(s => `<li>${s}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <div class="enhancement-actions">
                    <button class="btn btn-primary" id="apply-enhancement">Apply Enhancement</button>
                    <button class="btn btn-secondary" id="view-suggestions">View Suggestions</button>
                    <button class="btn btn-secondary" id="cancel-enhancement">Cancel</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        panel.querySelector('#apply-enhancement').addEventListener('click', () => onAction('apply'));
        panel.querySelector('#view-suggestions').addEventListener('click', () => onAction('view_suggestions'));
        panel.querySelector('#cancel-enhancement').addEventListener('click', () => this.closeSuggestionPanel());
        panel.querySelector('.ai-close-btn').addEventListener('click', () => this.closeSuggestionPanel());
        
        return panel;
    }
    
    // Show content suggestions list
    showContentSuggestionsList(suggestions) {
        const suggestionPanel = this.createSuggestionPanel('Content Suggestions', suggestions, (selectedSuggestion) => {
            // Add suggestion to current content
            const contentInput = document.getElementById('note-content-input');
            const currentContent = contentInput.innerHTML;
            contentInput.innerHTML = currentContent + '<br><br>' + selectedSuggestion;
            this.closeSuggestionPanel();
        });
        
        this.showSuggestionPanel(suggestionPanel);
    }

    // Create suggestion panel
    createSuggestionPanel(title, suggestions, onSelect) {
        const panel = document.createElement('div');
        panel.className = 'ai-suggestion-panel';
        panel.innerHTML = `
            <div class="ai-suggestion-header">
                <h3><i class="fas fa-robot"></i> ${title}</h3>
                <button class="ai-close-btn">&times;</button>
            </div>
            <div class="ai-suggestion-content">
                ${suggestions.map((suggestion, index) => `
                    <div class="ai-suggestion-item" data-index="${index}">
                        <span class="suggestion-text">${suggestion}</span>
                        <button class="btn-select">Select</button>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add event listeners
        panel.querySelectorAll('.btn-select').forEach((btn, index) => {
            btn.addEventListener('click', () => onSelect(suggestions[index]));
        });
        
        panel.querySelector('.ai-close-btn').addEventListener('click', () => {
            this.closeSuggestionPanel();
        });
        
        return panel;
    }

    // Create multi-select suggestion panel
    createMultiSelectSuggestionPanel(title, suggestions, onSelect) {
        const panel = document.createElement('div');
        panel.className = 'ai-suggestion-panel multi-select';
        panel.innerHTML = `
            <div class="ai-suggestion-header">
                <h3><i class="fas fa-robot"></i> ${title}</h3>
                <button class="ai-close-btn">&times;</button>
            </div>
            <div class="ai-suggestion-content">
                ${suggestions.map((suggestion, index) => `
                    <div class="ai-suggestion-item" data-index="${index}">
                        <input type="checkbox" id="suggestion-${index}" value="${index}">
                        <label for="suggestion-${index}">
                            <span class="suggestion-text">${suggestion.display}</span>
                            ${suggestion.reason ? `<small class="suggestion-reason">${suggestion.reason}</small>` : ''}
                        </label>
                    </div>
                `).join('')}
                <div class="ai-suggestion-actions">
                    <button class="btn btn-primary" id="apply-selected">Apply Selected</button>
                    <button class="btn btn-secondary" id="cancel-suggestions">Cancel</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        panel.querySelector('#apply-selected').addEventListener('click', () => {
            const selected = Array.from(panel.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => suggestions[parseInt(checkbox.value)].value);
            onSelect(selected);
        });
        
        panel.querySelector('#cancel-suggestions').addEventListener('click', () => {
            this.closeSuggestionPanel();
        });
        
        panel.querySelector('.ai-close-btn').addEventListener('click', () => {
            this.closeSuggestionPanel();
        });
        
        return panel;
    }

    // Show suggestion panel
    showSuggestionPanel(panel) {
        // Remove any existing panel
        this.closeSuggestionPanel();
        
        // Add to DOM
        document.body.appendChild(panel);
        
        // Animate in
        if (typeof gsap !== 'undefined') {
            gsap.from(panel, {
                scale: 0.8,
                opacity: 0,
                duration: 0.3,
                ease: "back.out(1.7)"
            });
        }
    }

    // Close suggestion panel
    closeSuggestionPanel() {
        const existingPanel = document.querySelector('.ai-suggestion-panel');
        if (existingPanel) {
            if (typeof gsap !== 'undefined') {
                gsap.to(existingPanel, {
                    scale: 0.8,
                    opacity: 0,
                    duration: 0.2,
                    ease: "power2.in",
                    onComplete: () => existingPanel.remove()
                });
            } else {
                existingPanel.remove();
            }
        }
    }

    // Start autonomous mode
    startAutonomousMode() {
        // Periodic analysis and suggestions
        setInterval(() => {
            this.performAutonomousAnalysis();
        }, 300000); // Every 5 minutes
        
        // Welcome suggestion
        setTimeout(() => {
            this.showWelcomeSuggestion();
        }, 5000);
    }

    // Perform autonomous analysis
    async performAutonomousAnalysis() {
        if (!this.ai.isAvailable() || this.app.notes.length === 0) return;
        
        try {
            const suggestions = await this.ai.getAutonomousSuggestions(
                this.app.notes, 
                this.app.notebooks, 
                this.app.tags
            );
            
            if (suggestions.length > 0) {
                this.showAutonomousSuggestions(suggestions);
            }
        } catch (error) {
            console.error('Autonomous analysis failed:', error);
        }
    }

    // Show autonomous suggestions
    showAutonomousSuggestions(suggestions) {
        // Show high-priority suggestions as notifications
        const highPriority = suggestions.filter(s => s.priority === 'high');
        if (highPriority.length > 0) {
            this.showAINotification(highPriority[0]);
        }
        
        // Store all suggestions for later access
        this.suggestionQueue.push(...suggestions);
        this.updateAISuggestionBadge();
    }
    
    // Show pending suggestions
    showPendingSuggestions() {
        if (this.suggestionQueue.length === 0) {
            this.showCustomNotification({
                title: 'No Pending Suggestions',
                description: 'All caught up! Keep creating great notes.'
            });
            return;
        }
        
        const panel = this.createSuggestionListPanel(this.suggestionQueue);
        this.showSuggestionPanel(panel);
    }
    
    // Create suggestion list panel
    createSuggestionListPanel(suggestions) {
        const panel = document.createElement('div');
        panel.className = 'ai-suggestion-panel suggestion-list';
        panel.innerHTML = `
            <div class="ai-suggestion-header">
                <h3><i class="fas fa-robot"></i> AI Suggestions</h3>
                <button class="ai-close-btn">&times;</button>
            </div>
            <div class="ai-suggestion-content">
                ${suggestions.map((suggestion, index) => `
                    <div class="ai-suggestion-item expanded" data-index="${index}">
                        <div class="suggestion-main">
                            <h4 class="suggestion-title">${suggestion.title}</h4>
                            <p class="suggestion-description">${suggestion.description}</p>
                        </div>
                        <div class="suggestion-actions">
                            <span class="priority-badge priority-${suggestion.priority}">${suggestion.priority}</span>
                            <button class="btn-action" data-action="${suggestion.action}" data-index="${index}">Apply</button>
                            <button class="btn-dismiss" data-index="${index}">Dismiss</button>
                        </div>
                    </div>
                `).join('')}
                <div class="suggestion-footer">
                    <button class="btn btn-secondary" id="dismiss-all-suggestions">Dismiss All</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        panel.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const action = btn.dataset.action;
                this.executeSuggestionAction(suggestions[index], action);
                this.suggestionQueue.splice(index, 1);
                this.closeSuggestionPanel();
                this.updateAISuggestionBadge();
            });
        });
        
        panel.querySelectorAll('.btn-dismiss').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.suggestionQueue.splice(index, 1);
                this.closeSuggestionPanel();
                this.updateAISuggestionBadge();
            });
        });
        
        panel.querySelector('#dismiss-all-suggestions').addEventListener('click', () => {
            this.suggestionQueue = [];
            this.closeSuggestionPanel();
            this.updateAISuggestionBadge();
        });
        
        panel.querySelector('.ai-close-btn').addEventListener('click', () => {
            this.closeSuggestionPanel();
        });
        
        return panel;
    }
    
    // Execute suggestion action
    executeSuggestionAction(suggestion, action) {
        switch (action) {
            case 'cleanup_notes':
                this.performNoteCleanup(suggestion.data);
                break;
            case 'create_note':
                this.createNoteFromSuggestion(suggestion);
                break;
            case 'create_from_template':
                this.createNoteFromTemplate(suggestion.data);
                break;
            case 'explore_topic':
                this.exploreTopic(suggestion.data);
                break;
            default:
                console.log('Unknown suggestion action:', action);
        }
    }
    
    // Perform note cleanup
    performNoteCleanup(data) {
        const noteIds = data.notes;
        const notes = this.app.notes.filter(n => noteIds.includes(n.id));
        
        // Show cleanup options
        const confirmMessage = `Found ${notes.length} notes that may need attention:\n\n${notes.map(n => `- ${n.title}`).join('\n')}\n\nWhat would you like to do?`;
        
        if (confirm(confirmMessage + '\n\nClick OK to delete them, Cancel to keep them.')) {
            // Remove notes
            this.app.notes = this.app.notes.filter(n => !noteIds.includes(n.id));
            window.NoteVaultApp.saveNotes();
            window.NoteVaultApp.renderNotes();
            window.NoteVaultApp.showToast(`Cleaned up ${notes.length} notes`, 'success');
        }
    }
    
    // Create note from suggestion
    createNoteFromSuggestion(suggestion) {
        const newNote = {
            id: this.generateId(),
            title: suggestion.title,
            content: suggestion.description,
            notebookId: '',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.app.notes.unshift(newNote);
        window.NoteVaultApp.saveNotes();
        window.NoteVaultApp.renderNotes();
        window.NoteVaultApp.showToast('Created note from AI suggestion', 'success');
    }
    
    // Create note from template
    async createNoteFromTemplate(templateData) {
        if (this.aiFeatures && templateData.template) {
            const template = await this.aiFeatures.generateNoteTemplate(templateData);
            if (template) {
                let content = template.sections.map(section => 
                    `<h3>${section.heading}</h3>\n<p>${section.content}</p>`
                ).join('\n\n');
                
                const newNote = {
                    id: this.generateId(),
                    title: template.title,
                    content: content,
                    notebookId: '',
                    tags: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                this.app.notes.unshift(newNote);
                window.NoteVaultApp.saveNotes();
                window.NoteVaultApp.renderNotes();
                window.NoteVaultApp.showToast('Created note from template', 'success');
            }
        }
    }
    
    // Explore topic
    exploreTopic(topicData) {
        const newNote = {
            id: this.generateId(),
            title: `Exploring: ${topicData.topic}`,
            content: `<h3>Topic: ${topicData.topic}</h3>\n<p>${topicData.description}</p>\n\n<h3>Areas to explore:</h3>\n<ul>\n${topicData.suggestions.map(s => `<li>${s}</li>`).join('\n')}\n</ul>\n\n<h3>My thoughts:</h3>\n<p>[Add your thoughts here...]</p>`,
            notebookId: '',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.app.notes.unshift(newNote);
        window.NoteVaultApp.saveNotes();
        window.NoteVaultApp.renderNotes();
        window.NoteVaultApp.showToast('Created exploration note', 'success');
    }

    // Show AI notification
    showAINotification(suggestion) {
        if (typeof chrome !== 'undefined' && chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'NoteVault AI Suggestion',
                message: suggestion.title + '\n\n' + suggestion.description
            });
        } else {
            // Fallback to custom notification
            this.showCustomNotification(suggestion);
        }
    }

    // Show custom notification
    showCustomNotification(suggestion) {
        const notification = document.createElement('div');
        notification.className = 'ai-notification';
        notification.innerHTML = `
            <div class="ai-notification-content">
                <div class="ai-notification-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="ai-notification-text">
                    <h4>${suggestion.title}</h4>
                    <p>${suggestion.description}</p>
                </div>
                <button class="ai-notification-close">&times;</button>
            </div>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
        
        // Close button
        notification.querySelector('.ai-notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // Animate in
        if (typeof gsap !== 'undefined') {
            gsap.from(notification, {
                x: 300,
                opacity: 0,
                duration: 0.5,
                ease: "power2.out"
            });
        }
    }

    // Update note analysis UI
    updateNoteAnalysisUI(note, analysis) {
        // Store analysis in note and show notification
        note.aiAnalysis = analysis;
        note.lastAnalyzed = new Date().toISOString();
        
        // Show brief notification about analysis completion
        this.showCustomNotification({
            title: 'AI Analysis Complete',
            description: `Quality: ${analysis.quality_score}/10 | Priority: ${analysis.priority_level} | ${analysis.main_themes.length} themes identified`
        });
        
        // Add small insights badge to the note editor if it's currently open
        const editor = document.getElementById('note-editor-modal');
        if (editor && editor.classList.contains('active')) {
            const currentNote = this.app.editingNote;
            if (currentNote && currentNote.id === note.id) {
                this.addAnalysisBadge(analysis);
            }
        }
    }
    
    // Add analysis badge to note editor
    addAnalysisBadge(analysis) {
        // Remove existing badge
        const existingBadge = document.getElementById('ai-analysis-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Create new badge
        const badge = document.createElement('div');
        badge.id = 'ai-analysis-badge';
        badge.className = 'ai-analysis-badge';
        badge.innerHTML = `
            <i class="fas fa-brain"></i>
            <span class="badge-text">Analysis: ${analysis.quality_score}/10</span>
            <button class="badge-button" id="view-full-analysis">View Details</button>
        `;
        
        // Add to editor header
        const editorHeader = document.querySelector('.note-editor-header');
        if (editorHeader) {
            editorHeader.appendChild(badge);
            
            // Add click handler
            badge.querySelector('#view-full-analysis').addEventListener('click', () => {
                this.showAnalysisInsights(analysis);
            });
        }
    }

    // Show analysis insights in modal
    showAnalysisInsights(analysis) {
        const analysisModal = this.createAnalysisModal(analysis);
        this.showSuggestionPanel(analysisModal);
    }
    
    // Create analysis modal
    createAnalysisModal(analysis) {
        const modal = document.createElement('div');
        modal.className = 'ai-suggestion-panel analysis-modal';
        modal.innerHTML = `
            <div class="ai-suggestion-header">
                <h3><i class="fas fa-brain"></i> AI Analysis Results</h3>
                <button class="ai-close-btn">&times;</button>
            </div>
            <div class="ai-suggestion-content">
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <div class="analysis-metric">
                            <span class="metric-value">${analysis.quality_score}/10</span>
                            <span class="metric-label">Quality Score</span>
                        </div>
                    </div>
                    <div class="analysis-card">
                        <div class="analysis-metric">
                            <span class="metric-value priority-${analysis.priority_level}">${analysis.priority_level}</span>
                            <span class="metric-label">Priority Level</span>
                        </div>
                    </div>
                    <div class="analysis-card">
                        <div class="analysis-metric">
                            <span class="metric-value">${analysis.emotional_tone}</span>
                            <span class="metric-label">Emotional Tone</span>
                        </div>
                    </div>
                </div>
                
                ${analysis.main_themes.length > 0 ? `
                    <div class="analysis-section">
                        <h4><i class="fas fa-tags"></i> Main Themes</h4>
                        <div class="theme-tags">
                            ${analysis.main_themes.map(theme => `<span class="theme-tag">${theme}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${analysis.actionable_items.length > 0 ? `
                    <div class="analysis-section">
                        <h4><i class="fas fa-tasks"></i> Action Items</h4>
                        <ul class="action-items">
                            ${analysis.actionable_items.map(item => `<li><i class="fas fa-arrow-right"></i> ${item}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${analysis.suggested_improvements.length > 0 ? `
                    <div class="analysis-section">
                        <h4><i class="fas fa-lightbulb"></i> Suggested Improvements</h4>
                        <ul class="improvement-list">
                            ${analysis.suggested_improvements.map(improvement => `<li><i class="fas fa-plus-circle"></i> ${improvement}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="analysis-section">
                    <h4><i class="fas fa-robot"></i> AI Insights</h4>
                    <p class="insight-text">${analysis.insights}</p>
                </div>
                
                ${analysis.related_topics.length > 0 ? `
                    <div class="analysis-section">
                        <h4><i class="fas fa-network-wired"></i> Related Topics</h4>
                        <div class="related-topics">
                            ${analysis.related_topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="analysis-actions">
                    <button class="btn btn-primary" id="apply-insights">Apply Suggestions</button>
                    <button class="btn btn-secondary" id="save-analysis">Save Analysis</button>
                    <button class="btn btn-secondary" id="close-analysis">Close</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        modal.querySelector('#apply-insights').addEventListener('click', () => {
            this.applyAnalysisInsights(analysis);
            this.closeSuggestionPanel();
        });
        
        modal.querySelector('#save-analysis').addEventListener('click', () => {
            this.saveAnalysisToNote(analysis);
            window.NoteVaultApp.showToast('Analysis saved to note', 'success');
        });
        
        modal.querySelector('#close-analysis').addEventListener('click', () => {
            this.closeSuggestionPanel();
        });
        
        modal.querySelector('.ai-close-btn').addEventListener('click', () => {
            this.closeSuggestionPanel();
        });
        
        return modal;
    }
    
    // Apply analysis insights to note
    applyAnalysisInsights(analysis) {
        const titleInput = document.getElementById('note-title-input');
        const contentInput = document.getElementById('note-content-input');
        
        // Add suggested improvements to content
        if (analysis.suggested_improvements.length > 0) {
            const improvements = analysis.suggested_improvements.map(imp => `• ${imp}`).join('\n');
            const currentContent = contentInput.innerHTML;
            contentInput.innerHTML = currentContent + `\n\n<h3>💡 AI Suggestions</h3>\n<p>${improvements.replace(/\n/g, '<br>')}</p>`;
        }
        
        // Add action items if any
        if (analysis.actionable_items.length > 0) {
            const actionItems = analysis.actionable_items.map(item => `☐ ${item}`).join('\n');
            const currentContent = contentInput.innerHTML;
            contentInput.innerHTML = currentContent + `\n\n<h3>✅ Action Items</h3>\n<p>${actionItems.replace(/\n/g, '<br>')}</p>`;
        }
        
        window.NoteVaultApp.showToast('Analysis insights applied to note', 'success');
    }
    
    // Save analysis to note as metadata
    saveAnalysisToNote(analysis) {
        if (this.app.editingNote) {
            this.app.editingNote.aiAnalysis = analysis;
            this.app.editingNote.lastAnalyzed = new Date().toISOString();
        }
    }

    // Show welcome suggestion
    showWelcomeSuggestion() {
        const welcomeSuggestion = {
            title: "Welcome to AI-Enhanced NoteVault!",
            description: "I'm your AI assistant. I can help you with smart titling, tagging, content enhancement, and proactive suggestions. Try creating a note and see what I can do!"
        };
        
        this.showCustomNotification(welcomeSuggestion);
    }

    // Update AI suggestion badge
    updateAISuggestionBadge() {
        // Add or update badge showing number of pending suggestions
        let badge = document.getElementById('ai-suggestions-badge');
        if (!badge && this.suggestionQueue.length > 0) {
            badge = document.createElement('div');
            badge.id = 'ai-suggestions-badge';
            badge.className = 'ai-suggestions-badge';
            badge.textContent = this.suggestionQueue.length;
            
            // Add to header or appropriate location
            const header = document.querySelector('.app-header');
            if (header) {
                header.appendChild(badge);
            }
        } else if (badge) {
            badge.textContent = this.suggestionQueue.length;
            badge.style.display = this.suggestionQueue.length > 0 ? 'block' : 'none';
        }
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    getRandomTagColor() {
        const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateTagSelector() {
        if (this.app && this.app.updateTagSelector) {
            this.app.updateTagSelector();
        }
    }

    // Public methods for manual AI operations
    async manualAnalyzeNote(note) {
        return await this.ai.analyzeNote(note);
    }

    async manualEnhanceContent(note) {
        return await this.ai.enhanceContent(note);
    }

    async manualFindRelatedNotes(note, allNotes) {
        return await this.ai.findRelatedNotes(note, allNotes);
    }
    
    // New AI action methods
    async explainContent(content, complexity = 'simple') {
        return await this.ai.explainContent(content, complexity);
    }
    
    async expandContent(content, direction = 'comprehensive') {
        return await this.ai.expandContent(content, direction);
    }
    
    async brainstormIdeas(content, type = 'creative') {
        return await this.ai.brainstormIdeas(content, type);
    }
    
    async continueWriting(content, style = 'natural', length = 'medium') {
        return await this.ai.continueWriting(content, style, length);
    }
    
    async humanizeContent(content) {
        return await this.ai.humanizeContent(content);
    }
    
    async repurposeContent(content, targetFormat = 'multiple') {
        return await this.ai.repurposeContent(content, targetFormat);
    }

    // Get AI status
    getAIStatus() {
        const baseStatus = {
            available: this.ai.isAvailable(),
            autoEnhanceEnabled: this.autoEnhanceEnabled,
            smartTaggingEnabled: this.smartTaggingEnabled,
            autonomousMode: this.autonomousMode,
            pendingSuggestions: this.suggestionQueue.length
        };
        
        if (this.aiFeatures) {
            return {
                ...baseStatus,
                advancedFeatures: this.aiFeatures.getStatus()
            };
        }
        
        return baseStatus;
    }

    // Enable/disable features
    setFeatureEnabled(feature, enabled) {
        switch (feature) {
            case 'autoEnhance':
                this.autoEnhanceEnabled = enabled;
                break;
            case 'smartTagging':
                this.smartTaggingEnabled = enabled;
                break;
            case 'autonomousMode':
                this.autonomousMode = enabled;
                if (enabled) {
                    this.startAutonomousMode();
                }
                break;
        }
    }
    
    // Get selected text from note editor
    getSelectedText() {
        const contentInput = document.getElementById('note-content-input');
        if (!contentInput) return '';
        
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (contentInput.contains(range.commonAncestorContainer)) {
                return selection.toString().trim();
            }
        }
        
        return '';
    }
    
    // Get current note content for AI actions
    getCurrentContent() {
        const contentInput = document.getElementById('note-content-input');
        return contentInput ? this.ai.stripHTML(contentInput.innerHTML) : '';
    }
}

// Export for use in other modules
window.NoteVaultAIService = NoteVaultAIService;