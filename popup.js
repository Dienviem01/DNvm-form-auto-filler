document.addEventListener('DOMContentLoaded', () => {
    const presetsList = document.getElementById('presets-list');
    const addFieldBtn = document.getElementById('add-field');
    const statusBar = document.getElementById('status-bar');
    const template = document.getElementById('preset-template');
    const profileSelect = document.getElementById('profile-select');
    const newProfileBtn = document.getElementById('new-profile');
    const deleteProfileBtn = document.getElementById('delete-profile');
    const extensionActiveToggle = document.getElementById('extension-active');
    const fillModeSelect = document.getElementById('fill-mode');
    const guideModal = document.getElementById('guide-modal');
    const showGuideBtn = document.getElementById('show-guide');
    const closeGuideBtn = document.getElementById('close-guide');
    const themeToggleBtn = document.getElementById('theme-toggle');

    let debounceTimer;
    let profiles = {};
    let activeProfile = 'Default Profile';

    // Initial Load
    chrome.storage.local.get(['profiles', 'activeProfile', 'presets', 'extensionActive', 'fillMode', 'darkTheme'], (result) => {
        // Migration logic: if 'presets' exists but 'profiles' doesn't
        if (result.presets && !result.profiles) {
            profiles = { 'Default Profile': result.presets };
            activeProfile = 'Default Profile';
            chrome.storage.local.set({ profiles, activeProfile }, () => {
                chrome.storage.local.remove('presets');
            });
        } else {
            profiles = result.profiles || { 'Default Profile': [] };
            activeProfile = result.activeProfile || 'Default Profile';
        }

        // Load settings
        extensionActiveToggle.checked = result.extensionActive !== false;
        fillModeSelect.value = result.fillMode || 'google';

        if (result.darkTheme) {
            document.body.classList.add('dark-theme');
            themeToggleBtn.textContent = '☀️';
        }

        renderProfileList();
        loadProfile(activeProfile);
    });

    // Guide Handlers
    showGuideBtn.addEventListener('click', () => {
        guideModal.classList.remove('hidden');
    });

    closeGuideBtn.addEventListener('click', () => {
        guideModal.classList.add('hidden');
    });

    // Close modal on click outside content
    guideModal.addEventListener('click', (e) => {
        if (e.target === guideModal) {
            guideModal.classList.add('hidden');
        }
    });

    // Theme Handler
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
        chrome.storage.local.set({ darkTheme: isDark });
    });

    // Settings Actions
    extensionActiveToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ extensionActive: e.target.checked }, () => {
            notifyTabs();
        });
    });

    fillModeSelect.addEventListener('change', (e) => {
        chrome.storage.local.set({ fillMode: e.target.value }, () => {
            notifyTabs();
        });
    });

    function renderProfileList() {
        profileSelect.innerHTML = '';
        Object.keys(profiles).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            option.selected = (name === activeProfile);
            profileSelect.appendChild(option);
        });
    }

    function loadProfile(name) {
        activeProfile = name;
        presetsList.innerHTML = '';
        const currentPresets = profiles[name] || [];
        currentPresets.forEach(preset => addPresetRow(preset));
        saveActiveProfileState();
    }

    function saveActiveProfileState() {
        chrome.storage.local.set({ activeProfile });
    }

    // Profile Actions
    profileSelect.addEventListener('change', (e) => {
        loadProfile(e.target.value);
        notifyTabs();
    });

    newProfileBtn.addEventListener('click', () => {
        const name = prompt('Enter name for the new profile:');
        if (name && name.trim()) {
            const cleanName = name.trim();
            if (profiles[cleanName]) {
                alert('A profile with this name already exists.');
                return;
            }
            profiles[cleanName] = [];
            activeProfile = cleanName;
            renderProfileList();
            loadProfile(cleanName);
            saveProfilesToStorage();
        }
    });

    deleteProfileBtn.addEventListener('click', () => {
        const names = Object.keys(profiles);
        if (names.length <= 1) {
            alert('You must have at least one profile.');
            return;
        }

        if (confirm(`Are you sure you want to delete profile "${activeProfile}"?`)) {
            delete profiles[activeProfile];
            activeProfile = Object.keys(profiles)[0];
            renderProfileList();
            loadProfile(activeProfile);
            saveProfilesToStorage();
        }
    });

    // Field Actions
    addFieldBtn.addEventListener('click', () => {
        addPresetRow({ label: '', value: '' });
        saveAndSync();
    });

    function addPresetRow(data) {
        const clone = template.content.cloneNode(true);
        const row = clone.querySelector('.preset-row');
        const labelInput = row.querySelector('.preset-label');
        const valueInput = row.querySelector('.preset-value');

        labelInput.value = data.label || '';
        valueInput.value = data.value || '';

        [labelInput, valueInput].forEach(input => {
            input.addEventListener('input', () => saveAndSync());
        });

        row.querySelector('.remove-field').addEventListener('click', () => {
            row.remove();
            saveAndSync();
        });

        presetsList.appendChild(clone);
    }

    function saveAndSync() {
        clearTimeout(debounceTimer);
        statusBar.textContent = 'Saving changes...';
        statusBar.classList.add('saving');

        debounceTimer = setTimeout(() => {
            const rows = document.querySelectorAll('.preset-row');
            const currentPresets = Array.from(rows).map(row => ({
                label: row.querySelector('.preset-label').value.trim(),
                value: row.querySelector('.preset-value').value.trim()
            })).filter(p => p.label || p.value);

            profiles[activeProfile] = currentPresets;
            saveProfilesToStorage();
        }, 500);
    }

    function saveProfilesToStorage() {
        chrome.storage.local.set({ profiles }, () => {
            statusBar.textContent = 'All changes are automatically saved';
            statusBar.classList.remove('saving');
            notifyTabs();
        });
    }

    function notifyTabs() {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'presetsUpdated' }).catch(() => { });
            });
        });
    }
});
