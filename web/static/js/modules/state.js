const API_URL = "/api";

// --- Global State ---
window.state = {
    view: 'dashboard',
    filter: 'all',
    tasks: [],
    notesStructure: {},
    currentFolder: null,
    currentNote: null
};
// Export to window for access by other modules without ES6 modules
window.API_URL = API_URL;

