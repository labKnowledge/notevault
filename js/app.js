// NoteVault Application
document.addEventListener('DOMContentLoaded', function() {
    // Application State
    const app = {
        notes: [],
        notebooks: [],
        tags: [],
        currentView: '3d',
        currentNotebook: 'all',
        currentTag: null,
        searchTerm: '',
        sortFilter: 'recent',
        editingNote: null,
        threeScene: null,
        threeCamera: null,
        threeRenderer: null,
        threeControls: null,
        noteCards: [],
        animationId: null,
        raycaster: null,
        mouse: null,
        hoveredCard: null,
        expandedCard: null,
        hoverTimeline: null,
        glowMaterial: null,
        isThreeViewInitialized: false,
        aiService: null
    };

    // DOM Elements
    const elements = {
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        appHeader: document.querySelector('.app-header'),
        mainContent: document.querySelector('.main-content'),
        notebookList: document.getElementById('notebook-list'),
        tagList: document.getElementById('tag-list'),
        notesView: document.getElementById('notes-view'),
        threeView: document.getElementById('three-view'),
        threeCanvas: document.getElementById('three-canvas'),
        viewButtons: document.querySelectorAll('.view-btn'),
        newNoteBtn: document.getElementById('new-note-btn'),
        emptyStateNewNote: document.getElementById('empty-state-new-note'),
        noteEditorModal: document.getElementById('note-editor-modal'),
        editorClose: document.getElementById('editor-close'),
        editorTitle: document.getElementById('editor-title'),
        noteTitleInput: document.getElementById('note-title-input'),
        noteContentInput: document.getElementById('note-content-input'),
        noteNotebookSelect: document.getElementById('note-notebook-select'),
        editorSelectedTags: document.getElementById('editor-selected-tags'),
        tagSelector: document.getElementById('tag-selector'),
        saveNoteBtn: document.getElementById('save-note-btn'),
        saveStatus: document.getElementById('save-status'),
        searchInput: document.getElementById('search-input'),
        filterBtn: document.getElementById('filter-btn'),
        filterMenu: document.getElementById('filter-menu'),
        filterOptions: document.querySelectorAll('.filter-option'),
        addNotebookBtn: document.getElementById('add-notebook-btn'),
        addTagBtn: document.getElementById('add-tag-btn'),
        toast: document.getElementById('toast'),
        resetCameraBtn: document.getElementById('reset-camera'),
        arrangeGridBtn: document.getElementById('arrange-grid'),
        arrangeSphereBtn: document.getElementById('arrange-sphere'),
        editorToolbar: document.querySelectorAll('.editor-toolbar button'),
        aiEnhanceBtn: document.getElementById('ai-enhance-btn'),
        aiAnalyzeBtn: document.getElementById('ai-analyze-btn'),
        aiSuggestionsBtn: document.getElementById('ai-suggestions-btn')
    };

    // Initialize the application
    function init() {
        loadData();
        setupEventListeners();
        renderUI();
        
        // Initialize AI Service
        app.aiService = new NoteVaultAIService(app);
        
        // Start with 3D immersive view by default
        setTimeout(() => {
            switchView('3d');
        }, 100); // Small delay to ensure DOM is ready
    }

    // Load data from chrome.storage.local
    function loadData() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            // Load notes
            chrome.storage.local.get(['notevault-notes'], function(result) {
                app.notes = result['notevault-notes'] || [];
                if (app.notes.length === 0) {
                    createSampleNotes();
                } else {
                    renderNotes();
                }
            });
            
            // Load notebooks
            chrome.storage.local.get(['notevault-notebooks'], function(result) {
                app.notebooks = result['notevault-notebooks'] || [];
                if (app.notebooks.length === 0) {
                    // Create default notebooks
                    app.notebooks = [
                        {
                            id: generateId(),
                            name: 'Personal',
                            createdAt: new Date().toISOString()
                        },
                        {
                            id: generateId(),
                            name: 'Work',
                            createdAt: new Date().toISOString()
                        }
                    ];
                    saveNotebooks();
                }
                renderNotebooks();
                updateNotebookSelector();
            });
            
            // Load tags
            chrome.storage.local.get(['notevault-tags'], function(result) {
                app.tags = result['notevault-tags'] || [];
                if (app.tags.length === 0) {
                    // Create default tags
                    app.tags = [
                        {
                            id: generateId(),
                            name: 'Important',
                            color: '#f44336'
                        },
                        {
                            id: generateId(),
                            name: 'Ideas',
                            color: '#2196f3'
                        },
                        {
                            id: generateId(),
                            name: 'To-Do',
                            color: '#4caf50'
                        }
                    ];
                    saveTags();
                }
                renderTags();
                updateTagSelector();
            });
        } else {
            // Fallback to localStorage if chrome.storage is not available
            loadDataFromLocalStorage();
        }
    }
    
    // Fallback function for localStorage
    function loadDataFromLocalStorage() {
        // Load notes
        const savedNotes = localStorage.getItem('notevault-notes');
        if (savedNotes) {
            app.notes = JSON.parse(savedNotes);
        } else {
            createSampleNotes();
        }

        // Load notebooks
        const savedNotebooks = localStorage.getItem('notevault-notebooks');
        if (savedNotebooks) {
            app.notebooks = JSON.parse(savedNotebooks);
        } else {
            // Create default notebook if none exist
            app.notebooks = [
                {
                    id: generateId(),
                    name: 'Personal',
                    createdAt: new Date().toISOString()
                },
                {
                    id: generateId(),
                    name: 'Work',
                    createdAt: new Date().toISOString()
                }
            ];
            saveNotebooks();
        }

        // Load tags
        const savedTags = localStorage.getItem('notevault-tags');
        if (savedTags) {
            app.tags = JSON.parse(savedTags);
        } else {
            // Create default tags if none exist
            app.tags = [
                {
                    id: generateId(),
                    name: 'Important',
                    color: '#f44336'
                },
                {
                    id: generateId(),
                    name: 'Ideas',
                    color: '#2196f3'
                },
                {
                    id: generateId(),
                    name: 'To-Do',
                    color: '#4caf50'
                }
            ];
            saveTags();
        }
        
        // Render UI after loading all data
        renderNotes();
        renderNotebooks();
        updateNotebookSelector();
        renderTags();
        updateTagSelector();
    }

    // Create sample notes for demonstration
    function createSampleNotes() {
        const personalNotebookId = app.notebooks.length > 0 ? app.notebooks[0].id : '';
        const workNotebookId = app.notebooks.length > 1 ? app.notebooks[1].id : '';
        
        const importantTagId = app.tags.length > 0 ? app.tags[0].id : '';
        const ideasTagId = app.tags.length > 1 ? app.tags[1].id : '';
        const todoTagId = app.tags.length > 2 ? app.tags[2].id : '';

        app.notes = [
            {
                id: generateId(),
                title: 'Welcome to NoteVault',
                content: 'This is your first note in NoteVault. You can create, edit, and organize your notes in this innovative 3D note-taking application.',
                tags: [importantTagId],
                notebookId: personalNotebookId,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: generateId(),
                title: 'Project Ideas',
                content: '1. Mobile app for task management\n2. Website redesign\n3. New feature implementation',
                tags: [ideasTagId, todoTagId],
                notebookId: workNotebookId,
                createdAt: new Date(Date.now() - 172800000).toISOString(),
                updatedAt: new Date(Date.now() - 172800000).toISOString()
            },
            {
                id: generateId(),
                title: 'Meeting Notes',
                content: 'Discussed the quarterly goals and upcoming projects. Key points:\n- Increase user engagement\n- Improve onboarding experience\n- Launch new features by Q3',
                tags: [importantTagId],
                notebookId: workNotebookId,
                createdAt: new Date(Date.now() - 259200000).toISOString(),
                updatedAt: new Date(Date.now() - 259200000).toISOString()
            }
        ];

        saveNotes();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Sidebar toggle
        elements.sidebarToggle.addEventListener('click', toggleSidebar);

        // View toggle
        elements.viewButtons.forEach(button => {
            button.addEventListener('click', () => switchView(button.dataset.view));
        });

        // New note buttons
        elements.newNoteBtn.addEventListener('click', () => openNoteEditor());
        elements.emptyStateNewNote.addEventListener('click', () => openNoteEditor());

        // Note editor
        elements.editorClose.addEventListener('click', closeNoteEditor);
        elements.saveNoteBtn.addEventListener('click', saveNote);
        elements.noteTitleInput.addEventListener('input', updateSaveStatus);
        elements.noteContentInput.addEventListener('input', updateSaveStatus);

        // Editor toolbar
        elements.editorToolbar.forEach(button => {
            button.addEventListener('click', () => {
                const command = button.dataset.command;
                document.execCommand(command, false, null);
                elements.noteContentInput.focus();
                updateSaveStatus();
            });
        });

        // Search
        elements.searchInput.addEventListener('input', handleSearch);

        // Filter
        elements.filterBtn.addEventListener('click', toggleFilterMenu);
        elements.filterOptions.forEach(option => {
            option.addEventListener('click', () => applyFilter(option.dataset.filter));
        });

        // Add notebook
        elements.addNotebookBtn.addEventListener('click', addNotebook);

        // Add tag
        elements.addTagBtn.addEventListener('click', addTag);

        // Three.js controls
        elements.resetCameraBtn.addEventListener('click', resetCamera);
        elements.arrangeGridBtn.addEventListener('click', () => arrangeNotes('grid'));
        elements.arrangeSphereBtn.addEventListener('click', () => arrangeNotes('sphere'));

        // AI controls
        if (elements.aiEnhanceBtn) {
            elements.aiEnhanceBtn.addEventListener('click', enhanceCurrentNote);
        }
        if (elements.aiAnalyzeBtn) {
            elements.aiAnalyzeBtn.addEventListener('click', analyzeCurrentNote);
        }
        if (elements.aiSuggestionsBtn) {
            elements.aiSuggestionsBtn.addEventListener('click', showAISuggestions);
        }
        
        // New AI action buttons
        setupAIActionButtons();
        
        // AI dropdown toggle
        const aiMoreBtn = document.getElementById('ai-more-btn');
        const aiDropdown = document.getElementById('ai-dropdown');
        
        if (aiMoreBtn && aiDropdown) {
            aiMoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                aiDropdown.classList.toggle('active');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                aiDropdown.classList.remove('active');
            });
            
            aiDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // Close filter menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.filterBtn.contains(e.target) && !elements.filterMenu.contains(e.target)) {
                elements.filterMenu.classList.remove('active');
            }
        });

        // Close note editor when clicking outside
        elements.noteEditorModal.addEventListener('click', (e) => {
            if (e.target === elements.noteEditorModal) {
                closeNoteEditor();
            }
        });

        // Window resize
        window.addEventListener('resize', handleWindowResize);
    }

    // Render the UI
    function renderUI() {
        renderNotebooks();
        renderTags();
        renderNotes();
        updateNotebookSelector();
        updateTagSelector();
    }

    // Render notebooks in the sidebar
    function renderNotebooks() {
        // Clear existing notebooks except "All Notes"
        const allNotesItem = elements.notebookList.querySelector('[data-id="all"]');
        elements.notebookList.innerHTML = '';
        elements.notebookList.appendChild(allNotesItem);

        // Add each notebook
        app.notebooks.forEach(notebook => {
            const li = document.createElement('li');
            li.className = 'notebook-item';
            li.dataset.id = notebook.id;
            li.innerHTML = `
                <i class="fas fa-folder"></i>
                <span>${notebook.name}</span>
            `;
            li.addEventListener('click', () => selectNotebook(notebook.id));
            elements.notebookList.appendChild(li);
        });
    }

    // Render tags in the sidebar
    function renderTags() {
        elements.tagList.innerHTML = '';

        app.tags.forEach(tag => {
            const li = document.createElement('li');
            li.className = 'tag-item';
            li.dataset.id = tag.id;
            li.innerHTML = `
                <div class="tag-color" style="background-color: ${tag.color}"></div>
                <span>${tag.name}</span>
            `;
            li.addEventListener('click', () => selectTag(tag.id));
            elements.tagList.appendChild(li);
        });
    }

    // Render notes based on current filters
    function renderNotes() {
        // Clear existing notes
        elements.notesView.innerHTML = '';

        // Filter notes based on current selections
        let filteredNotes = [...app.notes];

        // Filter by notebook
        if (app.currentNotebook !== 'all') {
            filteredNotes = filteredNotes.filter(note => note.notebookId === app.currentNotebook);
        }

        // Filter by tag
        if (app.currentTag) {
            filteredNotes = filteredNotes.filter(note => note.tags.includes(app.currentTag));
        }

        // Filter by search term
        if (app.searchTerm) {
            const searchLower = app.searchTerm.toLowerCase();
            filteredNotes = filteredNotes.filter(note => 
                note.title.toLowerCase().includes(searchLower) || 
                note.content.toLowerCase().includes(searchLower)
            );
        }

        // Sort notes
        filteredNotes.sort((a, b) => {
            switch (app.sortFilter) {
                case 'recent':
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
                case 'oldest':
                    return new Date(a.updatedAt) - new Date(b.updatedAt);
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        // Render notes or empty state
        if (filteredNotes.length === 0) {
            elements.notesView.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-sticky-note"></i>
                    </div>
                    <h2 class="empty-state-title">No Notes Found</h2>
                    <p class="empty-state-text">Try changing your filters or create a new note</p>
                    <button class="btn" id="empty-state-new-note">
                        <i class="fas fa-plus"></i>
                        <span>Create Note</span>
                    </button>
                </div>
            `;
            document.getElementById('empty-state-new-note').addEventListener('click', () => openNoteEditor());
        } else {
            filteredNotes.forEach(note => {
                const noteCard = createNoteCard(note);
                elements.notesView.appendChild(noteCard);
                
                // Add GSAP animation
                gsap.from(noteCard, {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    ease: "power2.out"
                });
                
                // Add hover effect
                noteCard.addEventListener('mouseenter', () => {
                    gsap.to(noteCard, {
                        y: -5,
                        rotation: 1,
                        scale: 1.02,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                });
                
                noteCard.addEventListener('mouseleave', () => {
                    gsap.to(noteCard, {
                        y: 0,
                        rotation: 0,
                        scale: 1,
                        duration: 0.3,
                        ease: "power2.out"
                    });
                });
            });
        }

        // Update 3D view if active
        if (app.currentView === '3d') {
            updateThreeView();
        }
    }

    // Create a note card element
    function createNoteCard(note) {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.dataset.id = note.id;
        
        // Get notebook name
        const notebook = app.notebooks.find(nb => nb.id === note.notebookId);
        const notebookName = notebook ? notebook.name : 'No Notebook';
        
        // Get tags
        const noteTags = note.tags.map(tagId => {
            const tag = app.tags.find(t => t.id === tagId);
            return tag ? { id: tag.id, name: tag.name, color: tag.color } : null;
        }).filter(tag => tag !== null);
        
        // Format date
        const date = new Date(note.updatedAt);
        const formattedDate = date.toLocaleDateString();
        
        card.innerHTML = `
            <div class="note-card-header">
                <h3 class="note-card-title">${note.title}</h3>
                <span class="note-card-date">${formattedDate}</span>
            </div>
            <div class="note-card-content">${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</div>
            <div class="note-card-footer">
                <div class="note-card-tags">
                    ${noteTags.map(tag => `
                        <span class="note-tag">
                            <span class="note-tag-color" style="background-color: ${tag.color}"></span>
                            ${tag.name}
                        </span>
                    `).join('')}
                </div>
                <div class="note-card-actions">
                    <button class="btn-icon edit-note" data-id="${note.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-note" data-id="${note.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.note-card-actions')) {
                openNoteEditor(note.id);
            }
        });
        
        card.querySelector('.edit-note').addEventListener('click', (e) => {
            e.stopPropagation();
            openNoteEditor(note.id);
        });
        
        card.querySelector('.delete-note').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        });
        
        return card;
    }

    // Toggle sidebar
    function toggleSidebar() {
        elements.sidebar.classList.toggle('collapsed');
        const icon = elements.sidebarToggle.querySelector('i');
        if (elements.sidebar.classList.contains('collapsed')) {
            icon.className = 'fas fa-chevron-right';
        } else {
            icon.className = 'fas fa-chevron-left';
        }
    }

    // Switch between 2D and 3D views
    function switchView(view) {
        app.currentView = view;
        
        // Update active button
        elements.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Toggle views with animation
        if (view === '2d') {
            // Exit immersive 3D mode
            exitImmersive3DMode();
            
            gsap.to(elements.threeView, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    elements.threeView.classList.remove('active');
                    elements.notesView.classList.add('active');
                    gsap.to(elements.notesView, {
                        opacity: 1,
                        duration: 0.3
                    });
                }
            });
            
            // Stop Three.js animation
            if (app.animationId) {
                cancelAnimationFrame(app.animationId);
                app.animationId = null;
            }
        } else {
            // Enter immersive 3D mode
            enterImmersive3DMode();
            
            gsap.to(elements.notesView, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    elements.notesView.classList.remove('active');
                    elements.threeView.classList.add('active');
                    gsap.to(elements.threeView, {
                        opacity: 1,
                        duration: 0.3,
                        onComplete: () => {
                            // Initialize Three.js if not already done
                            if (!app.isThreeViewInitialized) {
                                initThreeJS();
                                app.isThreeViewInitialized = true;
                            }
                            updateThreeView();
                            animateThree();
                            
                            // Resize renderer for fullscreen
                            if (app.threeRenderer && app.threeCamera) {
                                handleWindowResize();
                            }
                        }
                    });
                }
            });
        }
    }
    
    // Enter immersive 3D mode
    function enterImmersive3DMode() {
        // Hide header and sidebar with animation
        gsap.to(elements.appHeader, {
            y: -100,
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut"
        });
        
        gsap.to(elements.sidebar, {
            x: -300,
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut"
        });
        
        // Expand main content to fill entire viewport
        gsap.to(elements.mainContent, {
            marginLeft: 0,
            marginTop: 0,
            duration: 0.4,
            ease: "power2.inOut"
        });
        
        // Create floating view controls
        createFloatingControls();
        
        // Add fullscreen class for CSS adjustments
        document.body.classList.add('immersive-3d');
    }
    
    // Exit immersive 3D mode
    function exitImmersive3DMode() {
        // Show header and sidebar with animation
        gsap.to(elements.appHeader, {
            y: 0,
            opacity: 1,
            duration: 0.4,
            ease: "power2.inOut"
        });
        
        gsap.to(elements.sidebar, {
            x: 0,
            opacity: 1,
            duration: 0.4,
            ease: "power2.inOut"
        });
        
        // Restore main content to original state (no margins in CSS)
        gsap.to(elements.mainContent, {
            marginLeft: 0,  // Original CSS has no margin
            marginTop: 0,   // Original CSS has no margin
            duration: 0.4,
            ease: "power2.inOut"
        });
        
        // Reset any transform properties that might affect layout
        gsap.set([elements.appHeader, elements.sidebar, elements.mainContent], {
            clearProps: "transform"
        });
        
        // Reset 3D view positioning
        gsap.set(elements.threeView, {
            clearProps: "position,top,left,width,height,zIndex"
        });
        
        // Remove floating controls
        removeFloatingControls();
        
        // Remove fullscreen class
        document.body.classList.remove('immersive-3d');
    }
    
    // Create floating view controls
    function createFloatingControls() {
        // Check if controls already exist
        if (document.getElementById('floating-controls')) return;
        
        const floatingControls = document.createElement('div');
        floatingControls.id = 'floating-controls';
        floatingControls.innerHTML = `
            <div class="floating-view-toggle">
                <button class="floating-btn active" data-view="3d" title="3D View">
                    <i class="fas fa-cube"></i>
                </button>
                <button class="floating-btn" data-view="2d" title="2D View">
                    <i class="fas fa-th-large"></i>
                </button>
            </div>
            <div class="floating-actions">
                <button class="floating-btn" id="floating-new-note" title="New Note">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="floating-btn" id="floating-reset-camera" title="Reset Camera">
                    <i class="fas fa-home"></i>
                </button>
            </div>
        `;
        
        // Add styles
        floatingControls.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        
        // Add CSS for floating buttons
        const style = document.createElement('style');
        style.textContent = `
            .floating-view-toggle, .floating-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .floating-btn {
                width: 50px;
                height: 50px;
                border: none;
                border-radius: 25px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                font-size: 18px;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .floating-btn:hover {
                background: rgba(66, 133, 244, 0.9);
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(66, 133, 244, 0.4);
            }
            
            .floating-btn.active {
                background: rgba(66, 133, 244, 1);
                box-shadow: 0 4px 15px rgba(66, 133, 244, 0.5);
            }
            
            .immersive-3d .three-view {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 10;
            }
            
            .immersive-3d .three-canvas {
                width: 100% !important;
                height: 100% !important;
            }
            
            /* Ensure proper reset when exiting immersive mode */
            .notes-view {
                position: relative;
                z-index: 1;
            }
            
            .three-view:not(.active) {
                display: none !important;
            }
        `;
        
        if (!document.getElementById('floating-controls-style')) {
            style.id = 'floating-controls-style';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(floatingControls);
        
        // Add event listeners
        floatingControls.addEventListener('click', handleFloatingControlClick);
        
        // Animate in
        gsap.from(floatingControls, {
            scale: 0,
            rotation: 180,
            opacity: 0,
            duration: 0.5,
            ease: "back.out(1.7)"
        });
    }
    
    // Remove floating controls
    function removeFloatingControls() {
        const floatingControls = document.getElementById('floating-controls');
        if (floatingControls) {
            gsap.to(floatingControls, {
                scale: 0,
                rotation: -180,
                opacity: 0,
                duration: 0.3,
                ease: "power2.in",
                onComplete: () => {
                    floatingControls.remove();
                }
            });
        }
    }
    
    // Handle floating control clicks
    function handleFloatingControlClick(event) {
        const target = event.target.closest('button');
        if (!target) return;
        
        if (target.dataset.view) {
            switchView(target.dataset.view);
            
            // Update active state
            document.querySelectorAll('#floating-controls .floating-btn[data-view]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === target.dataset.view);
            });
        } else if (target.id === 'floating-new-note') {
            openNoteEditor();
        } else if (target.id === 'floating-reset-camera') {
            resetCamera();
        }
    }

    // Select a notebook
    function selectNotebook(notebookId) {
        app.currentNotebook = notebookId;
        app.currentTag = null;
        
        // Update active states
        document.querySelectorAll('.notebook-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === notebookId);
        });
        
        document.querySelectorAll('.tag-item').forEach(item => {
            item.classList.remove('active');
        });
        
        renderNotes();
    }

    // Select a tag
    function selectTag(tagId) {
        app.currentTag = tagId;
        app.currentNotebook = 'all';
        
        // Update active states
        document.querySelectorAll('.tag-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === tagId);
        });
        
        document.querySelectorAll('.notebook-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelector('.notebook-item[data-id="all"]').classList.add('active');
        
        renderNotes();
    }

    // Open note editor
    function openNoteEditor(noteId = null) {
        app.editingNote = noteId ? app.notes.find(note => note.id === noteId) : null;
        
        if (app.editingNote) {
            // Edit existing note
            elements.editorTitle.textContent = 'Edit Note';
            elements.noteTitleInput.value = app.editingNote.title;
            elements.noteContentInput.innerHTML = app.editingNote.content;
            elements.noteNotebookSelect.value = app.editingNote.notebookId || '';
            
            // Set selected tags
            updateSelectedTags(app.editingNote.tags);
        } else {
            // Create new note
            elements.editorTitle.textContent = 'New Note';
            elements.noteTitleInput.value = '';
            elements.noteContentInput.innerHTML = '';
            elements.noteNotebookSelect.value = '';
            
            // Clear selected tags
            updateSelectedTags([]);
        }
        
        // Show editor with animation
        elements.noteEditorModal.classList.add('active');
        gsap.from(elements.noteEditor, {
            scale: 0.9,
            opacity: 0,
            duration: 0.3,
            ease: "back.out(1.7)"
        });
        
        // Focus on title input
        setTimeout(() => {
            elements.noteTitleInput.focus();
        }, 300);
        
        updateSaveStatus();
    }

    // Close note editor
    function closeNoteEditor() {
        // Check if there are unsaved changes
        if (elements.saveStatus.classList.contains('saving')) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }
        
        // Hide editor with animation
        gsap.to(elements.noteEditor, {
            scale: 0.9,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
                elements.noteEditorModal.classList.remove('active');
            }
        });
    }

    // Save note
    async function saveNote() {
        const title = elements.noteTitleInput.value.trim();
        const content = elements.noteContentInput.innerHTML.trim();
        const notebookId = elements.noteNotebookSelect.value;
        
        if (!title) {
            showToast('Please enter a title for your note', 'error');
            return;
        }
        
        const selectedTags = Array.from(elements.editorSelectedTags.querySelectorAll('.editor-tag'))
            .map(tagEl => tagEl.dataset.id);
        
        let noteData;
        if (app.editingNote) {
            // Update existing note
            noteData = {
                ...app.editingNote,
                title,
                content,
                notebookId,
                tags: selectedTags,
                updatedAt: new Date().toISOString()
            };
            
            // Update the note in the array
            const index = app.notes.findIndex(n => n.id === app.editingNote.id);
            if (index !== -1) {
                app.notes[index] = noteData;
            }
            app.editingNote = noteData;
            
            showToast('Note updated successfully', 'success');
        } else {
            // Create new note
            noteData = {
                id: generateId(),
                title,
                content,
                notebookId,
                tags: selectedTags,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            app.notes.unshift(noteData);
            showToast('Note created successfully', 'success');
        }
        
        // AI Enhancement - Process note with AI if available
        if (app.aiService && app.aiService.getAIStatus().available) {
            try {
                const enhancedNote = await app.aiService.saveNoteWithAI(noteData, {
                    enableSmartTitling: true,
                    enableSmartTagging: true,
                    enableNotebookSuggestion: true,
                    showSuggestions: !app.editingNote // Show suggestions for new notes
                });
                
                // Update the note with AI enhancements
                if (app.editingNote) {
                    const index = app.notes.findIndex(n => n.id === enhancedNote.id);
                    if (index !== -1) {
                        app.notes[index] = enhancedNote;
                    }
                } else {
                    app.notes[0] = enhancedNote;
                }
            } catch (error) {
                console.error('AI enhancement failed:', error);
            }
        }
        
        saveNotes();
        saveTags(); // Save tags in case new ones were created
        saveNotebooks(); // Save notebooks in case new ones were created
        renderNotes();
        renderTags();
        renderNotebooks();
        updateNotebookSelector();
        updateTagSelector();
        updateSaveStatus();
        
        // Close editor after a short delay
        setTimeout(() => {
            closeNoteEditor();
        }, 500);
    }

    // Delete note
    function deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            app.notes = app.notes.filter(note => note.id !== noteId);
            saveNotes();
            renderNotes();
            showToast('Note deleted successfully', 'info');
        }
    }

    // Update save status
    function updateSaveStatus() {
        const statusEl = elements.saveStatus;
        const statusText = statusEl.querySelector('span');
        
        if (app.editingNote) {
            const titleChanged = elements.noteTitleInput.value !== app.editingNote.title;
            const contentChanged = elements.noteContentInput.innerHTML !== app.editingNote.content;
            
            if (titleChanged || contentChanged) {
                statusEl.classList.add('saving');
                statusEl.classList.remove('saved');
                statusText.textContent = 'Unsaved changes';
            } else {
                statusEl.classList.remove('saving');
                statusEl.classList.add('saved');
                statusText.textContent = 'Saved';
            }
        } else {
            if (elements.noteTitleInput.value.trim() || elements.noteContentInput.innerHTML.trim()) {
                statusEl.classList.add('saving');
                statusEl.classList.remove('saved');
                statusText.textContent = 'Unsaved changes';
            } else {
                statusEl.classList.remove('saving');
                statusEl.classList.add('saved');
                statusText.textContent = 'Saved';
            }
        }
    }

    // Update selected tags in editor
    function updateSelectedTags(tagIds) {
        elements.editorSelectedTags.innerHTML = '';
        
        tagIds.forEach(tagId => {
            const tag = app.tags.find(t => t.id === tagId);
            if (tag) {
                const tagEl = document.createElement('div');
                tagEl.className = 'editor-tag';
                tagEl.dataset.id = tag.id;
                tagEl.innerHTML = `
                    ${tag.name}
                    <button class="editor-tag-remove">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                tagEl.querySelector('.editor-tag-remove').addEventListener('click', () => {
                    removeTagFromSelection(tag.id);
                });
                
                elements.editorSelectedTags.appendChild(tagEl);
            }
        });
        
        updateTagSelector();
    }

    // Update tag selector in editor
    function updateTagSelector() {
        elements.tagSelector.innerHTML = '';
        
        const selectedTagIds = Array.from(elements.editorSelectedTags.querySelectorAll('.editor-tag'))
            .map(tagEl => tagEl.dataset.id);
        
        app.tags.forEach(tag => {
            if (!selectedTagIds.includes(tag.id)) {
                const tagOption = document.createElement('div');
                tagOption.className = 'tag-option';
                tagOption.dataset.id = tag.id;
                tagOption.innerHTML = `
                    <div class="tag-color" style="background-color: ${tag.color}"></div>
                    ${tag.name}
                `;
                
                tagOption.addEventListener('click', () => {
                    addTagToSelection(tag.id);
                });
                
                elements.tagSelector.appendChild(tagOption);
            }
        });
    }

    // Add tag to selection
    function addTagToSelection(tagId) {
        const selectedTagIds = Array.from(elements.editorSelectedTags.querySelectorAll('.editor-tag'))
            .map(tagEl => tagEl.dataset.id);
        
        if (!selectedTagIds.includes(tagId)) {
            selectedTagIds.push(tagId);
            updateSelectedTags(selectedTagIds);
            updateSaveStatus();
        }
    }

    // Remove tag from selection
    function removeTagFromSelection(tagId) {
        const selectedTagIds = Array.from(elements.editorSelectedTags.querySelectorAll('.editor-tag'))
            .map(tagEl => tagEl.dataset.id)
            .filter(id => id !== tagId);
        
        updateSelectedTags(selectedTagIds);
        updateSaveStatus();
    }

    // Update notebook selector in editor
    function updateNotebookSelector() {
        elements.noteNotebookSelect.innerHTML = '<option value="">Select a notebook</option>';
        
        app.notebooks.forEach(notebook => {
            const option = document.createElement('option');
            option.value = notebook.id;
            option.textContent = notebook.name;
            elements.noteNotebookSelect.appendChild(option);
        });
    }

    // Handle search
    function handleSearch() {
        app.searchTerm = elements.searchInput.value.trim();
        renderNotes();
    }

    // Toggle filter menu
    function toggleFilterMenu() {
        elements.filterMenu.classList.toggle('active');
    }

    // Apply filter
    function applyFilter(filter) {
        app.sortFilter = filter;
        elements.filterMenu.classList.remove('active');
        renderNotes();
    }

    // Add new notebook
    function addNotebook() {
        const name = prompt('Enter notebook name:');
        if (name && name.trim()) {
            const newNotebook = {
                id: generateId(),
                name: name.trim(),
                createdAt: new Date().toISOString()
            };
            
            app.notebooks.push(newNotebook);
            saveNotebooks();
            renderNotebooks();
            updateNotebookSelector();
            showToast('Notebook created successfully', 'success');
        }
    }

    // Add new tag
    function addTag() {
        const name = prompt('Enter tag name:');
        if (name && name.trim()) {
            // Generate a random color
            const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const newTag = {
                id: generateId(),
                name: name.trim(),
                color
            };
            
            app.tags.push(newTag);
            saveTags();
            renderTags();
            updateTagSelector();
            showToast('Tag created successfully', 'success');
        }
    }

    // Initialize Three.js
    function initThreeJS() {
        // Scene
        app.threeScene = new THREE.Scene();
        app.threeScene.background = new THREE.Color(0xf5f7fa);
        
        // Camera
        const aspect = elements.threeCanvas.clientWidth / elements.threeCanvas.clientHeight;
        app.threeCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        app.threeCamera.position.set(0, 0, 30);
        
        // Renderer
        app.threeRenderer = new THREE.WebGLRenderer({ 
            canvas: elements.threeCanvas,
            antialias: true 
        });
        app.threeRenderer.setSize(elements.threeCanvas.clientWidth, elements.threeCanvas.clientHeight);
        app.threeRenderer.setPixelRatio(window.devicePixelRatio);
        
        // Controls
        app.threeControls = new THREE.OrbitControls(app.threeCamera, app.threeRenderer.domElement);
        app.threeControls.enableDamping = true;
        app.threeControls.dampingFactor = 0.05;
        app.threeControls.screenSpacePanning = false;
        app.threeControls.minDistance = 10;
        app.threeControls.maxDistance = 50;
        
        // Enhanced lighting for holographic effect
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        app.threeScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(1, 1, 1);
        directionalLight.castShadow = true;
        app.threeScene.add(directionalLight);
        
        // Add colored accent lights for holographic atmosphere
        const blueLight = new THREE.PointLight(0x00ffff, 0.3, 50);
        blueLight.position.set(-15, 10, 10);
        app.threeScene.add(blueLight);
        
        const purpleLight = new THREE.PointLight(0xff00ff, 0.2, 50);
        purpleLight.position.set(15, -10, 10);
        app.threeScene.add(purpleLight);
        
        // Animated rim light
        const rimLight = new THREE.DirectionalLight(0x00ddff, 0.4);
        rimLight.position.set(-1, 0, 1);
        app.threeScene.add(rimLight);
        
        // Store lights for animation
        app.sceneLights = { blueLight, purpleLight, rimLight };
        
        // Particle system for background
        createParticleSystem();
        
        // Raycaster for mouse interaction
        app.raycaster = new THREE.Raycaster();
        app.mouse = new THREE.Vector2();
        
        // Mouse event listeners
        elements.threeCanvas.addEventListener('mousemove', onThreeMouseMove);
        elements.threeCanvas.addEventListener('click', onThreeClick);
        
        // Initial render
        app.threeRenderer.render(app.threeScene, app.threeCamera);
    }

    // Create particle system for background
    function createParticleSystem() {
        const particlesCount = 200;
        const positions = new Float32Array(particlesCount * 3);
        const colors = new Float32Array(particlesCount * 3);
        
        for (let i = 0; i < particlesCount; i++) {
            const i3 = i * 3;
            
            // Position
            positions[i3] = (Math.random() - 0.5) * 100;
            positions[i3 + 1] = (Math.random() - 0.5) * 100;
            positions[i3 + 2] = (Math.random() - 0.5) * 100;
            
            // Color
            const color = new THREE.Color();
            color.setHSL(Math.random() * 0.2 + 0.5, 0.7, 0.5);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        const particlesGeometry = new THREE.BufferGeometry();
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        app.threeScene.add(particles);
    }

    // Update Three.js view
    function updateThreeView() {
        if (!app.threeScene) return;
        
        // Clear existing note cards
        app.noteCards.forEach(card => {
            app.threeScene.remove(card);
        });
        app.noteCards = [];
        
        // Get filtered notes
        let filteredNotes = [...app.notes];
        
        if (app.currentNotebook !== 'all') {
            filteredNotes = filteredNotes.filter(note => note.notebookId === app.currentNotebook);
        }
        
        if (app.currentTag) {
            filteredNotes = filteredNotes.filter(note => note.tags.includes(app.currentTag));
        }
        
        if (app.searchTerm) {
            const searchLower = app.searchTerm.toLowerCase();
            filteredNotes = filteredNotes.filter(note => 
                note.title.toLowerCase().includes(searchLower) || 
                note.content.toLowerCase().includes(searchLower)
            );
        }
        
        // Create 3D note cards
        filteredNotes.forEach((note, index) => {
            const noteCard = createThreeNoteCard(note, index, filteredNotes.length);
            if (noteCard) {
                app.noteCards.push(noteCard);
                app.threeScene.add(noteCard);
            }
        });
        
        // Arrange notes in a grid by default
        arrangeNotes('grid');
    }

    // Create a 3D note card
    function createThreeNoteCard(note, index, total) {
        // Create card group to hold multiple meshes
        const cardGroup = new THREE.Group();
        
        // Create main card geometry
        const cardWidth = 8;
        const cardHeight = 6;
        const cardGeometry = new THREE.BoxGeometry(cardWidth, cardHeight, 0.2);
        
        // Create glow geometry (slightly larger)
        const glowGeometry = new THREE.BoxGeometry(cardWidth + 0.5, cardHeight + 0.5, 0.3);
        
        // Create glow material
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });
        
        // Create glow mesh
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.z = -0.1;
        
        // Create card material
        const cardMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            shininess: 30,
            transparent: true,
            opacity: 0.95
        });
        
        // Create card mesh
        const card = new THREE.Mesh(cardGeometry, cardMaterial);
        
        // Add card data to both meshes
        card.userData = { note, type: 'card', glowMesh: glowMesh };
        glowMesh.userData = { note, type: 'glow', cardMesh: card };
        
        // Add to group
        cardGroup.add(glowMesh);
        cardGroup.add(card);
        cardGroup.userData = { note, type: 'group', cardMesh: card, glowMesh: glowMesh };
        
        // Create text texture for the card
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 384;
        
        // Fill background
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add border
        context.strokeStyle = '#e0e0e0';
        context.lineWidth = 4;
        context.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Add title
        context.fillStyle = '#212121';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText(note.title.substring(0, 20) + (note.title.length > 20 ? '...' : ''), canvas.width / 2, 50);
        
        // Add content preview
        context.fillStyle = '#757575';
        context.font = '20px Arial';
        context.textAlign = 'left';
        
        // Handle text wrapping
        const maxWidth = canvas.width - 40;
        const lineHeight = 25;
        let y = 100;
        
        const words = note.content.substring(0, 150).split(' ');
        let line = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && i > 0) {
                context.fillText(line, 20, y);
                line = words[i] + ' ';
                y += lineHeight;
                
                if (y > canvas.height - 60) break;
            } else {
                line = testLine;
            }
        }
        context.fillText(line, 20, y);
        
        // Add date
        const date = new Date(note.updatedAt);
        context.fillStyle = '#9e9e9e';
        context.font = '16px Arial';
        context.textAlign = 'right';
        context.fillText(date.toLocaleDateString(), canvas.width - 20, canvas.height - 20);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        const frontMaterial = new THREE.MeshBasicMaterial({ map: texture });
        
        // Apply materials to card faces
        card.material = [
            new THREE.MeshPhongMaterial({ color: 0xf5f5f5 }), // right
            new THREE.MeshPhongMaterial({ color: 0xf5f5f5 }), // left
            new THREE.MeshPhongMaterial({ color: 0xf5f5f5 }), // top
            new THREE.MeshPhongMaterial({ color: 0xf5f5f5 }), // bottom
            frontMaterial, // front
            new THREE.MeshPhongMaterial({ color: 0xe0e0e0 })  // back
        ];
        
        return cardGroup;
    }

    // Arrange notes in 3D space
    function arrangeNotes(arrangement) {
        const count = app.noteCards.length;
        
        if (count === 0) return;
        
        switch (arrangement) {
            case 'grid':
                arrangeInGrid();
                break;
            case 'sphere':
                arrangeInSphere();
                break;
        }
    }

    // Arrange notes in a grid
    function arrangeInGrid() {
        const count = app.noteCards.length;
        const cols = Math.ceil(Math.sqrt(count));
        const rows = Math.ceil(count / cols);
        const spacing = 12;
        
        app.noteCards.forEach((card, i) => {
            if (!card) return; // Skip if card doesn't exist
            
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const x = (col - (cols - 1) / 2) * spacing;
            const y = (row - (rows - 1) / 2) * spacing;
            const z = 0;
            
            // Animate to new position
            gsap.to(card.position, {
                x,
                y,
                z,
                duration: 1,
                ease: "power2.inOut"
            });
            
            // Reset rotation
            gsap.to(card.rotation, {
                x: 0,
                y: 0,
                z: 0,
                duration: 1,
                ease: "power2.inOut"
            });
        });
    }

    // Arrange notes in a sphere
    function arrangeInSphere() {
        const count = app.noteCards.length;
        const radius = 20;
        
        app.noteCards.forEach((card, i) => {
            if (!card) return; // Skip if card doesn't exist
            
            const phi = Math.acos(-1 + (2 * i) / count);
            const theta = Math.sqrt(count * Math.PI) * phi;
            
            const x = radius * Math.cos(theta) * Math.sin(phi);
            const y = radius * Math.sin(theta) * Math.sin(phi);
            const z = radius * Math.cos(phi);
            
            // Animate to new position
            gsap.to(card.position, {
                x,
                y,
                z,
                duration: 1.5,
                ease: "power2.inOut"
            });
            
            // Rotate to face center
            gsap.to(card.rotation, {
                x: phi,
                y: theta,
                z: 0,
                duration: 1.5,
                ease: "power2.inOut"
            });
        });
    }

    // Reset camera position
    function resetCamera() {
        if (!app.threeCamera || !app.threeControls) return;
        
        gsap.to(app.threeCamera.position, {
            x: 0,
            y: 0,
            z: 30,
            duration: 1,
            ease: "power2.inOut"
        });
        
        gsap.to(app.threeControls.target, {
            x: 0,
            y: 0,
            z: 0,
            duration: 1,
            ease: "power2.inOut",
            onUpdate: () => {
                app.threeControls.update();
            }
        });
    }

    // Handle mouse move in 3D view
    function onThreeMouseMove(event) {
        if (app.currentView !== '3d' || !app.raycaster || !app.mouse || !app.threeCamera) return;
        
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = elements.threeCanvas.getBoundingClientRect();
        app.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        app.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster
        app.raycaster.setFromCamera(app.mouse, app.threeCamera);
        
        // Get all meshes for intersection (including individual card meshes)
        const allMeshes = [];
        app.noteCards.forEach(cardGroup => {
            if (cardGroup && cardGroup.userData && cardGroup.userData.cardMesh) {
                allMeshes.push(cardGroup.userData.cardMesh);
            }
        });
        
        // Check for intersections
        const intersects = app.raycaster.intersectObjects(allMeshes);
        
        // Handle hover state changes
        if (intersects.length > 0) {
            const intersectedCard = intersects[0].object;
            const cardGroup = intersectedCard.parent;
            
            // If this is a new hover target
            if (app.hoveredCard !== cardGroup) {
                // Reset previous hovered card
                if (app.hoveredCard) {
                    resetCardToNormal(app.hoveredCard);
                }
                
                // Close any other expanded previews when hovering a different card
                app.noteCards.forEach(otherCard => {
                    if (otherCard !== cardGroup && otherCard.userData && otherCard.userData.expandedPreview) {
                        closeExpandedPreview(otherCard);
                    }
                });
                
                // Set new hovered card
                app.hoveredCard = cardGroup;
                expandCardHolographic(cardGroup);
            }
            
            // Change cursor
            elements.threeCanvas.style.cursor = 'pointer';
        } else {
            // No intersection - reset hovered card if any
            if (app.hoveredCard) {
                resetCardToNormal(app.hoveredCard);
                app.hoveredCard = null;
            }
            elements.threeCanvas.style.cursor = 'grab';
        }
    }
    
    // Expand card with holographic effect
    function expandCardHolographic(cardGroup) {
        if (!cardGroup || !cardGroup.userData) return;
        
        const { cardMesh, glowMesh } = cardGroup.userData;
        
        // Kill any existing timeline
        if (app.hoverTimeline) {
            app.hoverTimeline.kill();
        }
        
        // Create new timeline for smooth animation
        app.hoverTimeline = gsap.timeline();
        
        // Store original position for restoration
        if (!cardGroup.userData.originalPosition) {
            cardGroup.userData.originalPosition = cardGroup.position.clone();
            cardGroup.userData.originalScale = cardGroup.scale.clone();
        }
        
        // Bring card forward and scale up
        app.hoverTimeline
            .to(cardGroup.position, {
                z: 15, // Bring to front
                duration: 0.4,
                ease: "power2.out"
            }, 0)
            .to(cardGroup.scale, {
                x: 1.3,
                y: 1.3,
                z: 1.2,
                duration: 0.4,
                ease: "power2.out"
            }, 0)
            .to(cardGroup.rotation, {
                x: 0.1,
                y: Math.sin(Date.now() * 0.001) * 0.1,
                duration: 0.4,
                ease: "power2.out"
            }, 0);
        
        // Glow effect
        if (glowMesh && glowMesh.material) {
            app.hoverTimeline
                .to(glowMesh.material, {
                    opacity: 0.6,
                    duration: 0.3,
                    ease: "power2.out"
                }, 0)
                .to(glowMesh.scale, {
                    x: 1.2,
                    y: 1.2,
                    z: 1.2,
                    duration: 0.4,
                    ease: "power2.out"
                }, 0);
        }
        
        // Add subtle floating animation
        app.hoverTimeline.to(cardGroup.position, {
            y: cardGroup.userData.originalPosition.y + 2,
            duration: 1.5,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true
        }, 0.4);
        
        // Add shimmering rotation
        app.hoverTimeline.to(cardGroup.rotation, {
            z: 0.05,
            duration: 2,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true
        }, 0.2);
        
        // Enhanced material effect
        if (cardMesh && cardMesh.material && cardMesh.material[4]) {
            const frontMaterial = cardMesh.material[4];
            if (frontMaterial.emissive) {
                app.hoverTimeline.to(frontMaterial.emissive, {
                    r: 0.1,
                    g: 0.3,
                    b: 0.5,
                    duration: 0.3,
                    ease: "power2.out"
                }, 0);
            }
        }
        
        // Create expanded content preview
        setTimeout(() => {
            if (app.hoveredCard === cardGroup) {
                createExpandedPreview(cardGroup);
            }
        }, 800);
    }
    
    // Create expanded content preview
    function createExpandedPreview(cardGroup) {
        if (!cardGroup || !cardGroup.userData || cardGroup.userData.expandedPreview) return;
        
        const note = cardGroup.userData.note;
        
        // Calculate required canvas height based on content
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        tempCanvas.width = 800;
        
        // Calculate title height
        tempContext.font = 'bold 48px Arial';
        const titleMaxWidth = tempCanvas.width - 60;
        const titleLineHeight = 56;
        const titleWords = note.title.split(' ');
        let titleLine = '';
        let titleLines = [];
        
        for (let i = 0; i < titleWords.length; i++) {
            const testLine = titleLine + titleWords[i] + ' ';
            const metrics = tempContext.measureText(testLine);
            
            if (metrics.width > titleMaxWidth && i > 0) {
                titleLines.push(titleLine.trim());
                titleLine = titleWords[i] + ' ';
            } else {
                titleLine = testLine;
            }
        }
        if (titleLine.trim()) {
            titleLines.push(titleLine.trim());
        }
        
        // Convert HTML content to plain text while preserving line breaks
        function htmlToText(html) {
            // Create a temporary div to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Convert common HTML elements to text equivalents
            tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
            tempDiv.querySelectorAll('p').forEach(p => {
                if (p.nextSibling) p.appendChild(document.createTextNode('\n'));
            });
            tempDiv.querySelectorAll('div').forEach(div => {
                if (div.nextSibling) div.appendChild(document.createTextNode('\n'));
            });
            
            return tempDiv.textContent || tempDiv.innerText || '';
        }
        
        const plainTextContent = htmlToText(note.content);
        
        // Calculate content height with proper line break handling
        tempContext.font = '24px Arial';
        const maxWidth = tempCanvas.width - 60;
        const lineHeight = 32;
        let contentLines = 0;
        
        // Split by line breaks first, then wrap each line
        const paragraphs = plainTextContent.split('\n');
        
        for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') {
                contentLines++; // Empty line
                continue;
            }
            
            const words = paragraph.split(' ');
            let line = '';
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = tempContext.measureText(testLine);
                
                if (metrics.width > maxWidth && i > 0) {
                    contentLines++;
                    line = words[i] + ' ';
                } else {
                    line = testLine;
                }
            }
            if (line.trim()) {
                contentLines++;
            }
        }
        
        // Calculate total required height
        const titleHeight = titleLines.length * titleLineHeight;
        const contentHeight = contentLines * lineHeight;
        const paddingAndSpacing = 160; // Top padding + spacing + bottom padding
        const requiredHeight = Math.max(600, titleHeight + contentHeight + paddingAndSpacing);
        
        // Create actual canvas with calculated height
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = requiredHeight;
        
        // Create gradient background
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 50, 100, 0.95)');
        gradient.addColorStop(1, 'rgba(0, 20, 40, 0.95)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add holographic border
        context.strokeStyle = '#00ffff';
        context.lineWidth = 6;
        context.setLineDash([10, 5]);
        context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        context.setLineDash([]);
        
        // Title with wrapping
        context.fillStyle = '#ffffff';
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        
        let titleY = 80;
        
        // Draw title lines (reuse calculated titleLines)
        titleLines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, titleY + (index * titleLineHeight));
        });
        
        // Content - show ALL content with proper formatting preservation
        context.fillStyle = '#e0e0e0';
        context.font = '24px Arial';
        context.textAlign = 'left';
        
        const contentMaxWidth = canvas.width - 60;
        const contentLineHeight = 32;
        let y = titleY + (titleLines.length * titleLineHeight) + 40; // Dynamic starting position based on title height
        
        // Render content with preserved line breaks and formatting
        for (const paragraph of paragraphs) {
            if (paragraph.trim() === '') {
                y += contentLineHeight; // Empty line spacing
                continue;
            }
            
            const words = paragraph.split(' ');
            let line = '';
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = context.measureText(testLine);
                
                if (metrics.width > contentMaxWidth && i > 0) {
                    context.fillText(line, 30, y);
                    line = words[i] + ' ';
                    y += contentLineHeight;
                } else {
                    line = testLine;
                }
            }
            // Draw final line of paragraph
            if (line.trim()) {
                context.fillText(line, 30, y);
                y += contentLineHeight;
            }
        }
        
        // Date and metadata
        const date = new Date(note.updatedAt);
        context.fillStyle = '#00ccff';
        context.font = '20px Arial';
        context.textAlign = 'right';
        context.fillText(date.toLocaleDateString(), canvas.width - 30, canvas.height - 40);
        
        // Create expanded preview geometry and material with dynamic height
        const aspectRatio = canvas.width / canvas.height;
        const previewWidth = 16;
        const previewHeight = previewWidth / aspectRatio;
        const previewGeometry = new THREE.PlaneGeometry(previewWidth, previewHeight);
        const previewTexture = new THREE.CanvasTexture(canvas);
        previewTexture.minFilter = THREE.LinearFilter;
        previewTexture.magFilter = THREE.LinearFilter;
        
        const previewMaterial = new THREE.MeshBasicMaterial({
            map: previewTexture,
            transparent: true,
            opacity: 0
        });
        
        const previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
        previewMesh.position.copy(cardGroup.position);
        previewMesh.position.x += 12;
        previewMesh.position.z += 5;
        
        // Add to scene
        app.threeScene.add(previewMesh);
        cardGroup.userData.expandedPreview = previewMesh;
        
        // Animate in
        gsap.to(previewMaterial, {
            opacity: 0.95,
            duration: 0.5,
            ease: "power2.out"
        });
        
        gsap.from(previewMesh.scale, {
            x: 0.1,
            y: 0.1,
            z: 0.1,
            duration: 0.5,
            ease: "back.out(1.7)"
        });
    }
    
    // Reset card to normal state
    function resetCardToNormal(cardGroup) {
        if (!cardGroup || !cardGroup.userData) return;
        
        const { cardMesh, glowMesh, originalPosition, originalScale } = cardGroup.userData;
        
        // Kill hover timeline
        if (app.hoverTimeline) {
            app.hoverTimeline.kill();
            app.hoverTimeline = null;
        }
        
        // Reset position, scale, and rotation
        if (originalPosition && originalScale) {
            gsap.to(cardGroup.position, {
                x: originalPosition.x,
                y: originalPosition.y,
                z: originalPosition.z,
                duration: 0.5,
                ease: "power2.out"
            });
            
            gsap.to(cardGroup.scale, {
                x: originalScale.x,
                y: originalScale.y,
                z: originalScale.z,
                duration: 0.5,
                ease: "power2.out"
            });
            
            gsap.to(cardGroup.rotation, {
                x: 0,
                y: 0,
                z: 0,
                duration: 0.5,
                ease: "power2.out"
            });
        }
        
        // Reset glow
        if (glowMesh && glowMesh.material) {
            gsap.to(glowMesh.material, {
                opacity: 0,
                duration: 0.3,
                ease: "power2.out"
            });
            
            gsap.to(glowMesh.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 0.5,
                ease: "power2.out"
            });
        }
        
        // Reset material glow
        if (cardMesh && cardMesh.material && cardMesh.material[4]) {
            const frontMaterial = cardMesh.material[4];
            if (frontMaterial.emissive) {
                gsap.to(frontMaterial.emissive, {
                    r: 0,
                    g: 0,
                    b: 0,
                    duration: 0.3,
                    ease: "power2.out"
                });
            }
        }
        
        // Note: Expanded preview stays visible until clicked - removed auto-hide logic
    }
    
    // Close expanded preview
    function closeExpandedPreview(cardGroup) {
        if (!cardGroup || !cardGroup.userData || !cardGroup.userData.expandedPreview) return;
        
        const preview = cardGroup.userData.expandedPreview;
        
        gsap.to(preview.material, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => {
                app.threeScene.remove(preview);
                preview.geometry.dispose();
                preview.material.dispose();
            }
        });
        
        gsap.to(preview.scale, {
            x: 0.1,
            y: 0.1,
            z: 0.1,
            duration: 0.4,
            ease: "power2.in"
        });
        
        // Add a magical disappearing effect
        gsap.to(preview.rotation, {
            z: Math.PI * 2,
            duration: 0.4,
            ease: "power2.in"
        });
        
        cardGroup.userData.expandedPreview = null;
    }

    // Handle click in 3D view
    function onThreeClick(event) {
        if (app.currentView !== '3d' || !app.raycaster || !app.mouse || !app.threeCamera) return;
        
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = elements.threeCanvas.getBoundingClientRect();
        app.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        app.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update raycaster
        app.raycaster.setFromCamera(app.mouse, app.threeCamera);
        
        // Check if clicking on a card or its preview
        if (app.hoveredCard && app.hoveredCard.userData && app.hoveredCard.userData.note) {
            const cardGroup = app.hoveredCard;
            const note = cardGroup.userData.note;
            
            // If there's an expanded preview, check if we should close it or open editor
            if (cardGroup.userData.expandedPreview) {
                // Close the expanded preview with magical effect
                closeExpandedPreview(cardGroup);
                return; // Don't open editor, just close preview
            }
            
            // No preview open, proceed with normal click behavior (open editor)
            gsap.to(cardGroup.scale, {
                x: 1.5,
                y: 1.5,
                z: 1.4,
                duration: 0.1,
                ease: "power2.out",
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    openNoteEditor(note.id);
                }
            });
            
            // Flash effect
            if (cardGroup.userData.glowMesh) {
                gsap.to(cardGroup.userData.glowMesh.material, {
                    opacity: 1,
                    duration: 0.1,
                    ease: "power2.out",
                    yoyo: true,
                    repeat: 1
                });
            }
        } else {
            // Clicked on empty space - close any open previews
            app.noteCards.forEach(cardGroup => {
                if (cardGroup && cardGroup.userData && cardGroup.userData.expandedPreview) {
                    closeExpandedPreview(cardGroup);
                }
            });
        }
    }

    // Animate Three.js scene
    function animateThree() {
        if (app.currentView !== '3d' || !app.threeRenderer || !app.threeScene || !app.threeCamera) {
            return;
        }
        
        app.animationId = requestAnimationFrame(animateThree);
        
        // Update controls
        if (app.threeControls) {
            app.threeControls.update();
        }
        
        // Animate scene elements
        const time = Date.now() * 0.001;
        
        // Animate scene lights for holographic atmosphere
        if (app.sceneLights) {
            const { blueLight, purpleLight, rimLight } = app.sceneLights;
            
            // Oscillating light positions
            if (blueLight) {
                blueLight.position.y = 10 + Math.sin(time * 0.5) * 3;
                blueLight.intensity = 0.2 + Math.sin(time * 2) * 0.1;
            }
            
            if (purpleLight) {
                purpleLight.position.x = 15 + Math.cos(time * 0.7) * 5;
                purpleLight.intensity = 0.15 + Math.cos(time * 1.5) * 0.05;
            }
            
            if (rimLight) {
                rimLight.position.x = -1 + Math.sin(time * 0.3) * 0.5;
                rimLight.intensity = 0.3 + Math.sin(time * 1.8) * 0.1;
            }
        }
        
        // Subtle rotation for non-hovered cards
        app.noteCards.forEach(card => {
            if (card && card !== app.hoveredCard) {
                card.rotation.z += 0.001;
                // Add gentle floating for all cards
                if (card.userData && card.userData.originalPosition) {
                    card.position.y = card.userData.originalPosition.y + Math.sin(time + card.position.x) * 0.2;
                }
            }
        });
        
        // Render scene
        app.threeRenderer.render(app.threeScene, app.threeCamera);
    }

    // Handle window resize
    function handleWindowResize() {
        if (app.threeCamera && app.threeRenderer && elements.threeCanvas) {
            let width, height;
            
            // Check if in immersive 3D mode
            if (document.body.classList.contains('immersive-3d')) {
                // Use full viewport dimensions
                width = window.innerWidth;
                height = window.innerHeight;
            } else {
                // Use container dimensions
                width = elements.threeCanvas.clientWidth;
                height = elements.threeCanvas.clientHeight;
            }
            
            app.threeCamera.aspect = width / height;
            app.threeCamera.updateProjectionMatrix();
            
            app.threeRenderer.setSize(width, height);
            app.threeRenderer.setPixelRatio(window.devicePixelRatio);
        }
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        const toastEl = elements.toast;
        const toastMessage = toastEl.querySelector('.toast-message');
        const toastIcon = toastEl.querySelector('.toast-icon');
        
        // Set message
        toastMessage.textContent = message;
        
        // Set type
        toastEl.className = 'toast';
        toastEl.classList.add(type);
        
        // Set icon
        switch (type) {
            case 'success':
                toastIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
                break;
            case 'error':
                toastIcon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'info':
            default:
                toastIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
                break;
        }
        
        // Show toast
        toastEl.classList.add('show');
        
        // Hide after delay
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, 3000);
    }

    // Save notes to chrome.storage.local
    function saveNotes() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 'notevault-notes': app.notes });
        } else {
            localStorage.setItem('notevault-notes', JSON.stringify(app.notes));
        }
    }

    // Save notebooks to chrome.storage.local
    function saveNotebooks() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 'notevault-notebooks': app.notebooks });
        } else {
            localStorage.setItem('notevault-notebooks', JSON.stringify(app.notebooks));
        }
    }

    // Save tags to chrome.storage.local
    function saveTags() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 'notevault-tags': app.tags });
        } else {
            localStorage.setItem('notevault-tags', JSON.stringify(app.tags));
        }
    }

    // Generate unique ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // AI Enhancement Functions
    async function enhanceCurrentNote() {
        if (!app.editingNote || !app.aiService) {
            showToast('No note is currently being edited or AI service unavailable', 'error');
            return;
        }
        
        try {
            showToast('Enhancing content with AI...', 'info');
            const enhancement = await app.aiService.manualEnhanceContent(app.editingNote);
            if (enhancement) {
                // Show enhancement options to user
                app.aiService.showContentEnhancement(app.editingNote, enhancement);
                showToast('Content enhancement ready!', 'success');
            } else {
                showToast('No enhancement suggestions available', 'info');
            }
        } catch (error) {
            console.error('Content enhancement failed:', error);
            showToast(`Enhancement failed: ${error.message}`, 'error');
        }
    }
    
    async function analyzeCurrentNote() {
        if (!app.editingNote || !app.aiService) {
            showToast('No note is currently being edited or AI service unavailable', 'error');
            return;
        }
        
        try {
            showToast('Analyzing note...', 'info');
            const analysis = await app.aiService.manualAnalyzeNote(app.editingNote);
            if (analysis) {
                app.aiService.showAnalysisInsights(analysis);
                showToast('Analysis complete!', 'success');
            } else {
                showToast('No analysis results received', 'error');
            }
        } catch (error) {
            console.error('Note analysis failed:', error);
            showToast(`Analysis failed: ${error.message}`, 'error');
        }
    }
    
    function showAISuggestions() {
        if (!app.aiService) {
            showToast('AI service unavailable', 'error');
            return;
        }
        
        const status = app.aiService.getAIStatus();
        if (status.pendingSuggestions > 0) {
            // Show pending suggestions
            app.aiService.showPendingSuggestions();
        } else {
            showToast('No AI suggestions available at the moment', 'info');
        }
    }
    
    // Setup AI action button event listeners
    function setupAIActionButtons() {
        const aiButtons = {
            'ai-explain-btn': 'explain',
            'ai-expand-btn': 'expand', 
            'ai-brainstorm-btn': 'brainstorm',
            'ai-write-btn': 'write',
            'ai-humanize-btn': 'humanize',
            'ai-repurpose-btn': 'repurpose'
        };
        
        Object.entries(aiButtons).forEach(([buttonId, actionType]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => performAIAction(actionType));
            }
        });
    }
    
    // Perform AI action on current note content
    async function performAIAction(actionType) {
        if (!app.aiService || !app.aiService.getAIStatus().available) {
            showToast('AI service unavailable', 'error');
            return;
        }
        
        if (!app.aiService.ai || !app.aiService.ai.isAvailable()) {
            showToast('AI agent not configured. Please configure your API key in settings.', 'error');
            return;
        }
        
        // Find the button that triggered this action and add loading state
        const buttonId = `ai-${actionType}-btn`;
        const button = document.getElementById(buttonId);
        
        try {
            // Get content - selected text or full content
            let content = app.aiService.getSelectedText();
            if (!content) {
                content = app.aiService.getCurrentContent();
            }
            
            if (!content.trim()) {
                showToast('No content to process. Please add some text first.', 'error');
                return;
            }
            
            // Add loading state to button
            if (button) {
                button.classList.add('loading');
                button.disabled = true;
            }
            
            // Show loading indicator modal
            console.log('⏳ About to show loading indicator for:', actionType);
            if (app.aiService.showProcessingIndicator) {
                console.log('✅ showProcessingIndicator method exists, calling it');
                app.aiService.showProcessingIndicator(actionType);
            } else {
                console.warn('⚠️ showProcessingIndicator method not found on aiService');
            }
            
            let result;
            console.log('🤖 Starting AI processing for:', actionType);
            
            try {
                switch (actionType) {
                    case 'explain':
                        console.log('💡 Calling explainContent...');
                        result = await app.aiService.ai.explainContent(content);
                        break;
                    case 'expand':
                        console.log('📝 Calling expandContent...');
                        result = await app.aiService.ai.expandContent(content);
                        break;
                    case 'brainstorm':
                        console.log('🧠 Calling brainstormIdeas...');
                        result = await app.aiService.ai.brainstormIdeas(content);
                        break;
                    case 'write':
                        console.log('✍️ Calling continueWriting...');
                        result = await app.aiService.ai.continueWriting(content);
                        break;
                    case 'humanize':
                        console.log('😄 Calling humanizeContent...');
                        result = await app.aiService.ai.humanizeContent(content);
                        break;
                    case 'repurpose':
                        console.log('♾️ Calling repurposeContent...');
                        result = await app.aiService.ai.repurposeContent(content);
                        break;
                    default:
                        throw new Error(`Unknown action type: ${actionType}`);
                }
                console.log('✅ AI processing completed, result:', result ? 'success' : 'no result');
            } catch (aiError) {
                console.error('❌ AI processing failed:', aiError);
                throw aiError; // Re-throw to be caught by outer try-catch
            }
            
            if (result) {
                console.log('📦 Got result, showing action result modal');
                app.aiService.showActionResult(actionType, result, content);
                showToast(`${actionType} complete!`, 'success');
            } else {
                console.log('⚠️ No result from AI action');
                // Hide loading indicator if no result
                if (app.aiService.hideProcessingIndicator) {
                    app.aiService.hideProcessingIndicator();
                }
                showToast(`No ${actionType} results available`, 'info');
            }
            
        } catch (error) {
            console.error(`❌ AI ${actionType} failed:`, error);
            // Hide loading indicator on error
            if (app.aiService && app.aiService.hideProcessingIndicator) {
                console.log('❌ Hiding loading indicator due to error');
                app.aiService.hideProcessingIndicator();
            }
            showToast(`${actionType} failed: ${error.message}`, 'error');
        } finally {
            // Always remove loading state from button
            if (button) {
                button.classList.remove('loading');
                button.disabled = false;
            }
        }
    }
    
    // Enhanced note opening with AI insights
    function openNoteEditorWithAI(noteId = null) {
        openNoteEditor(noteId);
        
        // Add AI analysis after editor opens
        if (noteId && app.aiService) {
            setTimeout(async () => {
                const note = app.notes.find(n => n.id === noteId);
                if (note) {
                    try {
                        const analysis = await app.aiService.manualAnalyzeNote(note);
                        if (analysis) {
                            app.aiService.updateNoteAnalysisUI(note, analysis);
                        }
                    } catch (error) {
                        console.error('AI analysis failed:', error);
                    }
                }
            }, 1000);
        }
    }
    
    // Enhanced 3D view with AI clustering
    async function updateThreeViewWithAI() {
        updateThreeView();
        
        if (app.aiService && app.aiService.getAIStatus().available && app.noteCards.length > 5) {
            try {
                const insights = await app.aiService.ai.generate3DInsights(app.notes);
                if (insights && insights.clusters) {
                    // Apply AI-suggested clustering to 3D layout
                    applyAIClustering(insights.clusters);
                }
            } catch (error) {
                console.error('3D AI insights failed:', error);
            }
        }
    }
    
    // Apply AI clustering to 3D note layout
    function applyAIClustering(clusters) {
        clusters.forEach((cluster, clusterIndex) => {
            const clusterCards = app.noteCards.filter(card => 
                cluster.note_ids.includes(card.userData.note.id)
            );
            
            if (clusterCards.length > 1) {
                // Position cluster cards closer together
                const centerX = clusterIndex * 15 - (clusters.length - 1) * 7.5;
                const centerY = 0;
                const radius = Math.min(5, clusterCards.length);
                
                clusterCards.forEach((card, index) => {
                    const angle = (index / clusterCards.length) * Math.PI * 2;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    const z = Math.random() * 2 - 1; // Small random Z variation
                    
                    if (typeof gsap !== 'undefined') {
                        gsap.to(card.position, {
                            x, y, z,
                            duration: 2,
                            ease: "power2.inOut"
                        });
                    } else {
                        card.position.set(x, y, z);
                    }
                    
                    // Apply cluster color theme
                    if (card.userData.glowMesh && cluster.color) {
                        card.userData.glowMesh.material.color.setHex(
                            parseInt(cluster.color.replace('#', '0x'))
                        );
                    }
                });
            }
        });
    }
    
    // Expose functions to global scope for AI service
    window.NoteVaultApp = {
        app,
        saveNotes,
        saveTags,
        saveNotebooks,
        renderNotes,
        renderTags,
        renderNotebooks,
        updateNotebookSelector,
        updateTagSelector,
        showToast,
        generateId
    };

    // Initialize the application
    init();
});