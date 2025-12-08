// ============================================
// EMPIRE BEATSTORE - REWRITTEN SCRIPT
// ============================================

// Configuration
const API_BASE_URL = `https://kenyanstylebeats.onrender.com/api`;
let currentUser = null;
let authToken = localStorage.getItem('token');

// Beats management
let allBeats = [];
let currentSeries = 'all';
let searchQuery = '';

// Admin state
let adminData = {
    purchaseKeys: [],
    users: [],
    stats: {},
    currentPage: 1,
    itemsPerPage: 10
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 EMPIRE BEATSTORE - Initializing...');
    
    // Setup all event listeners
    setupAllEventListeners();
    
    // Check authentication status
    checkAuthStatus().then(() => {
        loadBeats();
    });
    
    // Set current year
    setCurrentYear();
});

// ============================================
// AUTHENTICATION
// ============================================

async function checkAuthStatus() {
    if (!authToken) {
        updateUIForLoggedOutUser();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                currentUser = data.user;
                updateUIForLoggedInUser();
            }
        } else {
            localStorage.removeItem('token');
            authToken = null;
            currentUser = null;
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        authToken = null;
        currentUser = null;
        updateUIForLoggedOutUser();
    }
}

function updateUIForLoggedInUser() {
    const elements = {
        signBtn: document.getElementById('signBtn'),
        userDropdown: document.getElementById('userDropdown'),
        userInitial: document.getElementById('userInitial'),
        userEmail: document.getElementById('userEmail'),
        adminUsersBtn: document.getElementById('adminUsersBtn'),
        adminDivider: document.getElementById('adminDivider'),
        adminBtn: document.getElementById('adminBtn'),
        adminPanelBtn: document.getElementById('adminPanelBtn')
    };
    
    if (!currentUser) return;
    
    // Update user info
    if (elements.userInitial) elements.userInitial.textContent = currentUser.name?.charAt(0).toUpperCase() || 'U';
    if (elements.userEmail) elements.userEmail.textContent = currentUser.email;
    
    // Show/hide admin features
    const isAdmin = currentUser.role === 'admin';
    if (elements.adminUsersBtn) elements.adminUsersBtn.style.display = isAdmin ? 'block' : 'none';
    if (elements.adminDivider) elements.adminDivider.style.display = isAdmin ? 'block' : 'none';
    if (elements.adminBtn) elements.adminBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if (elements.adminPanelBtn) {
        elements.adminPanelBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        elements.adminPanelBtn.style.alignItems = 'center';
        elements.adminPanelBtn.style.gap = '6px';
    }
    
    // Update UI visibility
    if (elements.signBtn) elements.signBtn.style.display = 'none';
    if (elements.userDropdown) elements.userDropdown.style.display = 'block';
    
    // Sync mobile UI
    syncUserStateToMobile(true, currentUser);
    
    // Refresh beats
    setTimeout(() => {
        if (document.getElementById('beatsGrid')) {
            displayBeats(allBeats);
        }
    }, 100);
}

function updateUIForLoggedOutUser() {
    const elements = {
        signBtn: document.getElementById('signBtn'),
        userDropdown: document.getElementById('userDropdown'),
        adminBtn: document.getElementById('adminBtn'),
        adminPanelBtn: document.getElementById('adminPanelBtn')
    };
    
    if (elements.signBtn) elements.signBtn.style.display = 'block';
    if (elements.userDropdown) elements.userDropdown.style.display = 'none';
    if (elements.adminBtn) elements.adminBtn.style.display = 'none';
    if (elements.adminPanelBtn) elements.adminPanelBtn.style.display = 'none';
    
    syncUserStateToMobile(false, null);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupAllEventListeners() {
    // Mobile menu
    setupMobileMenu();
    
    // Main buttons
    document.getElementById('signBtn')?.addEventListener('click', showAuthModal);
    document.getElementById('adminBtn')?.addEventListener('click', showAdminModal);
    document.getElementById('adminPanelBtn')?.addEventListener('click', showAdminPanel);
    document.getElementById('browseTop')?.addEventListener('click', scrollToBeats);
    
    // User dropdown
    document.getElementById('userMenu')?.addEventListener('click', toggleUserDropdown);
    
    // User dropdown actions
    document.querySelectorAll('#userDropdownMenu .dropdown-item').forEach(item => {
        item.addEventListener('click', function() {
            handleUserAction(this.dataset.action);
        });
    });
    
    // Admin modal
    document.getElementById('adminLoginBtn')?.addEventListener('click', adminLogin);
    
    // Upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            uploadBeat();
        });
    }
    
    // Search
    const searchInput = document.getElementById('searchBeats');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            filterBeatsBySeries(currentSeries);
        });
    }
    
    // File upload preview
    setupFileUploadPreview();
    
    // Setup admin tabs (called when admin panel opens)
    setupAdminPanelNavigation();
    
    // Close modals
    document.addEventListener('click', function(e) {
        // Close dropdowns
        const userDropdown = document.getElementById('userDropdownMenu');
        if (userDropdown && userDropdown.style.display === 'block' && !e.target.closest('#userDropdown')) {
            userDropdown.style.display = 'none';
        }
        
        // Close modals on backdrop click
        if (e.target.classList.contains('modal-backdrop')) {
            hideModal(e.target.id);
        }
        
        // Close admin panel on backdrop click
        if (e.target.id === 'adminPanelModal') {
            closeAdminPanel();
        }
    });
    
    // Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileNav = document.getElementById('mobileNav');
    const mobileNavClose = document.getElementById('mobileNavClose');
    
    if (!mobileMenuToggle || !mobileNav) return;
    
    mobileMenuToggle.addEventListener('click', () => {
        mobileNav.classList.add('active');
        mobileNavOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    function closeMobileMenu() {
        mobileNav.classList.remove('active');
        mobileNavOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    mobileNavClose?.addEventListener('click', closeMobileMenu);
    mobileNavOverlay?.addEventListener('click', closeMobileMenu);
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
            closeMobileMenu();
        }
    });
    
    // Mobile button clicks
    document.getElementById('browseTopMobile')?.addEventListener('click', () => {
        closeMobileMenu();
        document.getElementById('browseTop')?.click();
    });
    
    document.getElementById('adminBtnMobile')?.addEventListener('click', () => {
        closeMobileMenu();
        document.getElementById('adminBtn')?.click();
    });
    
    document.getElementById('signBtnMobile')?.addEventListener('click', () => {
        closeMobileMenu();
        document.getElementById('signBtn')?.click();
    });
    
    // Close menu on dropdown item clicks
    document.querySelectorAll('.mobile-nav .dropdown-item').forEach(item => {
        item.addEventListener('click', closeMobileMenu);
    });
}

function syncUserStateToMobile(isLoggedIn, userData) {
    const elements = {
        userDropdownMobile: document.getElementById('userDropdownMobile'),
        userInitialMobile: document.getElementById('userInitialMobile'),
        userEmailMobile: document.getElementById('userEmailMobile'),
        signBtnMobile: document.getElementById('signBtnMobile')
    };
    
    if (isLoggedIn && userData) {
        if (elements.userDropdownMobile) elements.userDropdownMobile.style.display = 'block';
        if (elements.signBtnMobile) elements.signBtnMobile.style.display = 'none';
        if (elements.userInitialMobile) elements.userInitialMobile.textContent = userData.name?.charAt(0).toUpperCase() || 'U';
        if (elements.userEmailMobile) elements.userEmailMobile.textContent = userData.email || '';
    } else {
        if (elements.userDropdownMobile) elements.userDropdownMobile.style.display = 'none';
        if (elements.signBtnMobile) elements.signBtnMobile.style.display = 'flex';
    }
}

// ============================================
// BEATS MANAGEMENT
// ============================================

async function loadBeats() {
    try {
        const beatsGrid = document.getElementById('beatsGrid');
        if (beatsGrid) {
            beatsGrid.innerHTML = '<div style="color:white;padding:20px;text-align:center">Loading beats...</div>';
        }
        
        const response = await fetch(`${API_BASE_URL}/beats`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allBeats = data.beats;
            console.log(`✅ Loaded ${allBeats.length} beats`);
            
            populateSeriesSidebar(data.series);
            displayBeats(allBeats);
            updateExploreDropdown(data.series);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error loading beats:', error);
        showToast('Error loading beats', 'error');
        
        const beatsGrid = document.getElementById('beatsGrid');
        if (beatsGrid) {
            beatsGrid.innerHTML = `
                <div style="color:#dc3545;padding:20px;text-align:center">
                    <p>Error loading beats: ${error.message}</p>
                </div>
            `;
        }
    }
}

function populateSeriesSidebar(seriesList) {
    const seriesListElement = document.getElementById('seriesList');
    if (!seriesListElement) return;
    
    if (seriesList.length === 0) {
        seriesListElement.innerHTML = '<li style="color:var(--muted)">No series available</li>';
        return;
    }
    
    let html = `
        <li>
            <button class="series-btn ${currentSeries === 'all' ? 'active' : ''}" data-series="all">
                <span class="series-icon">🎵</span>
                All Beats
                <span class="series-count">${allBeats.length}</span>
            </button>
        </li>
    `;
    
    seriesList.forEach(series => {
        const count = allBeats.filter(beat => beat.series === series).length;
        html += `
            <li>
                <button class="series-btn ${currentSeries === series ? 'active' : ''}" data-series="${series}">
                    <span class="series-icon">🎹</span>
                    ${series}
                    <span class="series-count">${count}</span>
                </button>
            </li>
        `;
    });
    
    seriesListElement.innerHTML = html;
    
    document.querySelectorAll('.series-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            filterBeatsBySeries(this.dataset.series);
        });
    });
}

function filterBeatsBySeries(series) {
    currentSeries = series;
    
    document.querySelectorAll('.series-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.series === series);
    });
    
    let filteredBeats = series === 'all' ? allBeats : allBeats.filter(beat => beat.series === series);
    
    if (searchQuery) {
        filteredBeats = filteredBeats.filter(beat =>
            beat.title.toLowerCase().includes(searchQuery) ||
            beat.series.toLowerCase().includes(searchQuery) ||
            (beat.genre && beat.genre.toLowerCase().includes(searchQuery))
        );
    }
    
    displayBeats(filteredBeats);
}

function displayBeats(beats) {
    const beatsGrid = document.getElementById('beatsGrid');
    const noBeatsMessage = document.getElementById('noBeatsMessage');
    
    if (!beatsGrid) return;
    
    if (beats.length === 0) {
        beatsGrid.innerHTML = '';
        if (noBeatsMessage) noBeatsMessage.style.display = 'block';
        return;
    }
    
    if (noBeatsMessage) noBeatsMessage.style.display = 'none';
    
    beatsGrid.innerHTML = beats.map(beat => createBeatCard(beat)).join('');
    addBeatCardEventListeners();
}

function createBeatCard(beat) {
    const isAdmin = currentUser && currentUser.role === 'admin';
    const formattedPrice = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(beat.price);
    
    const deleteButtonHtml = isAdmin ? `
        <button class="btn secondary delete-btn" data-action="delete" data-beat-id="${beat.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
        </button>
    ` : '';
    
    return `
        <div class="beat-card" data-beat-id="${beat.id}">
            <div class="beat-thumb">
                <div style="flex:1">
                    <div class="beat-type-badge">
                        ${beat.fileType === 'Audio' ? '🎵 Audio' : '🎹 Style'}
                    </div>
                </div>
                <div class="bpm-badge">
                    ${beat.genre || 'No Genre'}
                </div>
            </div>
            
            <div style="display:flex;flex-direction:column;gap:12px">
                <div class="beat-meta">
                    <div class="beat-name">${beat.title}</div>
                    <div class="price">${formattedPrice}</div>
                </div>
                
                <div class="beat-info">
                    <span class="beat-series">${beat.series}</span>
                    <span class="beat-uploader">By: ${beat.uploadedBy?.name || 'Unknown'}</span>
                </div>
                
                <div class="beat-stats">
                    <span class="stat-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        ${beat.plays || 0} plays
                    </span>
                    <span class="stat-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        ${beat.downloads || 0} downloads
                    </span>
                </div>
                
                <div class="beat-actions">
                    ${beat.fileType === 'Audio' ? `
                        <button class="play-btn" data-action="play" data-audio="${beat.fileUrl}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Play
                        </button>
                    ` : ''}
                    
                    <button class="btn secondary" data-action="preview" data-beat-id="${beat.id}">
                        Preview Details
                    </button>
                    
                    <button class="btn" data-action="buy" data-beat-id="${beat.id}">
                        Buy Now
                    </button>
                    
                    ${deleteButtonHtml}
                </div>
            </div>
        </div>
    `;
}

function addBeatCardEventListeners() {
    // Play button
    document.querySelectorAll('.play-btn[data-audio]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            playAudioPreview(this.dataset.audio, this);
        });
    });
    
    // Preview button
    document.querySelectorAll('.btn[data-action="preview"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            showBeatDetails(this.dataset.beatId);
        });
    });
    
    // Buy button
    document.querySelectorAll('.btn[data-action="buy"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            showCheckoutModal(this.dataset.beatId);
        });
    });
    
    // Delete button
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this beat?')) {
                await deleteBeat(this.dataset.beatId);
            }
        });
    });
}

// ============================================
// ADMIN PANEL - MAIN FUNCTIONS
// ============================================

function setupAdminPanelNavigation() {
    // Handle sidebar clicks
    document.addEventListener('click', function(e) {
        const sidebarItem = e.target.closest('.sidebar-item[data-tab]');
        if (sidebarItem) {
            e.preventDefault();
            switchAdminTab(sidebarItem.dataset.tab);
        }
        
        // Close button
        if (e.target.closest('.modal-close') && e.target.closest('#adminPanelModal')) {
            closeAdminPanel();
        }
    });
}

function switchAdminTab(tabId) {
    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabId);
    });
    
    // Show active content tab
    document.querySelectorAll('.admin-tab-content').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId + 'Tab');
    });
    
    // Load data for specific tab
    switch(tabId) {
        case 'dashboard':
            loadAdminStats();
            break;
        case 'keys':
            loadPurchaseKeysTable();
            break;
        case 'generate':
            loadBeatsForAdmin();
            loadUsersForAdmin();
            break;
        case 'users':
            loadUsersTable();
            break;
        case 'settings':
            // Settings tab doesn't need data loading
            break;
    }
}

function showAdminPanel() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required. Please sign in as admin.', 'error');
        showAdminModal();
        return;
    }
    
    const modal = document.getElementById('adminPanelModal');
    if (!modal) {
        showToast('Admin panel not available', 'error');
        return;
    }
    
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Setup tabs and load initial data
    setupAdminPanelNavigation();
    switchAdminTab('dashboard');
}

function closeAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

// ============================================
// ADMIN PANEL - DATA LOADING
// ============================================

async function loadAdminStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchases/admin/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Update stats cards
                const stats = data.stats;
                document.getElementById('totalKeys').textContent = stats.totalKeys || 0;
                document.getElementById('pendingKeys').textContent = stats.pendingKeys || 0;
                document.getElementById('usedKeys').textContent = stats.usedKeys || 0;
                document.getElementById('expiredKeys').textContent = stats.expiredKeys || 0;
                
                // Load recent purchases
                await loadRecentPurchases();
            }
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadRecentPurchases() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchases/recent`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.purchases) {
                const container = document.getElementById('recentPurchases');
                if (container) {
                    container.innerHTML = data.purchases.map(purchase => `
                        <div class="activity-item">
                            <div class="activity-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                                </svg>
                            </div>
                            <div class="activity-details">
                                <p>${purchase.user?.name || 'User'} purchased "${purchase.beat?.title || 'Beat'}"</p>
                                <span class="activity-time">${new Date(purchase.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error loading recent purchases:', error);
    }
}

async function loadBeatsForAdmin() {
    try {
        const response = await fetch(`${API_BASE_URL}/beats`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('adminBeatSelect');
            if (select) {
                select.innerHTML = '<option value="">Choose a beat...</option>';
                data.beats.forEach(beat => {
                    const option = document.createElement('option');
                    option.value = beat.id;
                    option.textContent = `${beat.title} (${beat.series}) - ${beat.price} KES`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading beats for admin:', error);
    }
}

async function loadUsersForAdmin() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('adminUserSelect');
            if (select) {
                select.innerHTML = '<option value="">Choose a user...</option>';
                data.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user._id;
                    option.textContent = `${user.name} (${user.email})`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading users for admin:', error);
    }
}

async function loadPurchaseKeysTable() {
    try {
        // Try different endpoints
        const endpoints = [
            `${API_BASE_URL}/purchases/admin/purchase-keys`,
            `${API_BASE_URL}/purchases/all`,
            `${API_BASE_URL}/purchases/admin/keys`
        ];
        
        let response;
        for (const endpoint of endpoints) {
            try {
                response = await fetch(endpoint, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                if (response.ok) break;
            } catch (e) {
                continue;
            }
        }
        
        if (!response || !response.ok) {
            throw new Error('Failed to load purchase keys');
        }
        
        const data = await response.json();
        
        if (data.success) {
            adminData.purchaseKeys = data.purchases || data.keys || [];
            displayPurchaseKeysTable();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error loading purchase keys:', error);
        showToast('Error loading purchase keys', 'error');
        
        const tbody = document.getElementById('keysTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:40px;color:#dc3545;">
                        Error loading purchase keys
                    </td>
                </tr>
            `;
        }
    }
}

function displayPurchaseKeysTable() {
    const tbody = document.getElementById('keysTableBody');
    const countSpan = document.getElementById('keysCount');
    
    if (!tbody) return;
    
    if (!adminData.purchaseKeys.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:40px;color:var(--muted);">
                    No purchase keys found
                </td>
            </tr>
        `;
        if (countSpan) countSpan.textContent = '0';
        return;
    }
    
    // Pagination
    const start = (adminData.currentPage - 1) * adminData.itemsPerPage;
    const end = start + adminData.itemsPerPage;
    const paginatedKeys = adminData.purchaseKeys.slice(start, end);
    
    tbody.innerHTML = paginatedKeys.map(purchase => {
        const statusColors = {
            pending: { bg: '#fff3cd', color: '#856404' },
            used: { bg: '#d4edda', color: '#155724' },
            expired: { bg: '#f8d7da', color: '#721c24' },
            cancelled: { bg: '#e2e3e5', color: '#383d41' }
        };
        
        const statusStyle = statusColors[purchase.status] || statusColors.pending;
        
        return `
            <tr>
                <td>
                    <code style="font-family:monospace;font-size:12px;background:var(--bg-secondary);padding:4px 8px;border-radius:4px;">
                        ${purchase.purchaseKey}
                    </code>
                </td>
                <td>
                    <div style="font-weight:500;">${purchase.beat?.title || 'Unknown'}</div>
                    <div style="font-size:12px;color:var(--muted);">${purchase.beat?.series || ''}</div>
                </td>
                <td>
                    <div>${purchase.user?.name || 'Unknown'}</div>
                    <div style="font-size:12px;color:var(--muted);">${purchase.user?.email || ''}</div>
                </td>
                <td>
                    <span class="status-badge" style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;background:${statusStyle.bg};color:${statusStyle.color};">
                        ${purchase.status}
                    </span>
                </td>
                <td>
                    <div>${new Date(purchase.expiresAt).toLocaleDateString()}</div>
                    <div style="font-size:12px;color:var(--muted);">
                        ${new Date(purchase.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </td>
                <td>
                    <div style="display:flex;gap:5px;">
                        <button class="btn-icon small" onclick="copyKey('${purchase.purchaseKey}')" title="Copy Key">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                        </button>
                        <button class="btn-icon small" onclick="extendKey('${purchase._id}')" title="Extend 24h" ${purchase.status !== 'pending' ? 'disabled' : ''}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2a10 10 0 110 20 10 10 0 010-20z"></path>
                                <path d="M12 6v6l4 2"></path>
                            </svg>
                        </button>
                        <button class="btn-icon small" onclick="cancelKey('${purchase._id}')" title="Cancel Key" ${purchase.status !== 'pending' ? 'disabled' : ''}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    if (countSpan) countSpan.textContent = adminData.purchaseKeys.length;
    updateKeysPagination();
}

function updateKeysPagination() {
    const pagination = document.getElementById('keysPagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(adminData.purchaseKeys.length / adminData.itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    const currentPage = adminData.currentPage;
    
    // Previous button
    html += `
        <button class="page-btn" onclick="changeKeysPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            ←
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changeKeysPage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span class="page-dots">...</span>`;
        }
    }
    
    // Next button
    html += `
        <button class="page-btn" onclick="changeKeysPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            →
        </button>
    `;
    
    pagination.innerHTML = html;
}

function changeKeysPage(page) {
    const totalPages = Math.ceil(adminData.purchaseKeys.length / adminData.itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    adminData.currentPage = page;
    displayPurchaseKeysTable();
}

async function loadUsersTable() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            adminData.users = data.users || [];
            displayUsersTable();
        }
    } catch (error) {
        console.error('Error loading users table:', error);
        
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:40px;color:#dc3545;">
                        Error loading users
                    </td>
                </tr>
            `;
        }
    }
}

function displayUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (!adminData.users.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:40px;color:var(--muted);">
                    No users found
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = adminData.users.map(user => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">
                        ${user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style="font-weight:500;">${user.name}</div>
                        <div style="font-size:12px;color:var(--muted);">ID: ${user._id?.substring(0, 8) || ''}...</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="role-badge ${user.role}" style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;background:${user.role === 'admin' ? '#ffebee' : '#e3f2fd'};color:${user.role === 'admin' ? '#c62828' : '#1565c0'};">${user.role}</span>
            </td>
            <td>${user.purchaseCount || 0}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <div style="display:flex;gap:5px;">
                    <button class="btn-icon small" onclick="makeAdmin('${user._id}')" title="Make Admin" ${user.role === 'admin' ? 'disabled' : ''}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 00-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 010 7.75"></path>
                        </svg>
                    </button>
                    <button class="btn-icon small" onclick="deleteUser('${user._id}')" title="Delete User">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================
// ADMIN PANEL - UTILITY FUNCTIONS
// ============================================

function filterKeys() {
    const search = document.getElementById('searchKeys')?.value.toLowerCase() || '';
    const status = document.getElementById('keyStatusFilter')?.value || '';
    
    // This would filter the data, but for now just reload
    loadPurchaseKeysTable();
}

function filterUsers() {
    const search = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const role = document.getElementById('userRoleFilter')?.value || '';
    
    // This would filter the data, but for now just reload
    loadUsersTable();
}

function refreshKeys() {
    loadPurchaseKeysTable();
    showToast('Purchase keys refreshed', 'info');
}

function refreshStats() {
    loadAdminStats();
    showToast('Stats refreshed', 'info');
}

function resetForm() {
    const form = document.getElementById('generateKeyForm');
    if (form) form.reset();
    const keyResult = document.getElementById('keyResult');
    if (keyResult) keyResult.style.display = 'none';
}

async function generatePurchaseKeyAdmin() {
    try {
        const beatId = document.getElementById('adminBeatSelect')?.value;
        const userEmail = document.getElementById('adminUserEmail')?.value.trim();
        
        if (!beatId || !userEmail) {
            showToast('Please select a beat and enter user email', 'error');
            return;
        }
        
        const selectedBeat = allBeats.find(b => b.id === beatId);
        if (!selectedBeat) {
            showToast('Selected beat not found', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/purchases/generate-key`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                beatId,
                userEmail,
                amount: selectedBeat.price
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const keyResult = document.getElementById('keyResult');
            if (keyResult) {
                keyResult.style.display = 'block';
                keyResult.innerHTML = `
                    <h4>Generated Key</h4>
                    <div class="key-display">
                        <code id="generatedKeyCode">${data.purchaseKey}</code>
                        <button class="btn-icon copy-btn" onclick="copyKey('${data.purchaseKey}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </button>
                    </div>
                `;
            }
            showToast('Purchase key generated successfully!', 'success');
            
            // Reset form
            resetForm();
            
            // Refresh keys list
            setTimeout(() => {
                loadPurchaseKeysTable();
            }, 1000);
        } else {
            showToast(data.message || 'Failed to generate key', 'error');
        }
    } catch (error) {
        console.error('Generate key error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

function copyKey(key) {
    navigator.clipboard.writeText(key)
        .then(() => showToast('Key copied to clipboard!', 'success'))
        .catch(err => {
            console.error('Copy failed:', err);
            showToast('Failed to copy. Please copy manually.', 'error');
        });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function toggleUserDropdown() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

function handleUserAction(action) {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.style.display = 'none';
    
    switch (action) {
        case 'profile':
            openProfileModal();
            break;
        case 'changePassword':
            openChangePasswordModal();
            break;
        case 'adminUsers':
            openAdminUsersModal();
            break;
        case 'logout':
            logout();
            break;
    }
}

function scrollToBeats() {
    const beatsSection = document.querySelector('.beats-section');
    if (beatsSection) {
        beatsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const toastContent = toast.querySelector('.toast-content');
    if (!toastContent) return;
    
    toastContent.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    });
}

function setCurrentYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// ============================================
// AUTH MODAL FUNCTIONS (SIMPLIFIED)
// ============================================

function showAuthModal() {
    showModal('authModal');
}

async function loginUser() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            authToken = data.token;
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            updateUIForLoggedInUser();
            hideModal('authModal');
            showToast('Signed in successfully!', 'success');
        } else {
            showToast(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function registerUser() {
    const name = document.getElementById('registerName')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    const confirmPassword = document.getElementById('registerConfirmPassword')?.value;
    
    if (!name || !email || !password || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Registration successful! Please sign in.', 'success');
            // Switch to login tab
            document.querySelectorAll('.auth-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === 'login');
            });
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.toggle('active', form.id === 'loginForm');
            });
        } else {
            showToast(data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function logout() {
    try {
        if (authToken) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        authToken = null;
        currentUser = null;
        updateUIForLoggedOutUser();
        showToast('Signed out successfully', 'success');
        closeAllModals();
    }
}

// ============================================
// ADMIN UPLOAD FUNCTIONS
// ============================================

function showAdminModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        showAuthModal();
        return;
    }
    
    showModal('adminModal');
}

async function adminLogin() {
    const email = document.getElementById('adminEmail')?.value.trim();
    const password = document.getElementById('adminPassword')?.value;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.token && data.user.role === 'admin') {
            authToken = data.token;
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            updateUIForLoggedInUser();
            
            // Switch to upload view
            document.getElementById('adminLoginView').style.display = 'none';
            document.getElementById('adminUploader').style.display = 'block';
            
            showToast('Admin access granted!', 'success');
        } else {
            showToast('Admin access required', 'error');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function uploadBeat() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return;
    }
    
    const fileType = document.getElementById('fileType')?.value;
    const beatSeries = document.getElementById('beatSeries')?.value;
    const beatPrice = document.getElementById('beatPrice')?.value;
    const beatFile = document.getElementById('beatFile')?.files[0];
    
    if (!fileType || !beatSeries || !beatPrice || !beatFile) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('fileType', fileType);
        formData.append('series', beatSeries);
        formData.append('price', beatPrice);
        formData.append('file', beatFile);
        
        const response = await fetch(`${API_BASE_URL}/beats/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast('Beat uploaded successfully!', 'success');
            resetUploadForm();
            setTimeout(() => {
                hideModal('adminModal');
                loadBeats();
            }, 1500);
        } else {
            showToast(data.message || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

function resetUploadForm() {
    const form = document.getElementById('uploadForm');
    if (form) form.reset();
}

// ============================================
// OTHER FUNCTIONS (SIMPLIFIED VERSIONS)
// ============================================

function showBeatDetails(beatId) {
    // Simplified for now
    showToast('Beat details feature coming soon', 'info');
}

function showCheckoutModal(beatId) {
    // Simplified for now
    showToast('Checkout feature coming soon', 'info');
}

function playAudioPreview(audioUrl, button) {
    // Simplified for now
    showToast('Audio preview feature coming soon', 'info');
}

async function deleteBeat(beatId) {
    if (!confirm('Are you sure you want to delete this beat?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/beats/${beatId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast('Beat deleted successfully', 'success');
            allBeats = allBeats.filter(beat => beat.id !== beatId);
            filterBeatsBySeries(currentSeries);
        } else {
            showToast(data.message || 'Failed to delete beat', 'error');
        }
    } catch (error) {
        console.error('Delete beat error:', error);
        showToast('Network error deleting beat', 'error');
    }
}

// ============================================
// INITIALIZE
// ============================================
