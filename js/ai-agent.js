// AI Agent for NoteVault - Autonomous note enhancement and analysis
class NoteVaultAI {
    constructor() {
        this.apiKey = null;
        this.baseUrl = null;
        this.model = null;
        this.initialized = false;
        this.analysisCache = new Map();
        this.suggestions = new Map();
        this.loadConfig();
    }

    // Load AI configuration
    async loadConfig() {
        try {
            // Wait for global config to be ready
            if (window.aiConfig) {
                await window.aiConfig.loadConfig();
                const config = window.aiConfig.getConfig();
                this.apiKey = config.apiKey;
                this.baseUrl = config.baseUrl;
                this.model = config.model;
                this.initialized = window.aiConfig.isValid();
                
                if (this.initialized) {
                    console.log('AI Agent initialized successfully with config:', window.aiConfig.getStatus());
                } else {
                    console.warn('AI Agent: Invalid configuration. Some AI features may be limited.');
                }
            } else {
                console.warn('AI Agent: Configuration manager not available.');
            }
        } catch (error) {
            console.error('Failed to initialize AI Agent:', error);
        }
    }

    // Make API call to Qwen
    async makeAPICall(messages, temperature = 0.7, maxTokens = 1000) {
        if (!this.initialized) {
            throw new Error('AI Agent not initialized');
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Response:', response.status, errorText);
                throw new Error(`API call failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                console.error('Unexpected API response structure:', data);
                throw new Error('Invalid API response structure');
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('Network error - check API URL and connectivity:', error);
                throw new Error('Network error: Unable to connect to AI service');
            } else if (error.message.includes('CORS')) {
                console.error('CORS error - API not allowing cross-origin requests:', error);
                throw new Error('CORS error: API access blocked');
            }
            console.error('AI API call failed:', error);
            throw error;
        }
    }

    // Analyze note content and provide comprehensive insights
    async analyzeNote(note) {
        const cacheKey = `${note.id}_${note.updatedAt}`;
        
        // Check cache first
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }

        const analysisPrompt = [
            {
                role: "system",
                content: `You are an AI assistant specialized in note analysis and enhancement. Analyze the given note and provide structured insights including:
1. Content quality assessment
2. Suggested improvements
3. Key themes and concepts
4. Potential connections to other topics
5. Urgency/priority level
6. Emotional tone
7. Actionable items identified

Respond in JSON format with these fields:
{
  "quality_score": number (1-10),
  "main_themes": [string],
  "priority_level": string ("low", "medium", "high", "urgent"),
  "emotional_tone": string,
  "actionable_items": [string],
  "suggested_improvements": [string],
  "related_topics": [string],
  "insights": string
}`
            },
            {
                role: "user",
                content: `Title: ${note.title}\n\nContent: ${this.stripHTML(note.content)}\n\nPlease analyze this note comprehensively.`
            }
        ];

        try {
            const result = await this.makeAPICall(analysisPrompt, 0.3);
            const analysis = JSON.parse(result);
            
            // Cache the result
            this.analysisCache.set(cacheKey, analysis);
            
            return analysis;
        } catch (error) {
            console.error('Note analysis failed:', error);
            return this.getFallbackAnalysis(note);
        }
    }

    // Generate smart title suggestions
    async generateSmartTitle(content) {
        const titlePrompt = [
            {
                role: "system",
                content: `You are a creative AI that generates compelling, descriptive titles for notes. Create 3-5 title suggestions that are:
1. Descriptive and specific
2. Engaging and memorable  
3. Professional yet creative
4. Under 60 characters

Respond in JSON format: {"titles": [string]}`
            },
            {
                role: "user", 
                content: `Generate title suggestions for this content:\n\n${this.stripHTML(content).substring(0, 500)}`
            }
        ];

        try {
            const result = await this.makeAPICall(titlePrompt, 0.8);
            const parsed = JSON.parse(result);
            return parsed.titles || [];
        } catch (error) {
            console.error('Title generation failed:', error);
            return this.getFallbackTitles(content);
        }
    }

    // Generate smart tags based on content
    async generateSmartTags(note, existingTags = []) {
        const tagPrompt = [
            {
                role: "system",
                content: `You are an AI that creates relevant tags for note organization. Generate 3-8 tags that are:
1. Relevant to the content
2. Useful for organization
3. Mix of specific and general tags
4. Consider existing tags to maintain consistency

Existing tags: ${existingTags.map(t => t.name).join(', ')}

Respond in JSON format: {"tags": [{"name": string, "reason": string, "color": hex_color}]}`
            },
            {
                role: "user",
                content: `Title: ${note.title}\nContent: ${this.stripHTML(note.content)}\n\nGenerate relevant tags.`
            }
        ];

        try {
            const result = await this.makeAPICall(tagPrompt, 0.4);
            const parsed = JSON.parse(result);
            return parsed.tags || [];
        } catch (error) {
            console.error('Tag generation failed:', error);
            return this.getFallbackTags(note);
        }
    }

    // Suggest appropriate notebook/category
    async suggestNotebook(note, existingNotebooks = []) {
        const notebookPrompt = [
            {
                role: "system", 
                content: `You are an AI that helps categorize notes into notebooks/folders. Based on the content, suggest the most appropriate existing notebook or propose a new one.

Existing notebooks: ${existingNotebooks.map(nb => nb.name).join(', ')}

Respond in JSON format: {
  "suggested_notebook": string,
  "is_new": boolean, 
  "confidence": number (0-1),
  "reason": string
}`
            },
            {
                role: "user",
                content: `Title: ${note.title}\nContent: ${this.stripHTML(note.content)}\n\nSuggest the best notebook category.`
            }
        ];

        try {
            const result = await this.makeAPICall(notebookPrompt, 0.3);
            return JSON.parse(result);
        } catch (error) {
            console.error('Notebook suggestion failed:', error);
            return this.getFallbackNotebookSuggestion(note);
        }
    }

    // Enhance note content with AI insights
    async enhanceContent(note) {
        const enhancePrompt = [
            {
                role: "system",
                content: `You are an AI writing assistant that enhances note content. Improve the given note by:
1. Adding structure and formatting
2. Expanding on key points with insights
3. Adding relevant context or examples
4. Suggesting follow-up questions or areas to explore
5. Maintaining the original meaning and voice

Respond in JSON format: {
  "enhanced_content": string,
  "additions": [{"type": string, "content": string, "position": string}],
  "suggestions": [string]
}`
            },
            {
                role: "user",
                content: `Title: ${note.title}\nContent: ${this.stripHTML(note.content)}\n\nEnhance this note content.`
            }
        ];

        try {
            const result = await this.makeAPICall(enhancePrompt, 0.6, 1500);
            return JSON.parse(result);
        } catch (error) {
            console.error('Content enhancement failed:', error);
            return null;
        }
    }

    // Provide autonomous suggestions for note management
    async getAutonomousSuggestions(notes, notebooks, tags) {
        const suggestionPrompt = [
            {
                role: "system",
                content: `You are an AI assistant that provides proactive suggestions for note management and organization. Analyze the user's note collection and provide actionable suggestions for:
1. Organization improvements
2. Content gaps to fill
3. Notes that could be merged or split
4. New notebooks/tags to create
5. Priority actions

Respond in JSON format: {
  "suggestions": [{"type": string, "title": string, "description": string, "priority": string, "action": string}]
}`
            },
            {
                role: "user",
                content: `Notes: ${notes.length} total
Recent notes: ${notes.slice(0, 5).map(n => `"${n.title}"`).join(', ')}
Notebooks: ${notebooks.map(nb => nb.name).join(', ')}
Tags: ${tags.map(t => t.name).join(', ')}

Provide autonomous suggestions for improving this note system.`
            }
        ];

        try {
            const result = await this.makeAPICall(suggestionPrompt, 0.7);
            const parsed = JSON.parse(result);
            return parsed.suggestions || [];
        } catch (error) {
            console.error('Autonomous suggestions failed:', error);
            return [];
        }
    }

    // Find related notes using AI similarity
    async findRelatedNotes(currentNote, allNotes) {
        if (allNotes.length < 2) return [];

        const relatedPrompt = [
            {
                role: "system",
                content: `You are an AI that finds thematically related notes. Analyze the current note and identify which other notes are most related by content, theme, or context.

Respond in JSON format: {
  "related_notes": [{"id": string, "similarity_score": number, "reason": string}]
}`
            },
            {
                role: "user",
                content: `Current note: "${currentNote.title}" - ${this.stripHTML(currentNote.content).substring(0, 300)}

Other notes:
${allNotes.filter(n => n.id !== currentNote.id).slice(0, 10).map(n => 
    `ID: ${n.id} | Title: "${n.title}" | Content: ${this.stripHTML(n.content).substring(0, 150)}`
).join('\n')}

Find the most related notes.`
            }
        ];

        try {
            const result = await this.makeAPICall(relatedPrompt, 0.3);
            const parsed = JSON.parse(result);
            return parsed.related_notes || [];
        } catch (error) {
            console.error('Related notes search failed:', error);
            return [];
        }
    }

    // Explain content in simple terms
    async explainContent(content, complexity = 'simple') {
        const explainPrompt = [
            {
                role: "system",
                content: `You are an AI that explains complex concepts in ${complexity} terms. Break down the content into easy-to-understand explanations with examples and analogies.

Respond in JSON format: {
  "explanation": string,
  "key_concepts": [string],
  "analogies": [string],
  "examples": [string]
}`
            },
            {
                role: "user",
                content: `Explain this content: ${content.substring(0, 1000)}`
            }
        ];

        try {
            const result = await this.makeAPICall(explainPrompt, 0.3);
            return JSON.parse(result);
        } catch (error) {
            console.error('Content explanation failed:', error);
            return this.getFallbackExplanation(content);
        }
    }

    // Expand content with more details
    async expandContent(content, direction = 'comprehensive') {
        const expandPrompt = [
            {
                role: "system",
                content: `You are an AI that expands content with additional details, context, and depth. Add relevant information while maintaining the original tone and style.

Expansion type: ${direction}

Respond in JSON format: {
  "expanded_content": string,
  "added_sections": [string],
  "supporting_details": [string],
  "word_count_increase": number
}`
            },
            {
                role: "user",
                content: `Expand this content: ${content}`
            }
        ];

        try {
            const result = await this.makeAPICall(expandPrompt, 0.6, 2000);
            return JSON.parse(result);
        } catch (error) {
            console.error('Content expansion failed:', error);
            return this.getFallbackExpansion(content);
        }
    }

    // Brainstorm related ideas
    async brainstormIdeas(content, type = 'creative') {
        const brainstormPrompt = [
            {
                role: "system",
                content: `You are a creative AI that generates innovative ideas and connections. Based on the given content, brainstorm related ideas, potential developments, and creative extensions.

Brainstorm type: ${type}

Respond in JSON format: {
  "ideas": [string],
  "connections": [string],
  "questions": [string],
  "next_steps": [string],
  "creative_angles": [string]
}`
            },
            {
                role: "user",
                content: `Brainstorm ideas related to: ${content.substring(0, 800)}`
            }
        ];

        try {
            const result = await this.makeAPICall(brainstormPrompt, 0.8, 1500);
            return JSON.parse(result);
        } catch (error) {
            console.error('Brainstorming failed:', error);
            return this.getFallbackBrainstorm(content);
        }
    }

    // Continue writing content
    async continueWriting(content, style = 'natural', length = 'medium') {
        const continuePrompt = [
            {
                role: "system",
                content: `You are an AI writing assistant that continues text naturally. Match the existing tone, style, and flow while adding meaningful content.

Length: ${length} (short=1-2 paragraphs, medium=3-4 paragraphs, long=5+ paragraphs)
Style: ${style}

Respond in JSON format: {
  "continued_content": string,
  "writing_style": string,
  "tone_analysis": string,
  "suggested_direction": string
}`
            },
            {
                role: "user",
                content: `Continue writing this content naturally: ${content}`
            }
        ];

        try {
            const result = await this.makeAPICall(continuePrompt, 0.7, 1500);
            return JSON.parse(result);
        } catch (error) {
            console.error('Continue writing failed:', error);
            return this.getFallbackContinueWriting(content);
        }
    }

    // Humanize content to make it more personal and relatable
    async humanizeContent(content) {
        const humanizePrompt = [
            {
                role: "system",
                content: `You are an AI that makes content more human, personal, and relatable. Add warmth, personality, anecdotes, and conversational elements while preserving the core message.

Respond in JSON format: {
  "humanized_content": string,
  "personality_elements": [string],
  "conversational_touches": [string],
  "relatability_score": number
}`
            },
            {
                role: "user",
                content: `Humanize this content: ${content}`
            }
        ];

        try {
            const result = await this.makeAPICall(humanizePrompt, 0.7, 1500);
            return JSON.parse(result);
        } catch (error) {
            console.error('Content humanization failed:', error);
            return this.getFallbackHumanization(content);
        }
    }

    // Repurpose content for different formats and audiences
    async repurposeContent(content, targetFormat = 'multiple') {
        const repurposePrompt = [
            {
                role: "system",
                content: `You are an AI that repurposes content for different formats and audiences. Transform the content while maintaining its essence.

Target format: ${targetFormat}

Respond in JSON format: {
  "formats": {
    "social_media": string,
    "email": string,
    "presentation": string,
    "blog_post": string,
    "summary": string
  },
  "audience_variations": {
    "professional": string,
    "casual": string,
    "academic": string
  }
}`
            },
            {
                role: "user",
                content: `Repurpose this content: ${content.substring(0, 1000)}`
            }
        ];

        try {
            const result = await this.makeAPICall(repurposePrompt, 0.6, 2000);
            return JSON.parse(result);
        } catch (error) {
            console.error('Content repurposing failed:', error);
            return this.getFallbackRepurposing(content);
        }
    }

    // Generate insights for 3D visualization
    async generate3DInsights(notes) {
        const insightsPrompt = [
            {
                role: "system",
                content: `You are an AI that provides insights for 3D note visualization. Analyze the note collection and suggest:
1. Clustering patterns (which notes should be grouped together)
2. Visual metaphors for different types of content
3. Color coding suggestions
4. Spatial arrangement ideas

Respond in JSON format: {
  "clusters": [{"name": string, "note_ids": [string], "theme": string, "color": string}],
  "visualization_suggestions": [string],
  "spatial_insights": string
}`
            },
            {
                role: "user",
                content: `Note collection:
${notes.slice(0, 20).map(n => 
    `ID: ${n.id} | Title: "${n.title}" | Content: ${this.stripHTML(n.content).substring(0, 100)}`
).join('\n')}

Provide 3D visualization insights.`
            }
        ];

        try {
            const result = await this.makeAPICall(insightsPrompt, 0.5);
            return JSON.parse(result);
        } catch (error) {
            console.error('3D insights generation failed:', error);
            return null;
        }
    }

    // Utility: Strip HTML from content
    stripHTML(html) {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    // Fallback analysis when AI is unavailable
    getFallbackAnalysis(note) {
        const content = this.stripHTML(note.content);
        const wordCount = content.split(' ').length;
        
        return {
            quality_score: Math.min(8, Math.max(3, Math.ceil(wordCount / 50))),
            main_themes: ["general"],
            priority_level: "medium",
            emotional_tone: "neutral", 
            actionable_items: [],
            suggested_improvements: ["Add more detail", "Include examples"],
            related_topics: [],
            insights: "AI analysis unavailable - using basic heuristics"
        };
    }

    // Fallback title generation
    getFallbackTitles(content) {
        const text = this.stripHTML(content).substring(0, 100);
        const words = text.split(' ').slice(0, 5);
        return [
            words.join(' ') + '...',
            `Note from ${new Date().toLocaleDateString()}`,
            'Untitled Note'
        ];
    }

    // Fallback tag generation
    getFallbackTags(note) {
        const content = this.stripHTML(note.content).toLowerCase();
        const commonTags = [
            { name: 'General', color: '#4CAF50' },
            { name: 'Ideas', color: '#2196F3' },
            { name: 'Important', color: '#F44336' }
        ];
        
        return commonTags.slice(0, 2);
    }

    // Fallback notebook suggestion  
    getFallbackNotebookSuggestion(note) {
        return {
            suggested_notebook: 'Personal',
            is_new: false,
            confidence: 0.3,
            reason: 'Default categorization'
        };
    }
    
    // Fallback functions for new AI actions
    getFallbackExplanation(content) {
        return {
            explanation: "This content covers key concepts that could benefit from further explanation and context.",
            key_concepts: ["Main topic", "Key points"],
            analogies: ["Think of it like a familiar concept"],
            examples: ["For instance, consider this example"]
        };
    }
    
    getFallbackExpansion(content) {
        const wordCount = content.split(' ').length;
        return {
            expanded_content: content + "\n\nAdditional context and details could be added here to provide more comprehensive coverage of the topic.",
            added_sections: ["Additional context", "Supporting details"],
            supporting_details: ["More examples", "Further explanation"],
            word_count_increase: 20
        };
    }
    
    getFallbackBrainstorm(content) {
        return {
            ideas: ["Explore related concepts", "Consider alternative approaches", "Think about practical applications"],
            connections: ["Links to similar topics", "Connections to current trends"],
            questions: ["What if we approached this differently?", "How might this evolve?"],
            next_steps: ["Research further", "Gather more examples", "Test the concepts"],
            creative_angles: ["Creative perspective", "Unique viewpoint", "Novel application"]
        };
    }
    
    getFallbackContinueWriting(content) {
        return {
            continued_content: "\n\nContinuing from where we left off, there are several important points to consider. This topic has multiple dimensions that deserve exploration.",
            writing_style: "Informative and engaging",
            tone_analysis: "Professional yet accessible",
            suggested_direction: "Expand on key themes and add supporting examples"
        };
    }
    
    getFallbackHumanization(content) {
        return {
            humanized_content: content.replace(/\./g, '. You know,').replace(/However,/g, 'But here\'s the thing -'),
            personality_elements: ["Conversational tone", "Personal touches"],
            conversational_touches: ["Direct address to reader", "Casual transitions"],
            relatability_score: 7
        };
    }
    
    getFallbackRepurposing(content) {
        const summary = content.substring(0, 100) + '...';
        return {
            formats: {
                social_media: `🔥 ${summary} #insights`,
                email: `Hi there,\n\n${summary}\n\nBest regards`,
                presentation: `• ${summary}\n• Key takeaways\n• Next steps`,
                blog_post: `# Topic Overview\n\n${content}\n\n## Conclusion`,
                summary: summary
            },
            audience_variations: {
                professional: content,
                casual: content.replace(/\./g, '!').replace(/However,/g, 'But hey,'),
                academic: `In examining this topic, ${content}`
            }
        };
    }

    // Set API configuration manually
    setConfig(apiKey, baseUrl, model) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.initialized = true;
        
        // Save to chrome storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({
                qwen_api_key: apiKey,
                qwen_base_url: baseUrl, 
                qwen_model: model
            });
        }
    }

    // Check if AI is available
    isAvailable() {
        return this.initialized && this.apiKey && this.baseUrl && this.model;
    }

    // Get cached analysis
    getCachedAnalysis(noteId, updatedAt) {
        const cacheKey = `${noteId}_${updatedAt}`;
        return this.analysisCache.get(cacheKey);
    }

    // Clear cache
    clearCache() {
        this.analysisCache.clear();
        this.suggestions.clear();
    }
}

// Export for use in other modules
window.NoteVaultAI = NoteVaultAI;