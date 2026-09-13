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
const yamlFilePath = 'https://api.github.com/gists/f79a94082c09c3d68007d498a68a7f11';
const chocolateyInstallCommand = `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1')); `;
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

    const checkboxes = packageListElement.querySelectorAll('input[type="checkbox"]');
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
    const checkboxes = packageListElement.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateCommand() {
    const selectedPackages = getSelectedPackages();
    
    if (selectedPackages.length === 0) {
        commandInputElement.value = '';
    } else if (selectedPackages[0] === 'chocolatey') {
        if (selectedPackages.length === 1) {
            commandInputElement.value = chocolateyInstallCommand;
        } else {
            commandInputElement.value = chocolateyInstallCommand + `choco install -y ${selectedPackages.slice(1).join(' ')}`;
        }
    } else {
        commandInputElement.value = `choco install -y ${selectedPackages.join(' ')}`;
    }
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

        li.innerHTML = `
            <label class="package-list-label" for="${packageName}" title="${pkg.description}">
                <input type="checkbox" name="package-item" value="${packageName}" id="${packageName}" class="label-checkbox" ${isChecked ? 'checked' : ''}>
                <img src="${iconSourcePath}${pkg.icoUrl}" alt="" class="icon-image" loading="lazy" onerror="this.style.display='none'">
                <span class="package-list-label-text">
                    <b>${pkg.name}</b> — ${pkg.description}
                </span>
            </label>
        `;

        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            updateCommand();
            updateSelectedCount();
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
        const gistData = jsyaml.load(yamlText);
        const yamlContent = gistData.files['packages_list.yaml'].content;
        return jsyaml.load(yamlContent);
    } catch (error) {
        console.error('Error fetching YAML:', error);
        showToast('Failed to load packages');
        return {};
    }
}
