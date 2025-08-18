// AI Testing Script for NoteVault
let aiAgent = null;

// Initialize test environment
window.addEventListener('DOMContentLoaded', async () => {
    await testConfiguration();
});

// Test configuration
async function testConfiguration() {
    const statusDiv = document.getElementById('config-status');
    
    try {
        if (window.aiConfig) {
            await window.aiConfig.loadConfig();
            const status = window.aiConfig.getStatus();
            
            if (status.configured) {
                statusDiv.className = 'ai-status status-success';
                statusDiv.textContent = `✅ Configuration loaded successfully. Model: ${status.model} (${status.provider})`;
                
                // Initialize AI agent
                aiAgent = new NoteVaultAI();
                await aiAgent.loadConfig();
            } else {
                statusDiv.className = 'ai-status status-error';
                statusDiv.textContent = '❌ Configuration incomplete or invalid';
            }
        } else {
            statusDiv.className = 'ai-status status-error';
            statusDiv.textContent = '❌ AI Configuration manager not available';
        }
    } catch (error) {
        statusDiv.className = 'ai-status status-error';
        statusDiv.textContent = `❌ Configuration error: ${error.message}`;
    }
}

// Test AI Agent
async function testAIAgent() {
    const statusDiv = document.getElementById('agent-status');
    
    if (!aiAgent) {
        statusDiv.className = 'ai-status status-error';
        statusDiv.textContent = '❌ AI Agent not initialized';
        return;
    }
    
    try {
        const isAvailable = aiAgent.isAvailable();
        
        if (isAvailable) {
            statusDiv.className = 'ai-status status-success';
            statusDiv.textContent = '✅ AI Agent initialized and ready';
            addTestResult('AI Agent Test', 'PASS', 'AI Agent is properly initialized and available');
        } else {
            statusDiv.className = 'ai-status status-error';
            statusDiv.textContent = '❌ AI Agent not available';
            addTestResult('AI Agent Test', 'FAIL', 'AI Agent initialization failed');
        }
    } catch (error) {
        statusDiv.className = 'ai-status status-error';
        statusDiv.textContent = `❌ AI Agent error: ${error.message}`;
        addTestResult('AI Agent Test', 'ERROR', error.message);
    }
}

// Test title generation
async function testTitleGeneration() {
    if (!aiAgent || !aiAgent.isAvailable()) {
        addTestResult('Title Generation Test', 'SKIP', 'AI Agent not available');
        return;
    }
    
    const testContent = 'I had a great meeting today with the development team. We discussed the new features for the Q3 release, including user authentication improvements and the new dashboard design. Action items: Review wireframes by Friday, Set up testing environment, Schedule follow-up meeting with design team.';
    
    try {
        addTestResult('Title Generation Test', 'RUNNING', 'Generating titles for test content...');
        
        const titles = await aiAgent.generateSmartTitle(testContent);
        
        if (titles && titles.length > 0) {
            addTestResult('Title Generation Test', 'PASS', `Generated ${titles.length} titles:\n${titles.map((t, i) => `${i+1}. ${t}`).join('\n')}`);
        } else {
            addTestResult('Title Generation Test', 'FAIL', 'No titles generated');
        }
    } catch (error) {
        addTestResult('Title Generation Test', 'ERROR', `Error generating titles: ${error.message}`);
    }
}

// Test tag generation
async function testTagGeneration() {
    if (!aiAgent || !aiAgent.isAvailable()) {
        addTestResult('Tag Generation Test', 'SKIP', 'AI Agent not available');
        return;
    }
    
    const testNote = {
        title: 'Team Meeting Q3 Planning',
        content: 'Discussed new features, authentication improvements, dashboard design. Action items for testing and design review.'
    };
    
    try {
        addTestResult('Tag Generation Test', 'RUNNING', 'Generating tags for test note...');
        
        const tags = await aiAgent.generateSmartTags(testNote, []);
        
        if (tags && tags.length > 0) {
            const tagInfo = tags.map(tag => `${tag.name} (${tag.color}) - ${tag.reason || 'No reason provided'}`).join('\n');
            addTestResult('Tag Generation Test', 'PASS', `Generated ${tags.length} tags:\n${tagInfo}`);
        } else {
            addTestResult('Tag Generation Test', 'FAIL', 'No tags generated');
        }
    } catch (error) {
        addTestResult('Tag Generation Test', 'ERROR', `Error generating tags: ${error.message}`);
    }
}

// Test note analysis
async function testNoteAnalysis() {
    if (!aiAgent || !aiAgent.isAvailable()) {
        addTestResult('Note Analysis Test', 'SKIP', 'AI Agent not available');
        return;
    }
    
    const testNote = {
        id: 'test-123',
        title: 'Project Planning Meeting',
        content: 'We need to finalize the project timeline and assign tasks to team members. The client deadline is approaching fast and we must ensure all deliverables are completed on time. Key areas: UI design, backend development, testing, deployment.',
        updatedAt: new Date().toISOString()
    };
    
    try {
        addTestResult('Note Analysis Test', 'RUNNING', 'Analyzing test note...');
        
        const analysis = await aiAgent.analyzeNote(testNote);
        
        if (analysis) {
            const summary = `Quality Score: ${analysis.quality_score}/10\nPriority: ${analysis.priority_level}\nTone: ${analysis.emotional_tone}\nThemes: ${analysis.main_themes.join(', ')}\nInsights: ${analysis.insights}`;
            addTestResult('Note Analysis Test', 'PASS', `Analysis completed:\n${summary}`);
        } else {
            addTestResult('Note Analysis Test', 'FAIL', 'No analysis returned');
        }
    } catch (error) {
        addTestResult('Note Analysis Test', 'ERROR', `Error analyzing note: ${error.message}`);
    }
}

// Add test result
function addTestResult(testName, status, details) {
    const resultsDiv = document.getElementById('test-results');
    const timestamp = new Date().toLocaleTimeString();
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'test-result';
    
    let statusIcon = '';
    switch (status) {
        case 'PASS':
            statusIcon = '✅';
            break;
        case 'FAIL':
            statusIcon = '❌';
            break;
        case 'ERROR':
            statusIcon = '⚠️';
            break;
        case 'SKIP':
            statusIcon = '⏭️';
            break;
        case 'RUNNING':
            statusIcon = '🔄';
            break;
        default:
            statusIcon = 'ℹ️';
    }
    
    resultDiv.innerHTML = `<strong>[${timestamp}] ${statusIcon} ${testName} - ${status}</strong>\n${details}`;
    resultsDiv.appendChild(resultDiv);
    resultsDiv.scrollTop = resultsDiv.scrollHeight;
}

// Clear results
function clearResults() {
    document.getElementById('test-results').innerHTML = '';
}

// Expose functions to global scope for button events
window.testConfiguration = testConfiguration;
window.testAIAgent = testAIAgent;
window.testTitleGeneration = testTitleGeneration;
window.testTagGeneration = testTagGeneration;
window.testNoteAnalysis = testNoteAnalysis;
window.clearResults = clearResults;