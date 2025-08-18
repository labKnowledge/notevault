// AI Actions Extension for NoteVaultAIService
// This file extends the AI service with additional action methods

// Extend NoteVaultAIService with new action methods
if (window.NoteVaultAIService) {
    // Show AI action result in modal
    window.NoteVaultAIService.prototype.showActionResult = function(actionType, result, originalContent) {
        const resultModal = this.createActionResultModal(actionType, result, originalContent);
        this.showSuggestionPanel(resultModal);
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
        
        modal.querySelector('.ai-close-btn').addEventListener('click', () => {
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
                        <h4>Simplified Explanation:</h4>
                        <p>${result.explanation}</p>
                        
                        <h4>Key Concepts:</h4>
                        <ul>${result.key_concepts.map(concept => `<li>${concept}</li>`).join('')}</ul>
                        
                        ${result.analogies.length > 0 ? `
                            <h4>Analogies:</h4>
                            <ul>${result.analogies.map(analogy => `<li>${analogy}</li>`).join('')}</ul>
                        ` : ''}
                        
                        ${result.examples.length > 0 ? `
                            <h4>Examples:</h4>
                            <ul>${result.examples.map(example => `<li>${example}</li>`).join('')}</ul>
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
                        <h4>Expanded Content:</h4>
                        <div class="action-preview">${result.expanded_content}</div>
                        
                        ${result.added_sections?.length > 0 ? `
                            <h4>Added Sections:</h4>
                            <ul>${result.added_sections.map(section => `<li>${section}</li>`).join('')}</ul>
                        ` : ''}
                    </div>
                `;
                
            case 'brainstorm':
                return `
                    <div class="action-result-content">
                        <h4>💡 Ideas:</h4>
                        <ul>${result.ideas.map(idea => `<li>${idea}</li>`).join('')}</ul>
                        
                        ${result.connections?.length > 0 ? `
                            <h4>🔗 Connections:</h4>
                            <ul>${result.connections.map(conn => `<li>${conn}</li>`).join('')}</ul>
                        ` : ''}
                        
                        ${result.questions?.length > 0 ? `
                            <h4>❓ Questions to Explore:</h4>
                            <ul>${result.questions.map(q => `<li>${q}</li>`).join('')}</ul>
                        ` : ''}
                        
                        ${result.next_steps?.length > 0 ? `
                            <h4>🚀 Next Steps:</h4>
                            <ul>${result.next_steps.map(step => `<li>${step}</li>`).join('')}</ul>
                        ` : ''}
                    </div>
                `;
                
            case 'write':
                return `
                    <div class="action-result-content">
                        <h4>Continued Content:</h4>
                        <div class="action-preview">${originalContent}<strong>${result.continued_content}</strong></div>
                        
                        <h4>Writing Analysis:</h4>
                        <p><strong>Style:</strong> ${result.writing_style}</p>
                        <p><strong>Tone:</strong> ${result.tone_analysis}</p>
                        <p><strong>Direction:</strong> ${result.suggested_direction}</p>
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
                        <h4>Humanized Content:</h4>
                        <div class="action-preview">${result.humanized_content}</div>
                        
                        <h4>Personality Elements Added:</h4>
                        <ul>${result.personality_elements.map(elem => `<li>${elem}</li>`).join('')}</ul>
                    </div>
                `;
                
            case 'repurpose':
                return `
                    <div class="action-result-content">
                        <h4>Format Variations:</h4>
                        ${Object.entries(result.formats).map(([format, content]) => `
                            <div class="format-section">
                                <h5>📝 ${format.replace('_', ' ').toUpperCase()}:</h5>
                                <div class="action-preview">${content}</div>
                            </div>
                        `).join('')}
                        
                        <h4>Audience Variations:</h4>
                        ${Object.entries(result.audience_variations).map(([audience, content]) => `
                            <div class="format-section">
                                <h5>👥 ${audience.toUpperCase()}:</h5>
                                <div class="action-preview">${content.substring(0, 200)}...</div>
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
        
        this.app.notes.unshift(newNote);
        window.NoteVaultApp.saveNotes();
        window.NoteVaultApp.renderNotes();
        window.NoteVaultApp.showToast('Saved as new note', 'success');
    };
}