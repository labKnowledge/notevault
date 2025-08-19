// AI Actions Extension for NoteVaultAIService
// This file extends the AI service with additional action methods

// Wait for the service to be available and then extend it
(function() {
    function extendAIService() {
        if (typeof window.NoteVaultAIService !== 'function') {
            console.warn('NoteVaultAIService not found, retrying in 100ms...');
            setTimeout(extendAIService, 100);
            return;
        }
        
        console.log('✅ Extending NoteVaultAIService with action methods...');
    // Show AI action result in modal
    window.NoteVaultAIService.prototype.showActionResult = function(actionType, result, originalContent) {
        console.log('📦 Showing action result for:', actionType, result);
        
        // Give a proper delay to ensure loading modal is visible before replacing it
        setTimeout(() => {
            console.log('📦 Hiding loading indicator before showing result');
            this.hideProcessingIndicator();
            
            // Small additional delay for smooth transition
            setTimeout(() => {
                const resultModal = this.createActionResultModal(actionType, result, originalContent);
                console.log('📦 Created result modal, showing it');
                this.showSuggestionPanel(resultModal);
            }, 200);
        }, 800); // Longer delay to ensure loading is properly visible
    };

    // Show loading indicator for AI processing
    window.NoteVaultAIService.prototype.showProcessingIndicator = function(actionType, message = 'AI is processing...') {
        console.log('⏳ Showing processing indicator for:', actionType);
        const loadingModal = document.createElement('div');
        loadingModal.className = 'ai-suggestion-panel ai-loading-panel';
        loadingModal.id = 'ai-loading-modal';
        
        const actionNames = {
            enhancement: "Enhancing content",
            explain: 'Explaining content',
            expand: 'Expanding content',
            brainstorm: 'Brainstorming ideas',
            write: 'Continuing writing',
            humanize: 'Humanizing content',
            repurpose: 'Repurposing content',
            analyze: 'Analyzing note'
        };
        
        const actionMessage = actionNames[actionType] || message;
        
        loadingModal.innerHTML = `
            <div class="ai-suggestion-header">
                <h3><i class="fas fa-robot ai-processing-icon"></i> ${actionMessage}</h3>
                <button class="ai-close-btn">&times;</button>
            </div>
            <div class="ai-suggestion-content">
                <div class="ai-loading-container">
                    <div class="ai-loading-spinner">
                        <div class="ai-spinner-ring"></div>
                        <div class="ai-spinner-ring"></div>
                        <div class="ai-spinner-ring"></div>
                    </div>
                    <div class="ai-loading-text">
                        <p class="loading-message">${actionMessage}...</p>
                        <div class="loading-dots">
                            <span>●</span><span>●</span><span>●</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add close button handler for loading modal too
        // setTimeout(() => {
        //     const closeBtn = loadingModal.querySelector('.ai-close-btn');
        //     if (closeBtn) {
        //         closeBtn.addEventListener('click', () => {
        //             console.log('❌ User clicked close on loading modal');
        //             this.closeSuggestionPanel();
        //         });
        //     }
        // }, 0);
        
        this.showSuggestionPanel(loadingModal);
        return loadingModal;
    };

    // Hide processing indicator
    window.NoteVaultAIService.prototype.hideProcessingIndicator = function() {
        console.log('✅ Hiding processing indicator');
        const loadingModal = document.getElementById('ai-loading-modal');
        if (loadingModal) {
            console.log('✅ Found loading modal, closing it');
            this.closeSuggestionPanel();
        } else {
            console.warn('⚠️ Loading modal not found when trying to hide');
        }
    };
    
    // Create action result modal
    window.NoteVaultAIService.prototype.createActionResultModal = function(actionType, result, originalContent) {
        const modal = document.createElement('div');
        modal.className = 'ai-suggestion-panel ai-action-panel';
        
        const actionConfig = {
            explain: {
                title: 'Content Explanation',
                icon: 'fas fa-lightbulb',
                color: '#ffaa00'
            },
            expand: {
                title: 'Content Expansion', 
                icon: 'fas fa-expand-arrows-alt',
                color: '#00ff88'
            },
            brainstorm: {
                title: 'Brainstorm Ideas',
                icon: 'fas fa-brain', 
                color: '#ff6b9d'
            },
            write: {
                title: 'Continue Writing',
                icon: 'fas fa-pen',
                color: '#4fc3f7'
            },
            humanize: {
                title: 'Humanize Content',
                icon: 'fas fa-user-friends',
                color: '#81c784'
            },
            repurpose: {
                title: 'Repurpose Content',
                icon: 'fas fa-recycle',
                color: '#9575cd'
            }
        };
        
        const config = actionConfig[actionType] || actionConfig.explain;
        
        modal.innerHTML = `
            <div class="ai-suggestion-header">
                <h3><i class="${config.icon}" style="color: ${config.color}"></i> ${config.title}</h3>
                <button class="ai-close-btn">&times;</button>
            </div>
            <div class="ai-suggestion-content">
                ${this.generateActionResultContent(actionType, result, originalContent)}
                <div class="action-result-actions">
                    ${this.generateActionButtons(actionType, result)}
                </div>
            </div>
        `;
        
        // Add event listeners for action buttons
        this.attachActionListeners(modal, actionType, result, originalContent);
        
        modal.querySelector('.ai-close-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeSuggestionPanel();
        });
        
        return modal;
    };
    
    // Generate content for different action types
    window.NoteVaultAIService.prototype.generateActionResultContent = function(actionType, result, originalContent) {
        switch (actionType) {
            case 'explain':
                return `
                    <div class="action-result-content">
                        <h4><i class="fas fa-lightbulb"></i> Simplified Explanation</h4>
                        <p>${result.explanation}</p>
                        
                        <h4><i class="fas fa-key"></i> Key Concepts</h4>
                        <ul>${result.key_concepts.map(concept => `<li><i class="fas fa-circle" style="font-size: 0.5rem; color: #667eea; margin-right: 8px;"></i>${concept}</li>`).join('')}</ul>
                        
                        ${result.analogies && result.analogies.length > 0 ? `
                            <h4><i class="fas fa-link"></i> Analogies</h4>
                            <ul>${result.analogies.map(analogy => `<li><i class="fas fa-arrow-right" style="color: #667eea; margin-right: 8px;"></i>${analogy}</li>`).join('')}</ul>
                        ` : ''}
                        
                        ${result.examples && result.examples.length > 0 ? `
                            <h4><i class="fas fa-list-alt"></i> Examples</h4>
                            <ul>${result.examples.map(example => `<li><i class="fas fa-check" style="color: #48bb78; margin-right: 8px;"></i>${example}</li>`).join('')}</ul>
                        ` : ''}
                    </div>
                `;
                
            case 'expand':
                return `
                    <div class="action-stats">
                        <div class="stat-item">
                            <span class="stat-value">${result.word_count_increase || 0}</span>
                            <span class="stat-label">Words Added</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${result.added_sections?.length || 0}</span>
                            <span class="stat-label">New Sections</span>
                        </div>
                    </div>
                    <div class="action-result-content">
                        <h4><i class="fas fa-expand-arrows-alt"></i> Expanded Content</h4>
                        <div class="action-preview">${result.expanded_content}</div>
                        
                        ${result.added_sections && result.added_sections.length > 0 ? `
                            <h4><i class="fas fa-plus-circle"></i> Added Sections</h4>
                            <ul>${result.added_sections.map(section => `<li><i class="fas fa-chevron-right" style="color: #667eea; margin-right: 8px;"></i>${section}</li>`).join('')}</ul>
                        ` : ''}
                    </div>
                `;
                
            case 'brainstorm':
                return `
                    <div class="action-result-content">
                        <h4><i class="fas fa-lightbulb" style="color: #f6e05e;"></i> Ideas</h4>
                        <ul>${result.ideas.map(idea => `<li><i class="fas fa-star" style="color: #f6e05e; margin-right: 8px;"></i>${idea}</li>`).join('')}</ul>
                        
                        ${result.connections && result.connections.length > 0 ? `
                            <h4><i class="fas fa-link" style="color: #4299e1;"></i> Connections</h4>
                            <ul>${result.connections.map(conn => `<li><i class="fas fa-arrow-right" style="color: #4299e1; margin-right: 8px;"></i>${conn}</li>`).join('')}</ul>
                        ` : ''}
                        
                        ${result.questions && result.questions.length > 0 ? `
                            <h4><i class="fas fa-question-circle" style="color: #ed8936;"></i> Questions to Explore</h4>
                            <ul>${result.questions.map(q => `<li><i class="fas fa-question" style="color: #ed8936; margin-right: 8px;"></i>${q}</li>`).join('')}</ul>
                        ` : ''}
                        
                        ${result.next_steps && result.next_steps.length > 0 ? `
                            <h4><i class="fas fa-rocket" style="color: #38b2ac;"></i> Next Steps</h4>
                            <ul>${result.next_steps.map(step => `<li><i class="fas fa-chevron-right" style="color: #38b2ac; margin-right: 8px;"></i>${step}</li>`).join('')}</ul>
                        ` : ''}
                    </div>
                `;
                
            case 'write':
                return `
                    <div class="action-result-content">
                        <h4><i class="fas fa-pen"></i> Continued Content</h4>
                        <div class="action-preview">${originalContent}<span style="background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%); padding: 2px 4px; border-radius: 4px; font-weight: 500;">${result.continued_content}</span></div>
                        
                        <h4><i class="fas fa-analytics"></i> Writing Analysis</h4>
                        <div style="background: #f7fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea;">
                            <p><i class="fas fa-palette" style="color: #667eea; margin-right: 8px;"></i><strong>Style:</strong> ${result.writing_style}</p>
                            <p><i class="fas fa-volume-up" style="color: #667eea; margin-right: 8px;"></i><strong>Tone:</strong> ${result.tone_analysis}</p>
                            <p><i class="fas fa-compass" style="color: #667eea; margin-right: 8px;"></i><strong>Direction:</strong> ${result.suggested_direction}</p>
                        </div>
                    </div>
                `;
                
            case 'humanize':
                return `
                    <div class="action-stats">
                        <div class="stat-item">
                            <span class="stat-value">${result.relatability_score}/10</span>
                            <span class="stat-label">Relatability</span>
                        </div>
                    </div>
                    <div class="action-result-content">
                        <h4><i class="fas fa-user-friends" style="color: #48bb78;"></i> Humanized Content</h4>
                        <div class="action-preview">${result.humanized_content}</div>
                        
                        <h4><i class="fas fa-heart" style="color: #ed64a6;"></i> Personality Elements Added</h4>
                        <ul>${result.personality_elements.map(elem => `<li><i class="fas fa-smile" style="color: #ed64a6; margin-right: 8px;"></i>${elem}</li>`).join('')}</ul>
                        
                        ${result.conversational_touches && result.conversational_touches.length > 0 ? `
                            <h4><i class="fas fa-comments" style="color: #4299e1;"></i> Conversational Touches</h4>
                            <ul>${result.conversational_touches.map(touch => `<li><i class="fas fa-comment" style="color: #4299e1; margin-right: 8px;"></i>${touch}</li>`).join('')}</ul>
                        ` : ''}
                    </div>
                `;
                
            case 'repurpose':
                const formatIcons = {
                    social_media: 'fas fa-hashtag',
                    email: 'fas fa-envelope',
                    presentation: 'fas fa-presentation',
                    blog_post: 'fas fa-blog',
                    summary: 'fas fa-file-alt'
                };
                const audienceIcons = {
                    professional: 'fas fa-briefcase',
                    casual: 'fas fa-coffee',
                    academic: 'fas fa-graduation-cap'
                };
                return `
                    <div class="action-result-content">
                        <h4><i class="fas fa-recycle" style="color: #38b2ac;"></i> Format Variations</h4>
                        ${Object.entries(result.formats).map(([format, content]) => `
                            <div class="format-section">
                                <h5><i class="${formatIcons[format] || 'fas fa-file'}" style="color: #667eea; margin-right: 8px;"></i>${format.replace('_', ' ').toUpperCase()}</h5>
                                <div class="action-preview">${content}</div>
                            </div>
                        `).join('')}
                        
                        <h4><i class="fas fa-users" style="color: #ed8936;"></i> Audience Variations</h4>
                        ${Object.entries(result.audience_variations).map(([audience, content]) => `
                            <div class="format-section">
                                <h5><i class="${audienceIcons[audience] || 'fas fa-user'}" style="color: #ed8936; margin-right: 8px;"></i>${audience.toUpperCase()}</h5>
                                <div class="action-preview">${content.substring(0, 200)}${content.length > 200 ? '...' : ''}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
            default:
                return `<div class="action-result-content"><p>Result processed successfully.</p></div>`;
        }
    };
    
    // Generate action buttons
    window.NoteVaultAIService.prototype.generateActionButtons = function(actionType, result) {
        const buttons = [
            '<button class="btn btn-primary" data-action="apply">Apply to Note</button>',
            '<button class="btn btn-secondary" data-action="copy">Copy Result</button>',
            '<button class="btn btn-secondary" data-action="save-separate">Save as New Note</button>'
        ];
        
        if (actionType === 'repurpose') {
            buttons.unshift('<button class="btn btn-primary" data-action="choose-format">Choose Format</button>');
        }
        
        return buttons.join('');
    };
    
    // Attach event listeners to action buttons
    window.NoteVaultAIService.prototype.attachActionListeners = function(modal, actionType, result, originalContent) {
        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (!action) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            switch (action) {
                case 'apply':
                    this.applyActionResult(actionType, result, originalContent);
                    break;
                case 'copy':
                    this.copyActionResult(actionType, result);
                    break;
                case 'save-separate':
                    this.saveActionAsNewNote(actionType, result, originalContent);
                    break;
                case 'choose-format':
                    this.showFormatSelector(result);
                    return; // Don't close modal
            }
            
            this.closeSuggestionPanel();
        });
        
        // Prevent modal from closing when clicking inside content area
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
                e.stopPropagation();
                this.closeSuggestionPanel();
            }
        });
    };
    
    // Apply action result to current note
    window.NoteVaultAIService.prototype.applyActionResult = function(actionType, result, originalContent) {
        const contentInput = document.getElementById('note-content-input');
        if (!contentInput) return;
        
        let newContent = '';
        
        switch (actionType) {
            case 'explain':
                newContent = originalContent + `\n\n<h3>Explanation</h3>\n<p>${result.explanation}</p>`;
                break;
            case 'expand':
                newContent = result.expanded_content;
                break;
            case 'brainstorm':
                newContent = originalContent + `\n\n<h3>Ideas</h3>\n<ul>\n${result.ideas.map(idea => `<li>${idea}</li>`).join('\n')}\n</ul>`;
                break;
            case 'write':
                newContent = originalContent + result.continued_content;
                break;
            case 'humanize':
                newContent = result.humanized_content;
                break;
            case 'repurpose':
                newContent = result.formats.blog_post || originalContent;
                break;
            default:
                newContent = originalContent;
        }
        
        contentInput.innerHTML = newContent;
        window.NoteVaultApp.showToast(`${actionType} result applied to note`, 'success');
    };
    
    // Copy action result to clipboard
    window.NoteVaultAIService.prototype.copyActionResult = async function(actionType, result) {
        let textToCopy = '';
        
        switch (actionType) {
            case 'explain':
                textToCopy = result.explanation;
                break;
            case 'expand':
                textToCopy = result.expanded_content;
                break;
            case 'brainstorm':
                textToCopy = result.ideas.join('\n');
                break;
            case 'write':
                textToCopy = result.continued_content;
                break;
            case 'humanize':
                textToCopy = result.humanized_content;
                break;
            case 'repurpose':
                textToCopy = Object.values(result.formats).join('\n\n---\n\n');
                break;
        }
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            window.NoteVaultApp.showToast('Copied to clipboard', 'success');
        } catch (error) {
            console.error('Failed to copy:', error);
            window.NoteVaultApp.showToast('Failed to copy to clipboard', 'error');
        }
    };
    
    // Save action result as new note
    window.NoteVaultAIService.prototype.saveActionAsNewNote = function(actionType, result, originalContent) {
        const titleMap = {
            enhancement: "Enhancement of",
            explain: 'Explanation of',
            expand: 'Expanded',
            brainstorm: 'Ideas for',
            write: 'Continued',
            humanize: 'Humanized',
            repurpose: 'Repurposed'
        };
        
        const originalTitle = document.getElementById('note-title-input')?.value || 'Untitled';
        const newTitle = `${titleMap[actionType] || 'AI Generated'} - ${originalTitle}`;
        
        let newContent = '';
        switch (actionType) {
            case 'explain':
                newContent = `<h2>Explanation</h2>\n<p>${result.explanation}</p>\n\n<h3>Original Content</h3>\n${originalContent}`;
                break;
            case 'expand':
                newContent = result.expanded_content;
                break;
            case 'brainstorm':
                newContent = `<h2>Brainstormed Ideas</h2>\n<ul>\n${result.ideas.map(idea => `<li>${idea}</li>`).join('\n')}\n</ul>\n\n<h3>Original Content</h3>\n${originalContent}`;
                break;
            case 'write':
                newContent = originalContent + result.continued_content;
                break;
            case 'humanize':
                newContent = result.humanized_content;
                break;
            case 'repurpose':
                newContent = `<h2>Repurposed Content</h2>\n\n${Object.entries(result.formats).map(([format, content]) => `<h3>${format.replace('_', ' ')}</h3>\n<p>${content}</p>`).join('\n\n')}`;
                break;
        }
        
        const newNote = {
            id: this.generateId(),
            title: newTitle,
            content: newContent,
            notebookId: '',
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to notes array
        if (this.app && this.app.notes) {
            this.app.notes.unshift(newNote);
        } else if (window.NoteVaultApp && window.NoteVaultApp.notes) {
            window.NoteVaultApp.notes.unshift(newNote);
        }
        
        // Save and update UI
        if (window.NoteVaultApp) {
            window.NoteVaultApp.saveNotes();
            window.NoteVaultApp.renderNotes();
            window.NoteVaultApp.showToast('Saved as new note', 'success');
        }
    };
    
    } // end extendAIService function
    
    // Try to extend immediately, or wait if service isn't ready
    extendAIService();
})(); // end IIFE