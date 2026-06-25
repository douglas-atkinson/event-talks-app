// Global Application State
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdateId = null;
let activeCategory = 'all';
let searchQuery = '';

// DOM Elements
const notesStream = document.getElementById('notes-stream');
const emptyState = document.getElementById('empty-state');
const statusContainer = document.getElementById('status-container');
const statusText = document.getElementById('status-text');
const btnRefresh = document.getElementById('btn-refresh');
const refreshIcon = document.getElementById('refresh-icon');
const cacheTimeSpan = document.getElementById('cache-time');
const searchBox = document.getElementById('search-box');
const clearSearchBtn = document.getElementById('clear-search');
const filtersContainer = document.getElementById('category-filters-container');
const btnExportCsv = document.getElementById('btn-export-csv');
const checkboxTheme = document.getElementById('checkbox-theme');

// Drawer Elements
const tweetDrawer = document.getElementById('tweet-drawer');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const previewCategoryBadge = document.getElementById('preview-category-badge');
const previewDate = document.getElementById('preview-date');
const previewHtmlContent = document.getElementById('preview-html-content');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const charWarning = document.getElementById('char-warning');
const btnResetTweet = document.getElementById('btn-reset-tweet');
const btnTweetSubmit = document.getElementById('btn-tweet');

// Fetch updates from the Flask API
async function fetchUpdates(forceRefresh = false) {
    showLoading(forceRefresh ? "Fetching fresh release notes..." : "Loading release notes...");
    btnRefresh.disabled = true;
    refreshIcon.classList.add('spinning');
    
    try {
        const url = forceRefresh ? '/api/updates?refresh=true' : '/api/updates';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        allUpdates = data.updates || [];
        updateCacheTime(data.cached_at);
        
        if (data.warning) {
            console.warn(data.warning);
            // Optionally display a toast/warning to the user
        }
        
        // Render filters and updates
        buildFilters();
        applyFiltersAndSearch();
        hideLoading();
        
    } catch (error) {
        console.error('Error fetching updates:', error);
        showError(`Failed to load release notes: ${error.message}. Please click refresh to try again.`);
    } finally {
        btnRefresh.disabled = false;
        refreshIcon.classList.remove('spinning');
    }
}

// Update the cache time indicator
function updateCacheTime(timestamp) {
    if (!timestamp) {
        cacheTimeSpan.textContent = 'Last fetched: N/A';
        return;
    }
    const date = new Date(timestamp * 1000);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    cacheTimeSpan.textContent = `Last fetched: ${timeStr}`;
}

// Display status loading
function showLoading(message) {
    statusContainer.classList.remove('hidden');
    statusContainer.querySelector('.spinner-loader').classList.remove('hidden');
    statusText.textContent = message;
    notesStream.classList.add('hidden');
    emptyState.classList.add('hidden');
}

// Display error status
function showError(message) {
    statusContainer.classList.remove('hidden');
    statusContainer.querySelector('.spinner-loader').classList.add('hidden');
    statusText.textContent = message;
    notesStream.classList.add('hidden');
    emptyState.classList.add('hidden');
}

// Hide status container
function hideLoading() {
    statusContainer.classList.add('hidden');
    notesStream.classList.remove('hidden');
}

// Helper to get Category Emoji
function getCategoryEmoji(category) {
    const cat = category.toLowerCase();
    if (cat.includes('feature')) return '🚀';
    if (cat.includes('bug fix') || cat.includes('fix')) return '🐛';
    if (cat.includes('change')) return '🔄';
    if (cat.includes('deprecation')) return '⚠️';
    if (cat.includes('announcement')) return '📢';
    return '💡';
}

// Helper to get category-type attribute value for CSS targeting
function getCategoryTypeAttr(category) {
    const cat = category.toLowerCase();
    if (cat.includes('feature')) return 'feature';
    if (cat.includes('bug fix') || cat.includes('fix')) return 'bugfix';
    if (cat.includes('change')) return 'change';
    if (cat.includes('deprecation')) return 'deprecation';
    if (cat.includes('announcement')) return 'announcement';
    return 'general';
}

// Generate the sidebar filter buttons with item counts dynamically
function buildFilters() {
    // Recalculate categories count
    const counts = { all: allUpdates.length };
    
    allUpdates.forEach(update => {
        const cat = update.category;
        counts[cat] = (counts[cat] || 0) + 1;
    });
    
    // Clear and build UI
    filtersContainer.innerHTML = '';
    
    // Build "All Updates" button
    const allBtn = document.createElement('button');
    allBtn.className = `filter-pill ${activeCategory === 'all' ? 'active' : ''}`;
    allBtn.dataset.category = 'all';
    allBtn.innerHTML = `
        <span class="pill-label"><i class="fas fa-list-ul"></i> All Updates</span>
        <span class="pill-count">${counts.all}</span>
    `;
    allBtn.addEventListener('click', () => setFilter('all'));
    filtersContainer.appendChild(allBtn);
    
    // Sort other categories by count descending
    const sortedCategories = Object.keys(counts).filter(c => c !== 'all').sort((a, b) => counts[b] - counts[a]);
    
    sortedCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `filter-pill ${activeCategory === cat ? 'active' : ''}`;
        btn.dataset.category = cat;
        
        const typeAttr = getCategoryTypeAttr(cat);
        const icon = getCategoryEmoji(cat);
        
        btn.innerHTML = `
            <span class="pill-label">${icon} ${cat}</span>
            <span class="pill-count">${counts[cat]}</span>
        `;
        btn.addEventListener('click', () => setFilter(cat));
        filtersContainer.appendChild(btn);
    });
}

// Change active filter category
function setFilter(category) {
    activeCategory = category;
    
    // Toggle active class in UI
    document.querySelectorAll('.filter-pill').forEach(btn => {
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    applyFiltersAndSearch();
}

// Filter and search notes stream
function applyFiltersAndSearch() {
    searchQuery = searchBox.value.trim().toLowerCase();
    
    // Toggle clear search button visibility
    if (searchQuery) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    filteredUpdates = allUpdates.filter(update => {
        // Category Filter
        const matchesCategory = (activeCategory === 'all' || update.category === activeCategory);
        
        // Search Filter
        const textContent = `${update.date} ${update.category} ${update.content_text}`.toLowerCase();
        const matchesSearch = !searchQuery || textContent.includes(searchQuery);
        
        return matchesCategory && matchesSearch;
    });
    
    renderNotesList();
}

// Render filtered notes in main timeline stream
function renderNotesList() {
    notesStream.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        notesStream.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    notesStream.classList.remove('hidden');
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('article');
        const typeAttr = getCategoryTypeAttr(update.category);
        
        card.className = `update-card ${selectedUpdateId === update.id ? 'selected' : ''}`;
        card.dataset.id = update.id;
        card.dataset.categoryType = typeAttr;
        
        // Generate badge class
        const badgeClass = `badge-${typeAttr}`;
        const emoji = getCategoryEmoji(update.category);
        
        card.innerHTML = `
            <div class="selection-indicator">
                <i class="fas fa-check"></i>
            </div>
            <div class="card-header-meta">
                <span class="category-badge ${badgeClass}">${emoji} ${update.category}</span>
                <time class="card-date" datetime="${update.iso_date}">${update.date}</time>
            </div>
            <div class="card-body-content">
                ${update.content_html}
            </div>
            <div class="card-footer-meta">
                <button class="btn-copy-card" title="Copy plain text update to clipboard" onclick="copyCardText(event, '${update.id}', this)">
                    <i class="far fa-copy"></i> <span>Copy</span>
                </button>
                <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="card-permalink" onclick="event.stopPropagation();">
                    <span>View Docs</span> <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        `;
        
        // Selection Handler
        card.addEventListener('click', () => toggleCardSelection(update.id));
        
        notesStream.appendChild(card);
    });
}

// Toggle update selection
function toggleCardSelection(id) {
    if (selectedUpdateId === id) {
        // Unselect
        selectedUpdateId = null;
        closeTweetDrawer();
    } else {
        // Select
        selectedUpdateId = id;
        openTweetDrawer(id);
    }
    
    // Re-render notes stream to apply selected class styling
    document.querySelectorAll('.update-card').forEach(card => {
        if (card.dataset.id === selectedUpdateId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

// Generate Truncated plain text
function truncateText(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + '...';
}

// Generate the original Tweet template
function getOriginalTweetText(update) {
    const emoji = getCategoryEmoji(update.category);
    
    // Compose tweet body. Ensure we leave space for formatting and links.
    // Twitter links are shortened to 23 chars, so:
    // "🚀 BigQuery (Jun 23): [Feature] - [Text]... Link"
    // text length max = 280 - (emoji/spaces/header chars) - 23 (url)
    const header = `${emoji} BigQuery Update (${update.date}):\n`;
    
    // We want the text content to fit. Let's compute remaining size
    const urlPlaceholder = `\n\nDocs: ${update.link}`;
    const extraSpace = header.length + urlPlaceholder.length;
    const maxTextLength = 280 - extraSpace - 5; // buffer
    
    const plainTextBody = update.content_text;
    const truncatedBody = truncateText(plainTextBody, maxTextLength > 50 ? maxTextLength : 100);
    
    return `${header}"${truncatedBody}"${urlPlaceholder}`;
}

// Slide up and initialize the Tweet composer
function openTweetDrawer(id) {
    const update = allUpdates.find(u => u.id === id);
    if (!update) return;
    
    const typeAttr = getCategoryTypeAttr(update.category);
    
    // Set preview details
    previewCategoryBadge.className = `category-badge badge-${typeAttr}`;
    previewCategoryBadge.textContent = `${getCategoryEmoji(update.category)} ${update.category}`;
    previewDate.textContent = update.date;
    previewHtmlContent.innerHTML = update.content_html;
    
    // Set text contents
    const tweetText = getOriginalTweetText(update);
    tweetTextarea.value = tweetText;
    
    // Update count UI
    updateCharCount();
    
    // Slide in drawer
    tweetDrawer.classList.add('open');
}

// Slide down and clear the Tweet composer
function closeTweetDrawer() {
    tweetDrawer.classList.remove('open');
    // Also remove any selections visually
    selectedUpdateId = null;
    document.querySelectorAll('.update-card').forEach(card => card.classList.remove('selected'));
}

// Update Character Count logic
function updateCharCount() {
    const text = tweetTextarea.value;
    
    // For Twitter Web Intent: standard characters counts.
    // However, URLs inside Tweets are automatically replaced by t.co links (23 characters).
    // Let's implement Twitter-like character length estimation!
    // We find URLs, replace them with a 23-character string, and count the rest.
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const textWithShortenedUrls = text.replace(urlRegex, "12345678901234567890123");
    
    const count = textWithShortenedUrls.length;
    charCount.textContent = count;
    
    if (count > 280) {
        charCount.classList.add('warning');
        charWarning.classList.remove('hidden');
    } else {
        charCount.classList.remove('warning');
        charWarning.classList.add('hidden');
    }
}

// Reset Tweet text to the original pre-formatted string
function resetTweetText() {
    if (!selectedUpdateId) return;
    const update = allUpdates.find(u => u.id === selectedUpdateId);
    if (update) {
        tweetTextarea.value = getOriginalTweetText(update);
        updateCharCount();
    }
}

// Trigger X / Twitter Web Intent opening a tweet page in a new window
function submitTweet() {
    const tweetContent = tweetTextarea.value.trim();
    if (!tweetContent) return;
    
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetContent)}`;
    window.open(tweetUrl, '_blank', 'width=550,height=420,toolbar=0,status=0');
}

// Copy update text to clipboard
async function copyCardText(event, id, buttonElement) {
    event.stopPropagation(); // Prevent card selection from firing
    
    const update = allUpdates.find(u => u.id === id);
    if (!update) return;
    
    try {
        await navigator.clipboard.writeText(update.content_text);
        
        // Provide visual feedback
        const label = buttonElement.querySelector('span');
        const icon = buttonElement.querySelector('i');
        
        buttonElement.classList.add('copied');
        label.textContent = 'Copied!';
        icon.className = 'fas fa-check';
        
        setTimeout(() => {
            buttonElement.classList.remove('copied');
            label.textContent = 'Copy';
            icon.className = 'far fa-copy';
        }, 1500);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

// Convert filtered updates to CSV and trigger file download
function exportFilteredToCSV() {
    if (filteredUpdates.length === 0) {
        alert("No updates to export!");
        return;
    }
    
    const headers = ['ID', 'Date', 'Category', 'Plain Content', 'Link'];
    
    // Helper to escape values for CSV
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        let str = String(val);
        // Replace single double quotes with double double quotes
        str = str.replace(/"/g, '""');
        // Wrap in double quotes if it contains quotes, commas, newlines or spaces
        if (/[",\n\r]/.test(str)) {
            return `"${str}"`;
        }
        return str;
    };
    
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    filteredUpdates.forEach(update => {
        const row = [
            update.id,
            update.date,
            update.category,
            update.content_text,
            update.link
        ];
        csvRows.push(row.map(escapeCSV).join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const filename = `bigquery-release-notes-${activeCategory}-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Trigger download
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        checkboxTheme.checked = true;
    } else {
        document.body.classList.remove('light-theme');
        checkboxTheme.checked = false;
    }
}

function handleThemeChange() {
    if (checkboxTheme.checked) {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// Event Listeners Configuration
btnRefresh.addEventListener('click', () => fetchUpdates(true));
btnExportCsv.addEventListener('click', exportFilteredToCSV);
checkboxTheme.addEventListener('change', handleThemeChange);

searchBox.addEventListener('input', applyFiltersAndSearch);

clearSearchBtn.addEventListener('click', () => {
    searchBox.value = '';
    applyFiltersAndSearch();
    searchBox.focus();
});

btnCloseDrawer.addEventListener('click', closeTweetDrawer);
btnResetTweet.addEventListener('click', resetTweetText);
btnTweetSubmit.addEventListener('click', submitTweet);

tweetTextarea.addEventListener('input', updateCharCount);

// Close drawer if user clicks Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTweetDrawer();
    }
});

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchUpdates();
});
