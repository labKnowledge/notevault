// Event handlers for AI test interface
document.addEventListener('DOMContentLoaded', function() {
    // Bind event listeners to buttons
    document.getElementById('test-config-btn').addEventListener('click', testConfiguration);
    document.getElementById('test-agent-btn').addEventListener('click', testAIAgent);
    document.getElementById('test-title-btn').addEventListener('click', testTitleGeneration);
    document.getElementById('test-tag-btn').addEventListener('click', testTagGeneration);
    document.getElementById('test-analysis-btn').addEventListener('click', testNoteAnalysis);
    document.getElementById('clear-results-btn').addEventListener('click', clearResults);
});