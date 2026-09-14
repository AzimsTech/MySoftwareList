// DOM Elements
const packageListElement = document.getElementById('packageList');
const commandInputElement = document.getElementById('commandInput');
const searchInputElement = document.getElementById('searchInput');
const copyButtonElement = document.getElementById('copyBtn');
const resetButtonElement = document.getElementById('resetBtn');
const selectAllButtonElement = document.getElementById('selectAllBtn');
const selectedCountElement = document.getElementById('selectedCount');
const totalPackagesElement = document.getElementById('totalPackages');
const scrollTopButton = document.getElementById('scrollTopBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const toastElement = document.getElementById('toast');

// Constants
const yamlFilePath = './data/packages_list.yaml';
const wingetInstallCommand = `winget install --id `;
const iconSourcePath = 'images/packageimages/';

let yamlData = null;
let allPackages = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchYamlData(yamlFilePath).then(data => {
        yamlData = data;
        allPackages = Object.keys(data);
        populatePackageList(allPackages);
        totalPackagesElement.textContent = `${allPackages.length} packages available`;
    });

    eventListeners();
});

// Event Listeners
function eventListeners() {
    resetButtonElement.addEventListener('click', resetForm);
    copyButtonElement.addEventListener('click', copyToClipboard);
    selectAllButtonElement.addEventListener('click', selectAllPackages);
    searchInputElement.addEventListener('input', debounce(filterPackages, 200));
    scrollTopButton.addEventListener('click', scrollToTop);
    themeToggle.addEventListener('click', toggleTheme);

    window.addEventListener('scroll', () => {
        scrollTopButton.classList.toggle('visible', window.scrollY > 300);
    });
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeIcon.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeIcon.textContent = '☀️';
    }

    document.querySelectorAll('.label-checkbox').forEach(cb => {
        cb.style.display = 'none';
        cb.offsetHeight;
        cb.style.display = '';
    });
}

// Toast Notification
function showToast(message, duration = 2500) {
    toastElement.textContent = message;
    toastElement.classList.add('show');
    
    setTimeout(() => {
        toastElement.classList.remove('show');
    }, duration);
}

// Form Functions
function resetForm(e) {
    e.preventDefault();
    packageListElement.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    commandInputElement.value = '';
    searchInputElement.value = '';
    updateSelectedCount();
    populatePackageList(allPackages);
    showToast('Selection cleared');
}

function copyToClipboard(e) {
    e.preventDefault();

    const checkedPackages = getSelectedPackages();
    
    if (checkedPackages.length > 0) {
        navigator.clipboard.writeText(commandInputElement.value).then(() => {
            showToast('Copied to clipboard!');
        }).catch(() => {
            commandInputElement.select();
            document.execCommand('copy');
            showToast('Copied to clipboard!');
        });
    } else {
        showToast('Please select packages first');
    }
}

function selectAllPackages(e) {
    e.preventDefault();

    const checkboxes = packageListElement.querySelectorAll('input.label-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        if (allChecked) {
            checkbox.checked = false;
        } else if (!checkbox.checked && checkbox.offsetParent !== null) {
            checkbox.checked = true;
        }
    });

    updateCommand();
    updateSelectedCount();
    showToast(allChecked ? 'All deselected' : 'All selected');
}

function getSelectedPackages() {
    const checkboxes = packageListElement.querySelectorAll('input.label-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateCommand() {
    const checkboxes = packageListElement.querySelectorAll('input.label-checkbox:checked');
    if (checkboxes.length === 0) {
        commandInputElement.value = '';
        return;
    }

    const commands = Array.from(checkboxes).map(cb => {
        const id = cb.value;
        const li = cb.closest('.package-list-item');
        const toggles = li.querySelectorAll('.toggle-switch input');
        const isInteractive = toggles[0]?.checked || false;
        const pkgScope = yamlData[id]?.scope;
        const overrideInput = li.querySelector('.override-input');
        const override = overrideInput?.value || '';
        let cmd = `winget install --id ${id}`;
        if (pkgScope) cmd += ` --scope ${pkgScope}`;
        if (isInteractive) cmd += ' -i';
        if (override) cmd += ` --override "${override}"`;
        return cmd;
    });

    commandInputElement.value = commands.join('; ');
}

function updateSelectedCount() {
    const count = getSelectedPackages().length;
    selectedCountElement.textContent = count;
}

// Search & Filter
function filterPackages() {
    const query = searchInputElement.value.toLowerCase().trim();
    
    if (!query) {
        populatePackageList(allPackages);
        return;
    }

    const filtered = allPackages.filter(pkg => {
        const name = yamlData[pkg].name.toLowerCase();
        const desc = yamlData[pkg].description.toLowerCase();
        return name.includes(query) || desc.includes(query);
    });

    populatePackageList(filtered);
}

// Populate Package List
function populatePackageList(packages) {
    packageListElement.innerHTML = '';
    
    if (packages.length === 0) {
        packageListElement.innerHTML = `
            <li style="text-align: center; padding: 2rem; color: var(--text-muted);">
                No packages found matching your search.
            </li>
        `;
        return;
    }

    packages.forEach((packageName, index) => {
        const pkg = yamlData[packageName];
        const li = document.createElement('li');
        li.className = 'package-list-item';
        li.style.animationDelay = `${index * 0.02}s`;

        const isChecked = document.querySelector(`input[name="package-item"][value="${packageName}"]`)?.checked || false;
        const savedState = getToggleState(packageName);

        li.innerHTML = `
            <label class="package-list-label" for="${packageName}" title="${pkg.description}">
                <input type="checkbox" name="package-item" value="${packageName}" id="${packageName}" class="label-checkbox" ${isChecked ? 'checked' : ''}>
                <img src="${iconSourcePath}${pkg.icoUrl}" alt="" class="icon-image" loading="lazy" onerror="this.style.display='none'">
                <span class="package-list-label-text">
                    <b>${pkg.name}</b> — ${pkg.description}
                </span>
                <div class="toggle-wrapper" title="Runs the installer in interactive mode. The default experience shows installer progress.">
                    <span class="toggle-label">Interactive</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="interactive-${packageName}" name="interactive-${packageName}" ${savedState.interactive ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <button class="settings-btn" type="button" aria-label="Override options">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>
            </label>
            <div class="override-section" id="override-${packageName}">
                <input type="text" class="override-input" id="override-input-${packageName}" placeholder="--override installer arguments" value="${savedState.override || ''}">
            </div>
        `;

        const checkbox = li.querySelector('input[type="checkbox"]');
        const interactiveToggle = li.querySelectorAll('.toggle-switch input')[0];
        const settingsBtn = li.querySelector('.settings-btn');
        const overrideSection = li.querySelector('.override-section');
        const overrideInput = li.querySelector('.override-input');
        
        checkbox.addEventListener('change', () => {
            updateCommand();
            updateSelectedCount();
        });

        interactiveToggle.addEventListener('change', () => {
            saveToggleState(packageName, interactiveToggle.checked, overrideInput.value);
            updateCommand();
        });

        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            li.classList.toggle('expanded');
            overrideSection.classList.toggle('open');
            if (overrideSection.classList.contains('open')) {
                overrideInput.focus();
            }
        });

        overrideInput.addEventListener('input', () => {
            updateCommand();
        });

        overrideInput.addEventListener('change', () => {
            saveToggleState(packageName, interactiveToggle.checked, overrideInput.value);
            updateCommand();
        });

        packageListElement.appendChild(li);
    });

    updateSelectedCount();
}

// Scroll to Top
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Fetch YAML Data
async function fetchYamlData(url) {
    try {
        const response = await fetch(url);
        const yamlText = await response.text();
        return jsyaml.load(yamlText);
    } catch (error) {
        console.error('Error fetching YAML:', error);
        showToast('Failed to load packages');
        return {};
    }
}

// Toggle State Persistence
function getToggleState(packageName) {
    const states = JSON.parse(localStorage.getItem('toggleStates') || '{}');
    if (states[packageName]) {
        return {
            interactive: states[packageName].interactive ?? yamlData[packageName]?.interactive ?? false,
            override: states[packageName].override ?? yamlData[packageName]?.override ?? ''
        };
    }
    return {
        interactive: yamlData[packageName]?.interactive ?? false,
        override: yamlData[packageName]?.override ?? ''
    };
}

function saveToggleState(packageName, interactive, override) {
    const states = JSON.parse(localStorage.getItem('toggleStates') || '{}');
    states[packageName] = { interactive, override };
    localStorage.setItem('toggleStates', JSON.stringify(states));
}
