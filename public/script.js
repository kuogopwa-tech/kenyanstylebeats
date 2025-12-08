// ============================================
// EMPIRE BEATSTORE - COMPLETE SCRIPT
// ============================================

// Configuration
const API_BASE_URL = `https://kenyanstylebeats.onrender.com/api`; // FIXED: Changed from /api/auth to /api
let currentUser = null;
let authToken = localStorage.getItem('token');

// Beats management variables
let allBeats = [];
let currentSeries = 'all';
let searchQuery = '';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 EMPIRE BEATSTORE - Initializing...');
    
    checkAuthStatus();
    setupEventListeners();
    setCurrentYear();
    
    checkAuthStatus().then(() => {
        // Then load beats with proper user permissions
        loadBeats();
    });
    
    // Set current year in footer
    document.getElementById('year').textContent = new Date().getFullYear();
});

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

async function checkAuthStatus() {
    if (!authToken) {
        console.log('🔐 No auth token found');
        updateUIForLoggedOutUser();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('🔑 Profile API response:', data);
            
            if (data.user) {
                currentUser = data.user;
                console.log(`✅ User authenticated: ${currentUser.email} (Role: ${currentUser.role})`);
                
                updateUIForLoggedInUser();
                
                // Refresh beats after successful auth check
                if (document.getElementById('beatsGrid')) {
                    refreshBeatCards();
                }
            }
        } else {
            // Token is invalid or expired
            console.log('❌ Token invalid/expired');
            localStorage.removeItem('token');
            authToken = null;
            currentUser = null;
            updateUIForLoggedOutUser();
            
            // Refresh beats to remove delete buttons
            if (document.getElementById('beatsGrid')) {
                refreshBeatCards();
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        authToken = null;
        currentUser = null;
        updateUIForLoggedOutUser();
        
        if (document.getElementById('beatsGrid')) {
            refreshBeatCards();
        }
    }
}

function updateUIForLoggedInUser() {
    const signBtn = document.getElementById('signBtn');
    const userDropdown = document.getElementById('userDropdown');
    const userInitial = document.getElementById('userInitial');
    const userEmail = document.getElementById('userEmail');
    const adminUsersBtn = document.getElementById('adminUsersBtn');
    const adminDivider = document.getElementById('adminDivider');
    const adminBtn = document.getElementById('adminBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn'); // Add this
    
    if (!signBtn || !userDropdown || !userInitial || !userEmail) return;
    
    if (currentUser) {
        console.log(`🔄 Updating UI for user: ${currentUser.email} (Role: ${currentUser.role})`);
        
        // Update user info
        userInitial.textContent = currentUser.name?.charAt(0).toUpperCase() || 'U';
        userEmail.textContent = currentUser.email;
        
        // Show/hide admin features
        if (currentUser.role === 'admin') {
            console.log('👑 User is ADMIN - showing admin features');
            if (adminUsersBtn) adminUsersBtn.style.display = 'block';
            if (adminDivider) adminDivider.style.display = 'block';
            if (adminBtn) adminBtn.style.display = 'inline-block';
            if (adminPanelBtn) { // Show admin panel button
                adminPanelBtn.style.display = 'inline-flex';
                adminPanelBtn.style.alignItems = 'center';
                adminPanelBtn.style.gap = '6px';
            }
        } else {
            console.log('👤 User is REGULAR - hiding admin features');
            if (adminUsersBtn) adminUsersBtn.style.display = 'none';
            if (adminDivider) adminDivider.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminPanelBtn) adminPanelBtn.style.display = 'none'; // Hide admin panel button
        }
        
        // Update UI visibility
        signBtn.style.display = 'none';
        userDropdown.style.display = 'block';
        
        // Force refresh beats to update delete buttons
        setTimeout(() => {
            if (document.getElementById('beatsGrid')) {
                displayBeats(allBeats);
            }
        }, 100);
    }
}

// Also update updateUIForLoggedOutUser
function updateUIForLoggedOutUser() {
    const signBtn = document.getElementById('signBtn');
    const userDropdown = document.getElementById('userDropdown');
    const adminBtn = document.getElementById('adminBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn'); // Add this
    
    if (signBtn) signBtn.style.display = 'block';
    if (userDropdown) userDropdown.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none';
    if (adminPanelBtn) adminPanelBtn.style.display = 'none'; // Hide admin panel button
}

// Add modal close listener for admin panel
document.addEventListener('click', function(e) {
    // Close admin panel on backdrop click
    if (e.target.id === 'adminPanelModal') {
        closeAdminPanel();
    }
    
    // Close admin panel on escape key
    if (e.key === 'Escape') {
        const adminPanelModal = document.getElementById('adminPanelModal');
        if (adminPanelModal && adminPanelModal.style.display === 'flex') {
            closeAdminPanel();
        }
    }
});

// Add close button functionality
document.addEventListener('DOMContentLoaded', function() {
    // Close admin panel when close button is clicked
    document.addEventListener('click', function(e) {
        if (e.target.closest('.modal-close') && e.target.closest('#adminPanelModal')) {
            closeAdminPanel();
        }
    });
});

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Sign In button
    const signBtn = document.getElementById('signBtn');
    if (signBtn) {
        signBtn.addEventListener('click', showAuthModal);
    }
    
    // Admin Upload button
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.addEventListener('click', showAdminModal);
    }
    
    // User dropdown menu
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.addEventListener('click', toggleUserDropdown);
    }
    
    // User dropdown actions
    document.querySelectorAll('#userDropdownMenu .dropdown-item').forEach(item => {
        item.addEventListener('click', function() {
            const action = this.dataset.action;
            handleUserAction(action);
        });
    });
    
    // Admin modal login
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', adminLogin);
    }
    
    // Upload form submission
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            uploadBeat();
        });
    }
    
    // Reset form button
    const resetFormBtn = document.getElementById('resetFormBtn');
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetUploadForm();
            showToast('Form reset successfully', 'info');
        });
    }
    
    // Admin logout button
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetUploadForm();
            adminLogout();
        });
    }
    
    // Browse beats button
    const browseTopBtn = document.getElementById('browseTop');
    if (browseTopBtn) {
        browseTopBtn.addEventListener('click', () => {
            const beatsSection = document.querySelector('.beats-section');
            if (beatsSection) {
                beatsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    // Explore beats button
    const exploreBtn = document.getElementById('exploreBtn');
    if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
            const dropdown = document.getElementById('exploreDropdown');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    }
    
    // How it works button
    const howBtn = document.getElementById('howBtn');
    if (howBtn) {
        howBtn.addEventListener('click', () => {
            showModal('howModal');
        });
    }
    
    // Search beats
    const searchInput = document.getElementById('searchBeats');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            filterBeatsBySeries(currentSeries);
        });
    }
    
    // Refresh beats button
    const refreshBtn = document.getElementById('refreshBeats');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadBeats();
            showToast('Beats refreshed', 'info');
        });
    }
    
    // File upload preview
    setupFileUploadPreview();
}

// Refresh beat cards with current user permissions
function refreshBeatCards() {
    console.log(`🔄 Refreshing beat cards with current user role: ${currentUser?.role || 'Not logged in'}`);
    
    if (allBeats.length > 0) {
        // Save current scroll position
        const scrollPos = window.scrollY;
        
        // Re-display beats with updated admin status
        displayBeats(allBeats);
        
        // Restore scroll position
        window.scrollTo(0, scrollPos);
        
        // Update series sidebar
        const seriesList = [...new Set(allBeats.map(b => b.series))];
        populateSeriesSidebar(seriesList);
        
        console.log(`✅ Beat cards refreshed with admin=${currentUser?.role === 'admin'}`);
    }
}
// ============================================
// BEATS DISPLAY FUNCTIONS
// ============================================

// Load beats from API
// Load beats from API
async function loadBeats() {
    console.log('📡 Loading beats from API...');
    console.log(`👤 Current user role before loading: ${currentUser?.role || 'Not logged in'}`);
    
    try {
        const beatsGrid = document.getElementById('beatsGrid');
        if (beatsGrid) {
            beatsGrid.innerHTML = '<div style="color:white;padding:20px;text-align:center">Loading beats...</div>';
        }
        
        const response = await fetch(`${API_BASE_URL}/beats`);
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allBeats = data.beats;
            console.log(`✅ Loaded ${allBeats.length} beats`);
            console.log(`👤 User role during display: ${currentUser?.role || 'Not logged in'}`);
            
            populateSeriesSidebar(data.series);
            displayBeats(allBeats);
            updateExploreDropdown(data.series);
        } else {
            console.error('API returned error:', data.message);
            showToast('Failed to load beats', 'error');
            displayNoBeatsMessage();
        }
    } catch (error) {
        console.error('Error loading beats:', error);
        
        const beatsGrid = document.getElementById('beatsGrid');
        if (beatsGrid) {
            beatsGrid.innerHTML = `
                <div style="color:#dc3545;padding:20px;text-align:center">
                    <p>Error loading beats: ${error.message}</p>
                    <p>Make sure the backend server is running at ${API_BASE_URL}</p>
                </div>
            `;
        }
        
        showToast('Network error loading beats', 'error');
    }
}
// Populate series sidebar
function populateSeriesSidebar(seriesList) {
    const seriesListElement = document.getElementById('seriesList');
    if (!seriesListElement) {
        console.log('❌ seriesList element not found');
        return;
    }
    
    if (seriesList.length === 0) {
        seriesListElement.innerHTML = '<li style="color:var(--muted)">No series available</li>';
        return;
    }
    
    // Create "All" option
    let html = `
        <li>
            <button class="series-btn ${currentSeries === 'all' ? 'active' : ''}" 
                    data-series="all">
                <span class="series-icon">🎵</span>
                All Beats
                <span class="series-count">${allBeats.length}</span>
            </button>
        </li>
    `;
    
    // Add each series
    seriesList.forEach(series => {
        const count = allBeats.filter(beat => beat.series === series).length;
        html += `
            <li>
                <button class="series-btn ${currentSeries === series ? 'active' : ''}" 
                        data-series="${series}">
                    <span class="series-icon">🎹</span>
                    ${series}
                    <span class="series-count">${count}</span>
                </button>
            </li>
        `;
    });
    
    seriesListElement.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('.series-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const series = this.dataset.series;
            filterBeatsBySeries(series);
        });
    });
}

// Update explore dropdown
function updateExploreDropdown(seriesList) {
    const exploreDropdown = document.getElementById('exploreDropdown');
    if (!exploreDropdown) return;
    
    let html = '<button class="dropdown-item" data-series="all">All Beats</button>';
    
    seriesList.forEach(series => {
        const count = allBeats.filter(beat => beat.series === series).length;
        html += `
            <button class="dropdown-item" data-series="${series}">
                ${series} <span style="color:var(--muted);font-size:12px">(${count})</span>
            </button>
        `;
    });
    
    exploreDropdown.innerHTML = html;
    
    // Add click listeners
    document.querySelectorAll('#exploreDropdown .dropdown-item').forEach(item => {
        item.addEventListener('click', function() {
            const series = this.dataset.series;
            filterBeatsBySeries(series);
            exploreDropdown.style.display = 'none';
        });
    });
}

// Filter beats by series
function filterBeatsBySeries(series) {
    currentSeries = series;
    
    // Update active state in sidebar
    document.querySelectorAll('.series-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.series === series);
    });
    
    // Filter beats
    let filteredBeats = allBeats;
    if (series !== 'all') {
        filteredBeats = allBeats.filter(beat => beat.series === series);
    }
    
    // Apply search filter if any
    if (searchQuery) {
        filteredBeats = filteredBeats.filter(beat =>
            beat.title.toLowerCase().includes(searchQuery) ||
            beat.series.toLowerCase().includes(searchQuery) ||
            (beat.genre && beat.genre.toLowerCase().includes(searchQuery))
        );
    }
    
    displayBeats(filteredBeats);
}

// Display beats in grid
function displayBeats(beats) {
    const beatsGrid = document.getElementById('beatsGrid');
    const noBeatsMessage = document.getElementById('noBeatsMessage');
    
    if (!beatsGrid) {
        console.log('❌ beatsGrid element not found');
        return;
    }
    
    console.log(`🎨 Displaying ${beats.length} beats`);
    
    if (beats.length === 0) {
        beatsGrid.innerHTML = '';
        if (noBeatsMessage) noBeatsMessage.style.display = 'block';
        return;
    }
    
    if (noBeatsMessage) noBeatsMessage.style.display = 'none';
    
    beatsGrid.innerHTML = beats.map(beat => createBeatCard(beat)).join('');
    
    // Add event listeners to beat cards
    addBeatCardEventListeners();
}

// Create beat card HTML
// Create beat card HTML
function createBeatCard(beat) {
    console.log(`🎨 Creating card for beat: ${beat.title}`);
    
    // Check admin status
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    console.log(`   User: ${currentUser?.email || 'Not logged in'}`);
    console.log(`   Role: ${currentUser?.role || 'No role'}`);
    console.log(`   Is Admin: ${isAdmin}`);
    
    const formattedPrice = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(beat.price);
    
    // Build delete button HTML conditionally
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

// Add event listeners to beat cards
function addBeatCardEventListeners() {
    // Play button for audio beats
    document.querySelectorAll('.play-btn[data-audio]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const audioUrl = this.dataset.audio;
            playAudioPreview(audioUrl, this);
        });
    });
    
    // Preview button
    document.querySelectorAll('.btn[data-action="preview"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const beatId = this.dataset.beatId;
            showBeatDetails(beatId);
        });
    });
    
    // Buy button
    document.querySelectorAll('.btn[data-action="buy"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const beatId = this.dataset.beatId;
            showCheckoutModal(beatId);
        });
    });
    
    // Delete button (admin only)
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const beatId = this.dataset.beatId;
            const confirmed = confirm('Are you sure you want to delete this beat?');
            if (confirmed) {
                await deleteBeat(beatId);
            }
        });
    });
}

// Display no beats message
function displayNoBeatsMessage() {
    const beatsGrid = document.getElementById('beatsGrid');
    if (beatsGrid) {
        beatsGrid.innerHTML = '';
    }
    
    const noBeatsMessage = document.getElementById('noBeatsMessage');
    if (noBeatsMessage) {
        noBeatsMessage.style.display = 'block';
    }
}

// ============================================
// BEAT DETAILS & ACTIONS
// ============================================

// Show beat details in modal
async function showBeatDetails(beatId) {
    try {
        const response = await fetch(`${API_BASE_URL}/beats/${beatId}`);
        const data = await response.json();
        
        if (data.success) {
            const beat = data.beat;
            const modal = document.getElementById('previewModal');
            const title = document.getElementById('previewTitle');
            const meta = document.getElementById('previewMeta');
            const audio = document.getElementById('previewAudio');
            const downloadBtn = document.getElementById('previewDownload');
            const buyBtn = document.getElementById('previewBuy');
            
            if (!modal || !title) return;
            
            title.textContent = beat.title;
            meta.textContent = `${beat.genre || 'No Genre'} • ${beat.series} • ${new Date(beat.createdAt).toLocaleDateString()}`;
            
            if (beat.fileType === 'Audio') {
                audio.src = beat.fileUrl;
                audio.style.display = 'block';
                if (downloadBtn) downloadBtn.style.display = 'none';
            } else {
                audio.style.display = 'none';
                if (downloadBtn) {
                    downloadBtn.style.display = 'block';
                    downloadBtn.onclick = () => downloadBeat(beat.fileName);
                }
            }
            
            if (buyBtn) buyBtn.onclick = () => showCheckoutModal(beatId);
            
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
        }
    } catch (error) {
        console.error('Error fetching beat details:', error);
        showToast('Error loading beat details', 'error');
    }
}

// Show checkout modal
// ============================================
// UPDATED CHECKOUT FLOW
// ============================================

// Show checkout modal
function showCheckoutModal(beatId) {
    const beat = allBeats.find(b => b.id === beatId);
    if (!beat) return;
    
    const modal = document.getElementById('checkoutModal');
    checkoutHideModal();
    const title = document.getElementById('checkoutTitle');
    const body = document.getElementById('checkoutBody');
    const footer = document.getElementById('checkoutFooter');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleCheckoutEscape);
    
    if (!modal || !title || !body || !footer) return;
    
    const formattedPrice = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(beat.price);
    
    title.textContent = `Purchase: ${beat.title}`;
    
    // Check if user is logged in
    if (!currentUser || !authToken) {
        body.innerHTML = `
            <div class="checkout-login-required">
                <svg class="checkout-login-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <h3 class="checkout-login-title">Sign In Required</h3>
                <p class="checkout-login-message">
                    Please sign in to make a purchase
                </p>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="checkout-btn-secondary" onclick="hideModal('checkoutModal')">Cancel</button>
            <button class="checkout-whatsapp-button" onclick="hideModal('checkoutModal'); showAuthModal();">Sign In</button>
        `;
        
        modal.style.display = 'flex';
        return;
    }
    
    // Step 1: Show purchase info and WhatsApp contact
    body.innerHTML = `
        <div class="checkout-step" id="checkoutStep1">
            <!-- Beat Information Card -->
            <div class="checkout-beat-info-card">
                <div class="checkout-beat-header">
                    <div class="checkout-beat-details">
                        <h3 class="checkout-beat-title">${beat.title}</h3>
                        <div class="checkout-beat-tags">
                            <span class="checkout-tag checkout-tag-series">${beat.series}</span>
                            <span class="checkout-tag checkout-tag-filetype">${beat.fileType}</span>
                            <span class="checkout-tag checkout-tag-uploader">By: ${beat.uploadedBy?.name || 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="checkout-price-display">
                        <div class="checkout-price-label">PRICE</div>
                        <div class="checkout-price-value">${formattedPrice}</div>
                    </div>
                </div>
                
                <div class="checkout-beat-footer">
                    <div class="checkout-timer-info">
                        <svg class="checkout-timer-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Complete purchase in 2-5 minutes</span>
                    </div>
                </div>
            </div>
            
            <!-- Main Content Area -->
            <div class="checkout-main-content">
                <!-- Left Column - Instructions -->
                <div class="checkout-instructions-column">
                    <div class="checkout-instructions-container">
                        <div class="checkout-instructions-header">
                            <div class="checkout-instructions-header-inner">
                                <div class="checkout-instructions-number">1</div>
                                <div class="checkout-instructions-title-block">
                                    <h4 class="checkout-instructions-title">Purchase Instructions</h4>
                                    <p class="checkout-instructions-subtitle">Follow these steps to get your beat</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Scrollable Steps Content -->
                        <div class="checkout-scrollable-steps">
                            <!-- Steps Grid -->
                            <div class="checkout-steps-grid">
                                ${generateStepsHTML(currentUser.email)}
                            </div>
                            
                            <!-- Important Info Box -->
                            <div class="checkout-info-box">
                                ${generateInfoBoxHTML()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Right Column - Actions -->
                <div class="checkout-actions-column">
                    ${generateActionsHTML(beat, currentUser.email, formattedPrice, beatId)}
                </div>
            </div>
            
            <!-- Bottom Actions -->
            <div class="checkout-bottom-actions">
                <div class="checkout-bottom-buttons">
                    <button class="checkout-btn-secondary" onclick="hideModal('checkoutModal')">
                        Cancel
                    </button>
                    <button class="checkout-btn-purchases" onclick="checkMyPurchases()">
                        <svg class="checkout-purchases-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        My Purchases
                    </button>
                </div>
            </div>
        </div>
    `;

    // Helper functions
    function generateStepsHTML(email) {
        const steps = [
            { num: 1, title: "Contact on WhatsApp", desc: `Click WhatsApp button to message the seller.`, color: "var(--accent1)" },
            { num: 2, title: "Complete Payment", desc: "Pay via seller's whatsapp number. Confirm payment with seller.", color: "#28a745" },
            { num: 3, title: "Receive Purchase Key", desc: 'Get unique key via WhatsApp. Example format: <code class="checkout-key-example">BKT-7X92-3F8A-1C5D</code>', color: "#ffc107" }
        ];
        
        return steps.map(step => `
            <div class="checkout-step-card" style="border-left-color: ${step.color};">
                <div class="checkout-step-card-inner">
                    <div class="checkout-step-number" style="background: ${step.color}20; color: ${step.color};">
                        ${step.num}
                    </div>
                    <div class="checkout-step-content">
                        <h5 class="checkout-step-title">${step.title}</h5>
                        <p class="checkout-step-desc">${step.desc}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function generateInfoBoxHTML() {
        return `
            <div class="checkout-info-header">
                <div class="checkout-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#856404" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>
                <h5 class="checkout-info-title">Important Information</h5>
            </div>
            <div class="checkout-info-points">
                <div class="checkout-info-point">
                    <div class="checkout-info-bullet" style="background: #28a745;"></div>
                    <span class="checkout-info-text">Keys are linked to your account</span>
                </div>
                <div class="checkout-info-point">
                    <div class="checkout-info-bullet" style="background: #dc3545;"></div>
                    <span class="checkout-info-text">One-time use only</span>
                </div>
                <div class="checkout-info-point">
                    <div class="checkout-info-bullet" style="background: #17a2b8;"></div>
                    <span class="checkout-info-text">Valid for 24 hours after generation</span>
                </div>
            </div>
        `;
    }

    function generateActionsHTML(beat, email, price, beatId) {
        const whatsappNumber = getWhatsAppNumber(beat.uploadedBy?.whatsapp);
        const whatsappMessage = encodeURIComponent(`Hello! I want to purchase "${beat.title}" (${price}). My email is: ${email}`);
        
        return `
            <!-- WhatsApp Action Card -->
            <div class="checkout-whatsapp-card">
                <div class="checkout-whatsapp-header">
                    <div class="checkout-whatsapp-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.130-.606.134-.133.298-.347.446-.520.149-.174.198-.298.298-.497.099-.198.050-.371-.025-.520-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.500-.669-.510-.173-.008-.371-.010-.57-.010-.198 0-.520.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.200 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.826 9.86 0 0 1 2.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.333 .157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.892 0-3.18-1.24-6.162-3.495-8.411"/>
                        </svg>
                    </div>
                    <h4 class="checkout-whatsapp-title">Start Purchase</h4>
                    <p class="checkout-whatsapp-subtitle">
                        Contact seller directly via WhatsApp
                    </p>
                </div>
                
                <a href="https://wa.me/${whatsappNumber}?text=${whatsappMessage}" 
                   target="_blank" 
                   class="checkout-whatsapp-button">
                    Contact on WhatsApp
                </a>
            </div>
            
            <!-- Key Entry Card -->
            <div class="checkout-key-card">
                <div class="checkout-key-header">
                    <div class="checkout-key-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent1)" stroke-width="2">
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                        </svg>
                    </div>
                    <h5 class="checkout-key-title">Already Have Key?</h5>
                    <p class="checkout-key-subtitle">
                        Enter purchase key to download instantly
                    </p>
                </div>
                
                <button onclick="handleEnterKey('${beatId}')" class="checkout-key-button">
                    Enter Purchase Key
                </button>
            </div>
            
            <!-- User Info Card -->
            <div class="checkout-user-info">
                <div class="checkout-user-header">
                    <svg class="checkout-user-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent1)" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <div class="checkout-user-details">
                        <div class="checkout-user-label">Logged in as</div>
                        <div class="checkout-user-email">
                            ${email}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function checkoutHideModal() {
    const modal = document.getElementById('checkoutModal');
    const body = document.getElementById('checkoutBody');
    const footer = document.getElementById('checkoutFooter');
    
    // Clean up the content
    if (body) body.innerHTML = '';
    if (footer) footer.innerHTML = '';
    
    // Remove any event listeners that might be lingering
    document.removeEventListener('keydown', handleCheckoutEscape);
    
    // Hide modal
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset any global modal state variables
    window.currentCheckoutStep = 1;
}

// Separate escape handler for checkout modal
function handleCheckoutEscape(e) {
    if (e.key === 'Escape') {
        checkoutHideModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        checkoutHideModal();
    }
});
// Show key input step
// Show key input step - FIXED VERSION
function showKeyInputStep(beatId) {
    const body = document.getElementById('checkoutBody');
    const footer = document.getElementById('checkoutFooter');
    
    if (!body || !footer) return;
    
    // Clear any existing content and listeners
    body.innerHTML = '';
    footer.innerHTML = '';
    
    // Store the current beatId globally for navigation
    window.currentBeatId = beatId;
    
    body.innerHTML = `
        <div class="checkout-key-input-step">
            <!-- Instructions Section -->
            <div class="checkout-step-header" style="margin-bottom: 1.5rem;">
                <h3 class="checkout-step-title" style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text);">
                    Enter Purchase Key
                </h3>
                <p class="checkout-step-subtitle" style="color: var(--muted); font-size: 0.9375rem; line-height: 1.5;">
                    Enter the purchase key you received from the seller after making payment.
                </p>
            </div>
            
            <!-- Key Input Section -->
            <div class="checkout-key-input-container">
                <label class="checkout-input-label">
                    Purchase Key
                </label>
                
                <div class="checkout-input-group">
                    <input type="text" 
                           id="purchaseKeyInput" 
                           placeholder="Enter your purchase key (e.g., EMP-ABC123XYZ)"
                           class="checkout-key-input"
                           maxlength="20"
                           autocomplete="off"
                           spellcheck="false">
                    <button class="checkout-clear-btn" onclick="clearKeyInput()">
                        Clear
                    </button>
                </div>
                
                <div class="checkout-key-hint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>Keys are 10 characters long, start with EMP-</span>
                </div>
            </div>
            
            <!-- Verification Status -->
            <div id="keyVerificationStatus" class="checkout-status-container"></div>
        </div>
    `;
    
    // Update footer
    footer.innerHTML = `
        <div class="checkout-key-input-footer">
            <button class="checkout-back-btn" onclick="goBackToCheckout()">
                ← Back to Checkout
            </button>
            <button class="checkout-verify-btn" id="verifyDownloadBtn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Verify & Download
            </button>
        </div>
    `;
    
    // Add event listener properly
    const verifyBtn = document.getElementById('verifyDownloadBtn');
    if (verifyBtn) {
        // Remove any existing listeners
        verifyBtn.replaceWith(verifyBtn.cloneNode(true));
        const newVerifyBtn = document.getElementById('verifyDownloadBtn');
        newVerifyBtn.addEventListener('click', verifyAndDownloadPurchaseKey);
    }
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('purchaseKeyInput');
        if (input) {
            input.focus();
            // Auto-select text if there's any
            input.select();
        }
    }, 100);
}

// Helper function to go back
function goBackToCheckout() {
    if (window.currentBeatId) {
        showCheckoutModal(window.currentBeatId);
    } else {
        checkoutHideModal();
    }
}

// Clear key input function
function clearKeyInput() {
    const input = document.getElementById('purchaseKeyInput');
    if (input) {
        input.value = '';
        input.focus();
    }
}

// Combined Verify & Download function
// Combined Verify & Download function
// Combined Verify & Download function - UPDATED VERSION
async function verifyAndDownloadPurchaseKey() {
    const purchaseKey = document.getElementById('purchaseKeyInput')?.value.trim();
    const statusDiv = document.getElementById('keyVerificationStatus');
    
    // Try to get button by ID first, then fallback
    let verifyBtn = document.getElementById('verifyDownloadBtn');
    if (!verifyBtn) {
        verifyBtn = document.querySelector('button[onclick="verifyAndDownloadPurchaseKey()"]');
    }
    
    if (!purchaseKey) {
        showStatus(statusDiv, 'Please enter your purchase key', 'error');
        return;
    }
    
    if (!verifyBtn) {
        console.error('Verify button not found');
        showStatus(statusDiv, 'System error. Please try again.', 'error');
        return;
    }
    
    // Store original button state
    const originalHTML = verifyBtn.innerHTML;
    verifyBtn.disabled = true;
    
    // Show loading - use innerHTML to properly render SVG
    verifyBtn.innerHTML = `
        <span style="display:flex;align-items:center;gap:8px">
            <svg class="loading-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"></path>
            </svg>
            Verifying & Downloading...
        </span>
    `;
    
    // Add CSS for spinner if not already added
    if (!document.querySelector('#spinner-style')) {
        const spinnerStyle = document.createElement('style');
        spinnerStyle.id = 'spinner-style';
        spinnerStyle.textContent = `
            .loading-spinner {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(spinnerStyle);
    }
    
    try {
        // Step 1: Verify the key
        const verifyResponse = await fetch(`${API_BASE_URL}/purchases/verify-key`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ purchaseKey })
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyData.success) {
            // Show verification success
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="success-message" style="background:var(--success-bg);padding:15px;border-radius:8px;">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <strong>Purchase Verified Successfully!</strong>
                        </div>
                        <p>Starting download now...</p>
                    </div>
                `;
            }
            
            // Step 2: Download immediately using the downloadUrl from verification
            try {
                await downloadAfterVerification(verifyData, purchaseKey);
                
                // Success - close modal after download starts
                setTimeout(() => {
                    hideModal('checkoutModal');
                    showToast('✅ Download started!', 'success');
                }, 1000);
                
            } catch (downloadError) {
                console.error('Download error:', downloadError);
                
                // Show error but keep verification success
                if (statusDiv) {
                    statusDiv.innerHTML = `
                        <div class="success-message" style="background:var(--success-bg);padding:15px;border-radius:8px;margin-bottom:10px;">
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <strong>Purchase Verified Successfully!</strong>
                            </div>
                            <p>But download failed. Please try again.</p>
                        </div>
                    `;
                }
                
                // Change button to "Try Download Again"
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = `
                    <span style="display:flex;align-items:center;gap:8px">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                        </svg>
                        Try Download Again
                    </span>
                `;
                
                // Remove old event listeners and add new one
                verifyBtn.replaceWith(verifyBtn.cloneNode(true));
                const newBtn = document.getElementById('verifyDownloadBtn') || verifyBtn;
                newBtn.addEventListener('click', () => retryDownload(purchaseKey));
            }
            
        } else {
            showStatus(statusDiv, verifyData.message || 'Invalid purchase key', 'error');
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = originalHTML;
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        showStatus(statusDiv, 'Network error. Please try again.', 'error');
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = originalHTML;
    }
}

async function downloadAfterVerification(verifyData, purchaseKey) {
    const authToken = localStorage.getItem('token');
    
    if (!verifyData.beat || !verifyData.beat.fileId) {
        throw new Error('No beat file ID provided');
    }
    
    const fileId = verifyData.beat.fileId;
    const beat = verifyData.beat;
    
    console.log('⬇️ Downloading file ID:', fileId);
    console.log('🔑 Purchase key:', purchaseKey);
    console.log('📤 Request URL:', `${API_BASE_URL}/beats/download/${fileId}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/beats/download/${fileId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json, */*'
            },
            body: JSON.stringify({ 
                purchaseKey: purchaseKey.trim()
            })
        });
        
        console.log('📥 Download response status:', response.status);
        console.log('📥 Download response headers:', Object.fromEntries(response.headers.entries()));
        
        // Check if response is JSON (error) or file
        const contentType = response.headers.get('content-type');
        console.log('📥 Content-Type:', contentType);
        
        if (!response.ok) {
            // Try to read error message
            const errorText = await response.text();
            console.error('❌ Download failed:', response.status, errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(errorData.message || `Download failed: ${response.status}`);
            } catch {
                throw new Error(`Download failed: ${response.status} - ${errorText}`);
            }
        }
        
        if (contentType && contentType.includes('application/json')) {
            // It's a JSON response (shouldn't happen if successful)
            const jsonResponse = await response.json();
            console.error('Unexpected JSON response:', jsonResponse);
            throw new Error(jsonResponse.message || 'Unexpected response format');
        }
        
        // It's a file - proceed with download
        const blob = await response.blob();
        console.log('✅ Received blob:', blob.size, 'bytes, type:', blob.type);
        
        // Get filename
        let filename = beat.originalName || beat.fileName || beat.title || 'download.sty';
        filename = filename.replace(/[<>:"/\\|?*]/g, '_');
        
        // Ensure proper extension
        if (!filename.includes('.')) {
            if (blob.type.includes('audio/mpeg')) filename += '.mp3';
            else if (blob.type.includes('audio/wav')) filename += '.wav';
            else if (blob.type.includes('application/octet-stream')) filename += '.sty';
            else filename += '.bin';
        }
        
        console.log('💾 Saving as:', filename);
        
        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);
        
        console.log('✅ Download triggered successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Download error:', error);
        throw error;
    }
}

// Retry download function - simplified version
async function retryDownload(purchaseKey) {
    const statusDiv = document.getElementById('keyVerificationStatus');
    const verifyBtn = document.querySelector('button[onclick^="retryDownload"]');
    
    if (!verifyBtn) return;
    
    // Show loading
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = `
        <span style="display:flex;align-items:center;gap:8px">
            <svg class="loading-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Retrying download...
        </span>
    `;
    
    try {
        // Try to verify again first (might fail if already used)
        const verifyResponse = await fetch(`${API_BASE_URL}/purchases/verify-key`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ purchaseKey })
        });
        
        const verifyData = await verifyResponse.json();
        
        if (verifyData.success) {
            // Try download again
            await downloadAfterVerification(verifyData, purchaseKey);
            
            // Close modal after successful download
            setTimeout(() => {
                hideModal('checkoutModal');
                showToast('✅ Download started!', 'success');
            }, 1000);
            
        } else {
            showStatus(statusDiv, 
                'Key already used. Please contact support for assistance.', 
                'error'
            );
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = 'Contact Support';
            verifyBtn.setAttribute('onclick', 'contactSupport()');
        }
        
    } catch (error) {
        console.error('Retry error:', error);
        showStatus(statusDiv, 'Retry failed. Please contact support.', 'error');
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = 'Contact Support';
        verifyBtn.setAttribute('onclick', 'contactSupport()');
    }
}

// Contact support function
function contactSupport() {
    const whatsappNumber = '254796392424'; // Your support number
    const message = encodeURIComponent(
        `Hello! I need help with a download issue on Empire Beatstore.\n` +
        `My purchase key was verified but download failed.\n` +
        `Please assist.`
    );
    
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
}

// Retry download function

// Helper function to clear input
function clearKeyInput() {
    const input = document.getElementById('purchaseKeyInput');
    if (input) input.value = '';
}

// Remove old duplicate functions
// Delete these if they exist:
// - startDownloadVerifiedBeat()
// - The second verifyPurchaseKey() function
// - downloadBeatAfterVerification() (or keep it but update it)

// Helper to check if beat is free
async function checkBeatPrice(beatId, authToken) {
    try {
        const response = await fetch(`${API_BASE_URL}/beats/${beatId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const beat = await response.json();
            return beat.price === 0;
        }
        return false;
    } catch (error) {
        console.error('Error checking beat price:', error);
        return false;
    }
}
// Check user's purchases
async function checkMyPurchases() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchases/my-purchases`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const modal = document.getElementById('checkoutModal');
            const body = document.getElementById('checkoutBody');
            const footer = document.getElementById('checkoutFooter');
            
            if (!modal || !body || !footer) return;
            
            if (data.purchases.length === 0) {
                body.innerHTML = `
                    <div style="text-align:center;padding:40px 20px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <h3 style="margin:20px 0 10px 0;">No Purchases Yet</h3>
                        <p style="color:var(--muted);">
                            You haven't made any purchases yet.
                        </p>
                    </div>
                `;
            } else {
                let html = `
                    <div class="purchases-list">
                        <h4 style="margin-bottom:15px;">My Purchases</h4>
                `;
                
                data.purchases.forEach(purchase => {
                    const formattedPrice = new Intl.NumberFormat('en-KE', {
                        style: 'currency',
                        currency: 'KES'
                    }).format(purchase.beat.price);
                    
                    const statusBadge = purchase.status === 'used' 
                        ? '<span class="status-badge used">Used</span>'
                        : `<span class="status-badge pending">Valid</span>`;
                    
                    const downloadButton = purchase.status === 'pending'
                        ? `<button class="btn small" onclick="usePurchaseKey('${purchase.purchaseKey}')">Download</button>`
                        : `<span class="text-muted">Already Downloaded</span>`;
                    
                    html += `
                        <div class="purchase-item-card" style="background:var(--card-bg);padding:15px;border-radius:8px;margin-bottom:10px;border:1px solid var(--border);">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                                <div>
                                    <strong>${purchase.beat.title}</strong>
                                    <div style="font-size:14px;color:var(--muted);margin-top:5px;">
                                        ${purchase.beat.series} • ${purchase.beat.fileType} • ${formattedPrice}
                                    </div>
                                </div>
                                ${statusBadge}
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;">
                                <div style="color:var(--muted);">
                                    Key: <code style="background:var(--bg-secondary);padding:2px 6px;border-radius:3px;">${purchase.purchaseKey}</code>
                                    ${purchase.status === 'pending' 
                                        ? `<br><small>Expires: ${new Date(purchase.expiresAt).toLocaleDateString()}</small>`
                                        : `<br><small>Used: ${new Date(purchase.usedAt).toLocaleDateString()}</small>`
                                    }
                                </div>
                                ${downloadButton}
                            </div>
                        </div>
                    `;
                });
                
                html += `</div>`;
                body.innerHTML = html;
            }
            
            footer.innerHTML = `
                <button class="btn secondary" onclick="hideModal('checkoutModal')">Close</button>
                <button class="btn" onclick="hideModal('checkoutModal'); loadBeats();">
                    Browse Beats
                </button>
            `;
            
        } else {
            showToast(data.message || 'Error loading purchases', 'error');
        }
        
    } catch (error) {
        console.error('Check purchases error:', error);
        showToast('Network error loading purchases', 'error');
    }
}

// ============================================
// ADMIN PANEL - KEY GENERATION FUNCTIONS
// ============================================

// Generate purchase key (admin panel)
// ============================================
// SAFE GENERATE PURCHASE KEY FUNCTION
// ============================================

// SIMPLIFIED GENERATE KEY FUNCTION
async function generatePurchaseKeyAdmin() {
    console.log('🔑 Generating purchase key...');
    
    try {
        // Get form values
        const beatId = document.getElementById('adminBeatSelect').value;
        const userEmail = document.getElementById('adminUserEmail').value.trim();
        const customAmount = document.getElementById('adminKeyAmount').value;
        const keyResult = document.getElementById('keyResult');
        
        // Validate
        if (!beatId || !userEmail) {
            showToast('Please select a beat and enter user email', 'error');
            return;
        }
        
        // Find the selected beat
        const selectedBeat = allBeats.find(b => b.id === beatId);
        if (!selectedBeat) {
            showToast('Selected beat not found', 'error');
            return;
        }
        
        // Calculate amount (use custom if provided, otherwise use beat price)
        const amount = customAmount ? parseFloat(customAmount) : selectedBeat.price;
        
        // Show loading
        keyResult.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <div class="loading-spinner" style="margin:0 auto;width:30px;height:30px;border:3px solid var(--border);border-top-color:var(--accent1);border-radius:50%;animation:spin 1s linear infinite;"></div>
                <p style="margin-top:10px;color:var(--muted);">Generating key...</p>
            </div>
        `;
        
        // Make API request
        const response = await fetch(`${API_BASE_URL}/purchases/generate-key`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                beatId,
                userEmail,
                amount
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.purchaseKey) {
            const key = data.purchaseKey;
            
            // Show success with key
            keyResult.innerHTML = `
                <div style="text-align:center;background:var(--success-bg);padding:20px;border-radius:8px;border:2px solid var(--success);">
                    <div style="color:var(--success);font-size:20px;margin-bottom:10px;">✅ Key Generated!</div>
                    <div style="background:var(--card-bg);padding:15px;border-radius:6px;margin:15px 0;font-family:monospace;font-size:18px;letter-spacing:1px;">
                        ${key}
                    </div>
                    <div style="margin-bottom:15px;color:var(--muted);">
                        <div><strong>Beat:</strong> ${selectedBeat.title}</div>
                        <div><strong>User:</strong> ${userEmail}</div>
                        <div><strong>Amount:</strong> ${amount} KES</div>
                    </div>
                    <div style="display:flex;gap:10px;justify-content:center;">
                        <button class="btn small" onclick="copyToClipboard('${key}')">
                            📋 Copy Key
                        </button>
                        <button class="btn small secondary" onclick="shareKeyViaWhatsApp('${key}', '${userEmail}', '${selectedBeat.title}')">
                            📱 Share
                        </button>
                    </div>
                </div>
            `;
            
            // Reset form
            document.getElementById('adminUserEmail').value = '';
            document.getElementById('adminKeyAmount').value = '';
            document.getElementById('adminBeatSelect').selectedIndex = 0;
            
            // Refresh keys list
            setTimeout(() => {
                if (typeof loadPurchaseKeys === 'function') {
                    loadPurchaseKeys();
                }
            }, 1000);
            
            showToast('Purchase key generated successfully!', 'success');
            
        } else {
            throw new Error(data.message || 'Failed to generate key');
        }
        
    } catch (error) {
        console.error('Generate key error:', error);
        const keyResult = document.getElementById('keyResult');
        if (keyResult) {
            keyResult.innerHTML = `
                <div style="text-align:center;background:var(--error-bg);padding:15px;border-radius:8px;color:var(--error);">
                    ❌ ${error.message || 'Failed to generate key'}
                </div>
            `;
        }
        showToast(error.message || 'Failed to generate key', 'error');
    }
}

// Helper function to reset generate form
function resetGenerateForm() {
    document.getElementById('adminUserEmail').value = '';
    document.getElementById('adminKeyAmount').value = '';
    document.getElementById('adminBeatSelect').selectedIndex = 0;
    const keyResult = document.getElementById('keyResult');
    if (keyResult) keyResult.innerHTML = '';
    showToast('Form reset', 'info');
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard!', 'success'))
        .catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Copied to clipboard!', 'success');
        });
}

// Share via WhatsApp
function shareKeyViaWhatsApp(key, email, beatTitle) {
    const message = `Hello! Your purchase key for "${beatTitle}" is: ${key}\n\nUse this key on Empire Beatstore to download your beat.\n\nKey: ${key}\nEmail: ${email}\nNote: Key expires in 24 hours.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}

// Enhanced showKeyResult function
function showKeyResult(element, message, type = 'info') {
    if (!element) {
        console.warn('showKeyResult: element is null');
        return;
    }
    
    const typeClass = type === 'success' ? 'success' : 
                     type === 'error' ? 'error' : 'info';
    
    element.innerHTML = `
        <div class="key-result ${typeClass}" style="padding:15px;border-radius:8px;margin:10px 0;">
            ${message}
        </div>
    `;
    
    // Auto-clear after 10 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            if (element && element.innerHTML.includes('key-result')) {
                element.innerHTML = '';
            }
        }, 10000);
    }
}

// Show key result
function showKeyResult(element, message, type = 'info') {
    if (!element) return;
    
    element.innerHTML = `
        <div class="key-result ${type}">
            ${message}
        </div>
    `;
}

// Copy key to clipboard
function copyKeyToClipboard(key) {
    navigator.clipboard.writeText(key)
        .then(() => {
            showToast('Key copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Copy failed:', err);
            showToast('Failed to copy. Please copy manually.', 'error');
        });
}

// Send key via WhatsApp
function sendKeyViaWhatsApp(key, userEmail, beatTitle) {
    const message = encodeURIComponent(
        `Hello! Your purchase key for "${beatTitle}" is: ${key}\n\n` +
        `Enter this key at Empire Beatstore to download your beat.\n` +
        `Key: ${key}\n` +
        `Email: ${userEmail}\n` +
        `Note: This key expires in 24 hours.`
    );
    
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// Make user admin
async function makeAdmin(userId) {
    if (!confirm('Are you sure you want to make this user an admin?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/make-admin`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('User promoted to admin successfully!', 'success');
            loadUsersForAdmin();
        } else {
            showToast(data.message || 'Failed to make admin', 'error');
        }
    } catch (error) {
        console.error('Make admin error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Extend key expiry
async function extendKey(keyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/purchases/${keyId}/extend`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Key extended by 24 hours', 'success');
            loadPurchaseKeys();
        } else {
            showToast(data.message || 'Failed to extend key', 'error');
        }
    } catch (error) {
        console.error('Extend key error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Cancel key
async function cancelKey(keyId) {
    if (!confirm('Are you sure you want to cancel this key? This cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/purchases/${keyId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Key cancelled successfully', 'success');
            loadPurchaseKeys();
        } else {
            showToast(data.message || 'Failed to cancel key', 'error');
        }
    } catch (error) {
        console.error('Cancel key error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// View key details
async function viewKeyDetails(keyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/purchases/${keyId}/details`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const purchase = data.purchase;
            const modal = document.getElementById('keyDetailsModal');
            const body = document.getElementById('keyDetailsBody');
            
            if (modal && body) {
                body.innerHTML = `
                    <div style="padding:20px;">
                        <h3 style="margin-bottom:20px;color:var(--text);">Purchase Key Details</h3>
                        
                        <div style="background:var(--card-bg);padding:15px;border-radius:8px;border:2px solid var(--accent1);margin-bottom:20px;text-align:center;">
                            <div style="font-family:monospace;font-size:24px;font-weight:bold;color:var(--accent1);letter-spacing:2px;margin-bottom:10px;">
                                ${purchase.purchaseKey}
                            </div>
                            <div style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;display:inline-block;background:${getStatusColor(purchase.status).bg};color:${getStatusColor(purchase.status).color};">
                                ${purchase.status.toUpperCase()}
                            </div>
                        </div>
                        
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:15px;margin-bottom:20px;">
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:6px;">
                                <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Beat</div>
                                <div style="font-weight:500;">${purchase.beat?.title || 'N/A'}</div>
                                <div style="font-size:12px;color:var(--muted);">${purchase.beat?.series || ''}</div>
                            </div>
                            
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:6px;">
                                <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">User</div>
                                <div style="font-weight:500;">${purchase.user?.name || 'N/A'}</div>
                                <div style="font-size:12px;color:var(--muted);">${purchase.user?.email || ''}</div>
                            </div>
                            
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:6px;">
                                <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">Amount</div>
                                <div style="font-weight:500;font-size:18px;">${purchase.amount} KES</div>
                            </div>
                        </div>
                        
                        <div style="background:var(--bg-secondary);padding:15px;border-radius:8px;margin-bottom:20px;">
                            <h4 style="margin-bottom:10px;font-size:16px;">Timeline</h4>
                            <div style="display:grid;gap:10px;">
                                <div style="display:flex;justify-content:space-between;font-size:14px;">
                                    <span style="color:var(--muted);">Created:</span>
                                    <span>${new Date(purchase.createdAt).toLocaleString()}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;font-size:14px;">
                                    <span style="color:var(--muted);">Expires:</span>
                                    <span>${new Date(purchase.expiresAt).toLocaleString()}</span>
                                </div>
                                ${purchase.usedAt ? `
                                    <div style="display:flex;justify-content:space-between;font-size:14px;">
                                        <span style="color:var(--muted);">Used:</span>
                                        <span>${new Date(purchase.usedAt).toLocaleString()}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div style="display:flex;gap:10px;justify-content:flex-end;">
                            <button class="btn secondary" onclick="hideModal('keyDetailsModal')">Close</button>
                            ${purchase.status === 'pending' ? `
                                <button class="btn" onclick="copyKeyToClipboard('${purchase.purchaseKey}')">Copy Key</button>
                                <button class="btn" onclick="sendKeyViaWhatsApp('${purchase.purchaseKey}', '${purchase.user?.email}', '${purchase.beat?.title}')">WhatsApp User</button>
                            ` : ''}
                        </div>
                    </div>
                `;
                
                modal.style.display = 'flex';
                modal.setAttribute('aria-hidden', 'false');
            }
        } else {
            showToast(data.message || 'Failed to load key details', 'error');
        }
    } catch (error) {
        console.error('View key details error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Get status color
function getStatusColor(status) {
    const colors = {
        pending: { bg: '#fff3cd', color: '#856404' },
        used: { bg: '#d4edda', color: '#155724' },
        expired: { bg: '#f8d7da', color: '#721c24' },
        cancelled: { bg: '#e2e3e5', color: '#383d41' }
    };
    return colors[status] || colors.pending;
}

// Use purchase key directly
async function usePurchaseKey(purchaseKey) {
    // Simulate entering key and verifying
    const modal = document.getElementById('checkoutModal');
    const body = document.getElementById('checkoutBody');
    
    if (!modal || !body) return;
    
    // Show key input step with pre-filled key
    body.innerHTML = `
        <div class="checkout-step">
            <div class="purchase-instructions" style="margin-bottom:20px;">
                <h4>Purchase Key Ready</h4>
                <p>Your purchase key has been pre-filled. Click verify to download.</p>
            </div>
            
            <div class="key-input-section">
                <label style="display:block;margin-bottom:8px;color:var(--text);font-weight:500;">
                    Purchase Key:
                </label>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
                    <input type="text" 
                           id="purchaseKeyInput" 
                           value="${purchaseKey}"
                           readonly
                           style="flex:1;padding:12px 15px;border:1px solid var(--border);border-radius:6px;background:var(--input-bg);color:var(--text);font-family:monospace;letter-spacing:1px;">
                </div>
            </div>
            
            <div id="keyVerificationStatus" style="margin-top:20px;"></div>
        </div>
    `;
    
    // Auto-verify after a short delay
    setTimeout(() => {
        verifyPurchaseKey();
    }, 500);
}

// Helper functions
function clearKeyInput() {
    const input = document.getElementById('purchaseKeyInput');
    if (input) input.value = '';
}

function getWhatsAppNumber(whatsapp) {
    // Default admin WhatsApp number (you should configure this)
    const defaultNumber = '254796392424'; // Replace with actual admin number
    
    // Clean number (remove non-digits)
    const cleanNumber = (whatsapp || defaultNumber).replace(/\D/g, '');
    
    // Ensure it starts with country code
    if (!cleanNumber.startsWith('254') && cleanNumber.length === 9) {
        return '254' + cleanNumber;
    }
    
    return cleanNumber;
}

function showStatus(element, message, type = 'info') {
    if (!element) return;
    
    element.innerHTML = `
        <div class="status-message ${type}" style="padding:12px;border-radius:6px;">
            ${message}
        </div>
    `;
}

// Delete beat (admin only)
async function deleteBeat(beatId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return;
    }
    
    if (!authToken) {
        showToast('Please login first', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/beats/${beatId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showToast('Beat deleted successfully', 'success');
            allBeats = allBeats.filter(beat => beat.id !== beatId);
            filterBeatsBySeries(currentSeries);
            populateSeriesSidebar([...new Set(allBeats.map(b => b.series))]);
        } else {
            showToast(data.message || 'Failed to delete beat', 'error');
        }
    } catch (error) {
        console.error('Delete beat error:', error);
        showToast('Network error deleting beat', 'error');
    }
}

// Play audio preview
function playAudioPreview(audioUrl, playButton) {
    const audio = new Audio(audioUrl);
    
    // Toggle play/pause
    if (playButton.classList.contains('playing')) {
        audio.pause();
        playButton.classList.remove('playing');
        playButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Play
        `;
        return;
    }
    
    // Stop any other playing audio
    document.querySelectorAll('.play-btn.playing').forEach(btn => {
        btn.click();
    });
    
    // Start playing
    playButton.classList.add('playing');
    playButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
        Pause
    `;
    
    audio.play();
    
    // Handle audio end
    audio.onended = () => {
        playButton.classList.remove('playing');
        playButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Play
        `;
    };
}

// ============================================
// ADMIN UPLOAD FUNCTIONS
// ============================================

function showAdminModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required. Please sign in as admin.', 'error');
        showAuthModal();
        return;
    }
    
    const modal = document.getElementById('adminModal');
    if (!modal) return;
    
    const adminLoginView = document.getElementById('adminLoginView');
    const adminUploader = document.getElementById('adminUploader');
    
    if (adminLoginView) adminLoginView.style.display = 'none';
    if (adminUploader) adminUploader.style.display = 'block';
    
    resetUploadFormButton();
    
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function resetUploadFormButton() {
    const submitBtn = document.querySelector('#uploadForm button[type="submit"]');
    if (submitBtn) {
        if (!submitBtn.hasAttribute('data-original-text')) {
            submitBtn.setAttribute('data-original-text', submitBtn.innerHTML);
        }
        
        const originalText = submitBtn.getAttribute('data-original-text') || 'Upload Beat';
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        const spinner = submitBtn.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const status = document.getElementById('adminLoginStatus');
    
    if (!email || !password) {
        showStatus(status, 'Please fill in all fields', 'error');
        return;
    }
    
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const originalText = adminLoginBtn.textContent;
    adminLoginBtn.textContent = 'Signing in...';
    adminLoginBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.token && data.user.role === 'admin') {
            authToken = data.token;
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            updateUIForLoggedInUser();
            
            document.getElementById('adminLoginView').style.display = 'none';
            document.getElementById('adminUploader').style.display = 'block';
            
            document.getElementById('adminEmail').value = '';
            document.getElementById('adminPassword').value = '';
            
            showToast('Admin access granted!', 'success');
            
        } else if (data.success && data.user.role !== 'admin') {
            showStatus(status, 'Access denied: Admin privileges required', 'error');
        } else {
            showStatus(status, data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showStatus(status, 'Network error. Please try again.', 'error');
    } finally {
        adminLoginBtn.textContent = originalText;
        adminLoginBtn.disabled = false;
    }
}

function adminLogout() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        hideModal('adminModal');
        
        document.getElementById('adminLoginView').style.display = 'block';
        document.getElementById('adminUploader').style.display = 'none';
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminLoginStatus').textContent = '';
    }
}

async function uploadBeat() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return;
    }
    
    const fileType = document.getElementById('fileType').value;
    const beatSeries = document.getElementById('beatSeries').value;
    const beatPrice = document.getElementById('beatPrice').value;
    const beatGenre = document.getElementById('beatGenre')?.value.trim();
    const beatFile = document.getElementById('beatFile').files[0];
    const status = document.getElementById('uploadStatus');
    
    if (!fileType || !beatSeries || !beatPrice || !beatFile) {
        showStatus(status, 'Please fill in all required fields', 'error');
        return;
    }
    
    if (parseFloat(beatPrice) <= 0) {
        showStatus(status, 'Price must be greater than 0', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#uploadForm button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = `
        <span style="display:flex;align-items:center;gap:8px">
            <svg class="loading-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Uploading...
        </span>
    `;
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('fileType', fileType);
        formData.append('series', beatSeries);
        formData.append('price', beatPrice);
        formData.append('file', beatFile);
        
        if (beatGenre) {
            formData.append('genre', beatGenre);
        }
        
        const response = await fetch(`${API_BASE_URL}/beats/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showStatus(status, 'Beat uploaded successfully!', 'success');
            showToast('Beat uploaded successfully!', 'success');
            
            resetUploadForm();
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            setTimeout(() => {
                hideModal('adminModal');
                setTimeout(() => {
                    document.getElementById('uploadStatus').textContent = '';
                }, 300);
                
                // Reload beats to show the new one
                loadBeats();
            }, 1500);
            
        } else {
            const errorMessage = data.message || `Upload failed with status: ${response.status}`;
            showStatus(status, errorMessage, 'error');
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(status, 'Network error. Please check your connection and try again.', 'error');
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function resetUploadForm() {
    const form = document.getElementById('uploadForm');
    if (form) {
        form.reset();
    }
    
    const fileTypeSelect = document.getElementById('fileType');
    const beatSeriesSelect = document.getElementById('beatSeries');
    
    if (fileTypeSelect) fileTypeSelect.selectedIndex = 0;
    if (beatSeriesSelect) beatSeriesSelect.selectedIndex = 0;
    
    const beatGenre = document.getElementById('beatGenre');
    if (beatGenre) beatGenre.value = '';
    
    const filePreview = document.getElementById('filePreview');
    if (filePreview) {
        filePreview.classList.remove('has-file');
        filePreview.innerHTML = '';
    }
    
    const fileInput = document.getElementById('beatFile');
    if (fileInput) {
        fileInput.value = '';
    }
    
    document.querySelectorAll('.form-control').forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
    });
    
    const uploadWrapper = document.querySelector('.file-upload-wrapper');
    if (uploadWrapper) {
        uploadWrapper.classList.remove('dragover');
    }
}

// ============================================
// AUTH MODAL FUNCTIONS
// ============================================

function showAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    switchAuthTab('login');
}

function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

function switchAuthTab(tabId) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tabId}Form`);
    });
    
    clearStatusMessages();
    
    if (tabId === 'login') {
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    } else if (tabId === 'register') {
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
    } else if (tabId === 'forgot') {
        document.getElementById('forgotEmail').value = '';
    } else if (tabId === 'reset') {
        document.getElementById('resetToken').value = '';
        document.getElementById('resetNewPassword').value = '';
        document.getElementById('resetConfirmPassword').value = '';
    }
}

// ============================================
// AUTH API FUNCTIONS
// ============================================

async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const status = document.getElementById('loginStatus');
    
    if (!email || !password) {
        showStatus(status, 'Please fill in all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showStatus(status, 'Please enter a valid email address', 'error');
        return;
    }
    
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Signing in...';
    loginBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            authToken = data.token;
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            
            console.log(`✅ User logged in: ${currentUser.email} (Role: ${currentUser.role})`);
            
            // Update UI with new admin status
            updateUIForLoggedInUser();
            
            // CRITICAL: Reload beats to show/hide delete buttons based on new role
            await loadBeats();
            
            showToast('Signed in successfully!', 'success');
            
            hideAuthModal();
            clearStatusMessages();
            
        } else {
            showStatus(status, data.message || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showStatus(status, 'Network error. Please check your connection and try again.', 'error');
    } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
}

async function registerUser() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const status = document.getElementById('registerStatus');
    
    if (!name || !email || !password || !confirmPassword) {
        showStatus(status, 'Please fill in all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showStatus(status, 'Please enter a valid email address', 'error');
        return;
    }
    
    if (password.length < 8) {
        showStatus(status, 'Password must be at least 8 characters long', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showStatus(status, 'Passwords do not match', 'error');
        return;
    }
    
    const registerBtn = document.getElementById('registerBtn');
    const originalText = registerBtn.textContent;
    registerBtn.textContent = 'Creating account...';
    registerBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(status, 'Registration successful! You can now sign in.', 'success');
            
            document.getElementById('registerName').value = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerConfirmPassword').value = '';
            
            setTimeout(() => {
                switchAuthTab('login');
                showToast('Account created successfully!', 'success');
            }, 1500);
            
        } else {
            if (data.errors) {
                const errorMessages = data.errors.map(err => err.message).join(', ');
                showStatus(status, errorMessages, 'error');
            } else {
                showStatus(status, data.message || 'Registration failed. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Register error:', error);
        showStatus(status, 'Network error. Please check your connection and try again.', 'error');
    } finally {
        registerBtn.textContent = originalText;
        registerBtn.disabled = false;
    }
}

async function forgotPassword() {
    const email = document.getElementById('forgotEmail').value.trim();
    const status = document.getElementById('forgotStatus');
    const tokenInfo = document.getElementById('tokenInfo');
    
    if (!email) {
        showStatus(status, 'Please enter your email address', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showStatus(status, 'Please enter a valid email address', 'error');
        return;
    }
    
    const forgotBtn = document.getElementById('forgotBtn');
    const originalText = forgotBtn.textContent;
    forgotBtn.textContent = 'Sending...';
    forgotBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(status, data.message || 'If an account exists, reset instructions have been sent.', 'success');
            
            if (data.resetToken) {
                document.getElementById('resetTokenDisplay').textContent = data.resetToken;
                if (tokenInfo) tokenInfo.style.display = 'block';
                
                document.getElementById('resetToken').value = data.resetToken;
                
                setTimeout(() => switchAuthTab('reset'), 2000);
            }
        } else {
            showStatus(status, data.message || 'Failed to process reset request', 'error');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showStatus(status, 'Network error. Please try again.', 'error');
    } finally {
        forgotBtn.textContent = originalText;
        forgotBtn.disabled = false;
    }
}

async function resetPassword() {
    const token = document.getElementById('resetToken').value.trim();
    const newPassword = document.getElementById('resetNewPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;
    const status = document.getElementById('resetStatus');
    
    if (!token || !newPassword || !confirmPassword) {
        showStatus(status, 'Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showStatus(status, 'Password must be at least 8 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showStatus(status, 'Passwords do not match', 'error');
        return;
    }
    
    const resetBtn = document.getElementById('resetBtn');
    const originalText = resetBtn.textContent;
    resetBtn.textContent = 'Resetting...';
    resetBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password/${token}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ password: newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(status, 'Password reset successful! You can now sign in with your new password.', 'success');
            
            document.getElementById('resetToken').value = '';
            document.getElementById('resetNewPassword').value = '';
            document.getElementById('resetConfirmPassword').value = '';
            const tokenInfo = document.getElementById('tokenInfo');
            if (tokenInfo) tokenInfo.style.display = 'none';
            
            setTimeout(() => {
                switchAuthTab('login');
                showToast('Password reset successfully!', 'success');
            }, 1500);
            
        } else {
            showStatus(status, data.message || 'Password reset failed. Please check your token and try again.', 'error');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showStatus(status, 'Network error. Please try again.', 'error');
    } finally {
        resetBtn.textContent = originalText;
        resetBtn.disabled = false;
    }
}

async function updateProfile() {
    if (!currentUser || !authToken) {
        showToast('Please sign in first', 'error');
        return;
    }
    
    const name = document.getElementById('profileName').value.trim();
    const bio = document.getElementById('profileBio').value.trim();
    const profilePicture = document.getElementById('profilePicture').value.trim();
    const status = document.getElementById('profileStatus');
    
    if (!name) {
        showStatus(status, 'Name is required', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('saveProfileBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, bio, profilePicture })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            updateUIForLoggedInUser();
            
            showStatus(status, 'Profile updated successfully!', 'success');
            showToast('Profile updated!', 'success');
            
            setTimeout(() => {
                hideModal('profileModal');
                clearStatusMessages();
            }, 1500);
            
        } else {
            showStatus(status, data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Update profile error:', error);
        showStatus(status, 'Network error. Please try again.', 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

async function changePassword() {
    if (!currentUser || !authToken) {
        showToast('Please sign in first', 'error');
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    const status = document.getElementById('passwordStatus');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showStatus(status, 'Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showStatus(status, 'New password must be at least 8 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showStatus(status, 'New passwords do not match', 'error');
        return;
    }
    
    const saveBtn = document.getElementById('savePasswordBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Changing...';
    saveBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(status, 'Password changed successfully!', 'success');
            
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
            
            setTimeout(() => {
                hideModal('changePasswordModal');
                showToast('Password changed successfully!', 'success');
            }, 1500);
            
        } else {
            showStatus(status, data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Change password error:', error);
        showStatus(status, 'Network error. Please try again.', 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

async function logout() {
    console.log('👋 Logging out user');
    
    try {
        if (authToken) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        authToken = null;
        currentUser = null;
        
        updateUIForLoggedOutUser();
        
        // Refresh beats to remove delete buttons
        refreshBeatCards();
        
        showToast('Signed out successfully', 'success');
        
        closeAllModals();
    }
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

function openProfileModal() {
    if (!currentUser) {
        showToast('Please sign in first', 'error');
        return;
    }
    
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileBio').value = currentUser.bio || '';
    document.getElementById('profilePicture').value = currentUser.profilePicture || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileRole').value = currentUser.role || 'user';
    
    if (currentUser.role === 'admin') {
        const roleField = document.getElementById('profileRole');
        if (roleField) {
            roleField.style.color = '#dc3545';
            roleField.style.fontWeight = 'bold';
        }
    }
    
    showModal('profileModal');
}

function openChangePasswordModal() {
    if (!currentUser) {
        showToast('Please sign in first', 'error');
        return;
    }
    
    showModal('changePasswordModal');
}

function openAdminUsersModal() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Admin access required', 'error');
        return;
    }
    
    showModal('adminUsersModal');
}

function copyResetToken() {
    const tokenDisplay = document.getElementById('resetTokenDisplay');
    if (!tokenDisplay) return;
    
    const token = tokenDisplay.textContent;
    navigator.clipboard.writeText(token)
        .then(() => showToast('Token copied to clipboard!', 'success'))
        .catch(err => console.error('Copy failed:', err));
}

function clearStatusMessages() {
    document.querySelectorAll('.status-message').forEach(el => {
        el.textContent = '';
        el.className = 'status-message';
    });
}

function showStatus(element, message, type = 'info') {
    if (!element) return;
    
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';
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
        clearStatusMessages();
        
        if (modalId === 'adminModal') {
            resetUploadFormButton();
        }
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    });
    clearStatusMessages();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function setCurrentYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// ============================================
// FILE UPLOAD PREVIEW
// ============================================

function setupFileUploadPreview() {
    const fileInput = document.getElementById('beatFile');
    const filePreview = document.getElementById('filePreview');
    
    if (fileInput && filePreview) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            updateFilePreview(file);
        });
        
        const uploadWrapper = fileInput.closest('.file-upload-wrapper');
        if (uploadWrapper) {
            uploadWrapper.addEventListener('dragover', function(e) {
                e.preventDefault();
                uploadWrapper.classList.add('dragover');
            });
            
            uploadWrapper.addEventListener('dragleave', function(e) {
                e.preventDefault();
                uploadWrapper.classList.remove('dragover');
            });
            
            uploadWrapper.addEventListener('drop', function(e) {
                e.preventDefault();
                uploadWrapper.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    updateFilePreview(files[0]);
                }
            });
        }
    }
    
    function updateFilePreview(file) {
        const preview = document.getElementById('filePreview');
        if (!file || !preview) return;
        
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toUpperCase();
        
        preview.innerHTML = `
            <div class="file-preview-content">
                <div class="file-preview-icon">
                    ${fileExtension === 'STY' ? '🎹' : '🎵'}
                </div>
                <div class="file-preview-info">
                    <div class="file-preview-name">${fileName}</div>
                    <div class="file-preview-size">${fileSize} MB • ${fileExtension} file</div>
                </div>
                <button type="button" class="file-preview-remove" title="Remove file">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        
        preview.classList.add('has-file');
        
        const removeBtn = preview.querySelector('.file-preview-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const fileInput = document.getElementById('beatFile');
                if (fileInput) {
                    fileInput.value = '';
                }
                
                preview.classList.remove('has-file');
                preview.innerHTML = '';
            });
        }
    }
}

// ============================================
// GLOBAL EVENT LISTENERS
// ============================================

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const userDropdown = document.getElementById('userDropdown');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (userDropdown && userDropdownMenu && 
        !e.target.closest('#userDropdown') && 
        userDropdownMenu.style.display === 'block') {
        userDropdownMenu.style.display = 'none';
    }
    
    // Close explore dropdown when clicking outside
    const exploreBtn = document.getElementById('exploreBtn');
    const exploreDropdown = document.getElementById('exploreDropdown');
    if (exploreBtn && exploreDropdown && exploreDropdown.style.display === 'block' &&
        !exploreBtn.contains(e.target) && !exploreDropdown.contains(e.target)) {
        exploreDropdown.style.display = 'none';
    }
});

// Close modals on backdrop click and escape key
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-backdrop')) {
        hideModal(e.target.id);
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// Initialize auth tab switching
document.addEventListener('DOMContentLoaded', function() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchAuthTab(tabId);
        });
    });
    
    // Switch to forgot password
    const forgotLink = document.querySelector('[data-switch-to="forgot"]');
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            switchAuthTab('forgot');
        });
    }
    
    // Copy token button
    const copyTokenBtn = document.getElementById('copyTokenBtn');
    if (copyTokenBtn) {
        copyTokenBtn.addEventListener('click', copyResetToken);
    }
    
    // Auth form buttons
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', loginUser);
    
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', registerUser);
    
    const forgotBtn = document.getElementById('forgotBtn');
    if (forgotBtn) forgotBtn.addEventListener('click', forgotPassword);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetPassword);
    
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', updateProfile);
    
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    if (savePasswordBtn) savePasswordBtn.addEventListener('click', changePassword);
    
    // Modal close buttons
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const modal = e.target.closest('.modal-backdrop');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
    
    // Enter key support for auth forms
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const activeModal = document.querySelector('.modal-backdrop[style*="display: flex"]');
            if (!activeModal) return;
            
            const activeForm = activeModal.querySelector('.auth-form.active');
            if (!activeForm) return;
            
            e.preventDefault();
            
            if (activeForm.id === 'loginForm') {
                loginUser();
            } else if (activeForm.id === 'registerForm') {
                registerUser();
            } else if (activeForm.id === 'forgotForm') {
                forgotPassword();
            } else if (activeForm.id === 'resetForm') {
                resetPassword();
            }
        }
    });
});

// ============================================
// LOADING SPINNER CSS
// ============================================

const loadingSpinnerCSS = `
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.loading-spinner {
    animation: spin 1s linear infinite;
}
`;

// Inject the CSS
const style = document.createElement('style');
style.textContent = loadingSpinnerCSS;
document.head.appendChild(style);

console.log('✅ EMPIRE BEATSTORE script loaded successfully!');


// ============================================
// ADMIN PANEL BUTTON SETUP
// ============================================

// Initialize admin panel button
function initAdminPanelButton() {
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
    if (!adminPanelBtn) {
        console.log('❌ Admin panel button not found in HTML');
        return;
    }
    
    // Add click event listener
    adminPanelBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎛️ Admin panel button clicked');
        
        // Check if user is admin
        if (!currentUser || currentUser.role !== 'admin') {
            showToast('Admin access required. Please sign in as admin.', 'error');
            
            // Show admin login modal instead
            const adminModal = document.getElementById('adminModal');
            if (adminModal) {
                adminModal.style.display = 'flex';
                adminModal.setAttribute('aria-hidden', 'false');
                
                // Show login view
                const adminLoginView = document.getElementById('adminLoginView');
                const adminUploader = document.getElementById('adminUploader');
                if (adminLoginView) adminLoginView.style.display = 'block';
                if (adminUploader) adminUploader.style.display = 'none';
            }
            return;
        }
        
        // Show admin panel
        showAdminPanel();
    });
    
    console.log('✅ Admin panel button initialized');
}

// Show admin panel
function showAdminPanel() {
    console.log('🎛️ Showing admin panel...');
    
    const modal = document.getElementById('adminPanelModal');
    if (!modal) {
        console.log('❌ Admin panel modal not found');
        showToast('Admin panel not available', 'error');
        return;
    }
    
    // Load data for admin panel
    loadAdminPanelData();
    
    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Setup tab switching
    setupAdminTabs();
    
    // Start with first tab
    switchAdminTab('generate');
    
    console.log('✅ Admin panel displayed');
}

// Load admin stats
async function loadAdminStats() {
    try {
        console.log('📊 Loading admin stats...');
        
        const response = await fetch(`${API_BASE_URL}/purchases/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update stats cards
            const totalKeysEl = document.getElementById('totalKeys');
            const pendingKeysEl = document.getElementById('pendingKeys');
            const usedKeysEl = document.getElementById('usedKeys');
            const expiredKeysEl = document.getElementById('expiredKeys');
            
            if (totalKeysEl) totalKeysEl.textContent = data.stats.totalKeys || 0;
            if (pendingKeysEl) pendingKeysEl.textContent = data.stats.pendingKeys || 0;
            if (usedKeysEl) usedKeysEl.textContent = data.stats.usedKeys || 0;
            if (expiredKeysEl) expiredKeysEl.textContent = data.stats.expiredKeys || 0;
            
            // Load recent purchases
            await loadRecentPurchases();
            
            console.log('✅ Admin stats loaded');
        } else {
            console.error('Stats error:', data.message);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent purchases for stats tab
async function loadRecentPurchases() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchases/recent`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('recentPurchases');
            if (!container) return;
            
            if (!data.purchases || data.purchases.length === 0) {
                container.innerHTML = '<p style="color:var(--muted);text-align:center;">No recent purchases</p>';
                return;
            }
            
            container.innerHTML = data.purchases.map(purchase => `
                <div style="padding:10px 0;border-bottom:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <strong>${purchase.beat?.title || 'Unknown Beat'}</strong><br>
                            <small style="color:var(--muted);">${purchase.user?.name || 'Unknown User'}</small>
                        </div>
                        <div style="text-align:right;">
                            <div>${purchase.amount || 0} KES</div>
                            <small style="color:var(--muted);">
                                ${new Date(purchase.usedAt || purchase.createdAt).toLocaleDateString()}
                            </small>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recent purchases:', error);
    }
}

// Load data for admin panel
// Load data for admin panel
async function loadAdminPanelData() {
    console.log('📡 Loading admin panel data...');
    
    try {
        // Load beats for dropdown
        await loadBeatsForAdmin();
        
        // Load users
        await loadUsersForAdmin();
        
        // Load purchase keys
        await loadPurchaseKeys();
        
        // Load stats (handle error if function doesn't exist)
        try {
            if (typeof loadAdminStats === 'function') {
                await loadAdminStats();
            } else {
                console.log('⚠️ loadAdminStats function not found, skipping...');
            }
        } catch (statsError) {
            console.error('Error loading stats:', statsError);
        }
        
        console.log('✅ Admin panel data loaded');
    } catch (error) {
        console.error('Error loading admin panel data:', error);
        showToast('Error loading admin data', 'error');
    }
}

// Setup admin tabs
function setupAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    
    if (!tabs.length) {
        console.log('❌ No admin tabs found');
        return;
    }
    
    tabs.forEach(tab => {
        // Remove existing listeners to prevent duplicates
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
        
        newTab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            console.log(`📑 Switching to admin tab: ${tabId}`);
            switchAdminTab(tabId);
        });
    });
    
    console.log('✅ Admin tabs initialized');
}

// Switch admin tab
function switchAdminTab(tabId) {
    // Update active tab
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    // Show active pane
    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId + 'Tab');
    });
    
    // Load specific data for tab if needed
    switch(tabId) {
        case 'keys':
            console.log('🔑 Loading purchase keys...');
            loadPurchaseKeys();
            break;
        case 'stats':
            console.log('📊 Loading stats...');
            loadAdminStats();
            break;
        case 'users':
            console.log('👥 Loading users...');
            loadUsersForAdmin();
            break;
    }
}

// Update admin panel button visibility
function updateAdminPanelButton() {
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
    if (!adminPanelBtn) {
        console.log('❌ Admin panel button not found for update');
        return;
    }
    
    const shouldShow = currentUser && currentUser.role === 'admin';
    
    console.log(`🔄 Updating admin panel button: ${shouldShow ? 'Show' : 'Hide'} (User role: ${currentUser?.role || 'none'})`);
    
    if (shouldShow) {
        adminPanelBtn.style.display = 'inline-flex';
        adminPanelBtn.style.alignItems = 'center';
        adminPanelBtn.style.gap = '6px';
    } else {
        adminPanelBtn.style.display = 'none';
    }
}

// Close admin panel
function closeAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        // Clear any status messages
        const keyResult = document.getElementById('keyResult');
        if (keyResult) keyResult.innerHTML = '';
        
        console.log('✅ Admin panel closed');
    }
}

// ============================================
// ADMIN PANEL DATA FUNCTIONS
// ============================================

// Load beats for admin dropdown
async function loadBeatsForAdmin() {
    try {
        console.log('📡 Loading beats for admin dropdown...');
        
        const response = await fetch(`${API_BASE_URL}/beats`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('adminBeatSelect');
            if (!select) return;
            
            // Clear existing options except first
            select.innerHTML = '<option value="">-- Select a beat --</option>';
            
            data.beats.forEach(beat => {
                const option = document.createElement('option');
                option.value = beat.id;
                option.textContent = `${beat.title} (${beat.series}) - ${beat.price} KES`;
                select.appendChild(option);
            });
            
            console.log(`✅ Loaded ${data.beats.length} beats for admin`);
        }
    } catch (error) {
        console.error('Error loading beats for admin:', error);
    }
}

// Load users for admin
async function loadUsersForAdmin() {
    try {
        console.log('📡 Loading users for admin...');
        
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.allUsers = data.users || [];
            const select = document.getElementById('adminUserSelect');
            const usersList = document.getElementById('usersList');
            
            // Update dropdown
            if (select) {
                select.innerHTML = '<option value="">-- Select a user --</option>';
                data.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user._id;
                    option.textContent = `${user.name} (${user.email}) - ${user.role}`;
                    select.appendChild(option);
                });
            }
            
            // Update users list
            if (usersList) {
                displayUsers(data.users);
            }
            
            console.log(`✅ Loaded ${data.users.length} users for admin`);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
    }
}

// Display users in admin panel
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    if (!users || users.length === 0) {
        usersList.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--muted);">
                No users found
            </div>
        `;
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="user-card" style="padding:15px;border-bottom:1px solid var(--border);transition:background 0.2s;">
            <div class="user-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                    <strong>${user.name}</strong>
                    <span class="user-role ${user.role}" style="padding:2px 8px;border-radius:12px;font-size:12px;font-weight:500;margin-left:8px;background:${user.role === 'admin' ? '#ffebee' : '#e3f2fd'};color:${user.role === 'admin' ? '#c62828' : '#1565c0'};">${user.role}</span>
                </div>
                <div style="font-size:14px;color:var(--muted);">
                    Joined: ${new Date(user.createdAt).toLocaleDateString()}
                </div>
            </div>
            
            <div class="user-details" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;font-size:14px;color:var(--muted);">
                <div>
                    <strong>Email:</strong> ${user.email}
                </div>
                <div>
                    <strong>Purchases:</strong> ${user.purchaseCount || 0}
                </div>
                ${user.phone ? `
                    <div>
                        <strong>Phone:</strong> ${user.phone}
                    </div>
                ` : ''}
                ${user.whatsapp ? `
                    <div>
                        <strong>WhatsApp:</strong> ${user.whatsapp}
                    </div>
                ` : ''}
            </div>
            
            <div class="user-actions" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                <button class="btn small secondary" onclick="generateKeyForUser('${user._id}', '${user.email}')" style="padding:4px 10px;font-size:12px;">
                    Generate Key
                </button>
                ${user.role === 'user' ? `
                    <button class="btn small secondary" onclick="makeAdmin('${user._id}')" style="padding:4px 10px;font-size:12px;">
                        Make Admin
                    </button>
                ` : ''}
                <a href="https://wa.me/${getWhatsAppNumber(user.whatsapp)}?text=${encodeURIComponent(`Hello ${user.name}! This is from Empire Beatstore.`)}" 
                   target="_blank" 
                   class="btn small" 
                   style="background:#25D366;color:white;padding:4px 10px;font-size:12px;text-decoration:none;">
                    WhatsApp
                </a>
            </div>
        </div>
    `).join('');
}

// Quick generate for user
function generateKeyForUser(userId, userEmail) {
    console.log(`🔑 Quick generate for user: ${userEmail}`);
    
    // Switch to generate tab
    switchAdminTab('generate');
    
    // Pre-fill user email
    const emailInput = document.getElementById('adminUserEmail');
    if (emailInput) {
        emailInput.value = userEmail;
    }
    
    // Select user in dropdown if available
    const userSelect = document.getElementById('adminUserSelect');
    if (userSelect) {
        userSelect.value = userId;
    }
    
    // Focus on beat select
    setTimeout(() => {
        const beatSelect = document.getElementById('adminBeatSelect');
        if (beatSelect) beatSelect.focus();
    }, 100);
    
    showToast(`Prefilled for ${userEmail}. Now select a beat.`, 'info');
}

// Load purchase keys for admin
// Load purchase keys for admin
async function loadPurchaseKeys() {
    try {
        console.log('📡 Loading purchase keys...');
        
        const response = await fetch(`${API_BASE_URL}/purchases/admin/purchase-keys`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        // Check if route exists
        if (response.status === 404) {
            console.error('❌ Purchase keys route not found (404)');
            showToast('Admin route not configured. Check backend.', 'error');
            
            const keysList = document.getElementById('keysList');
            if (keysList) {
                keysList.innerHTML = `
                    <div style="text-align:center;padding:40px 20px;color:var(--muted);">
                        <p>⚠️ Route not configured</p>
                        <p style="font-size:12px;">Make sure backend has /api/purchases/admin/purchase-keys route</p>
                    </div>
                `;
            }
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            window.allPurchaseKeys = data.purchases || [];
            displayKeys(allPurchaseKeys);
            updatePagination();
            console.log(`✅ Loaded ${allPurchaseKeys.length} purchase keys`);
        } else {
            showToast(data.message || 'Error loading keys', 'error');
        }
    } catch (error) {
        console.error('Error loading purchase keys:', error);
        
        const keysList = document.getElementById('keysList');
        if (keysList) {
            keysList.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:var(--muted);">
                    <p>❌ Error loading purchase keys</p>
                    <p style="font-size:12px;">${error.message}</p>
                    <button class="btn small secondary" onclick="loadPurchaseKeys()" style="margin-top:10px;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// Display keys in admin panel
function displayKeys(keys) {
    const keysList = document.getElementById('keysList');
    if (!keysList) return;
    
    if (!keys || keys.length === 0) {
        keysList.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--muted);">
                No purchase keys found
            </div>
        `;
        return;
    }
    
    // Paginate
    const start = (window.currentPage || 1) - 1 * 10;
    const end = start + 10;
    const paginatedKeys = keys.slice(start, end);
    
    keysList.innerHTML = paginatedKeys.map(purchase => {
        const statusColors = {
            pending: { bg: '#fff3cd', color: '#856404' },
            used: { bg: '#d4edda', color: '#155724' },
            expired: { bg: '#f8d7da', color: '#721c24' },
            cancelled: { bg: '#e2e3e5', color: '#383d41' }
        };
        
        const statusStyle = statusColors[purchase.status] || statusColors.pending;
        
        return `
            <div class="key-card" style="padding:15px;border-bottom:1px solid var(--border);transition:background 0.2s;">
                <div class="key-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div class="key-code" style="font-family:monospace;font-size:16px;font-weight:bold;color:var(--accent1);background:var(--card-bg);padding:4px 8px;border-radius:4px;letter-spacing:1px;">
                        ${purchase.purchaseKey}
                    </div>
                    <span class="key-status" style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;background:${statusStyle.bg};color:${statusStyle.color};">
                        ${purchase.status}
                    </span>
                </div>
                
                <div class="key-details" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;font-size:14px;color:var(--muted);">
                    <div>
                        <strong>Beat:</strong> ${purchase.beat?.title || 'N/A'}
                    </div>
                    <div>
                        <strong>User:</strong> ${purchase.user?.name || 'N/A'} (${purchase.user?.email || 'N/A'})
                    </div>
                    <div>
                        <strong>Amount:</strong> ${purchase.amount} KES
                    </div>
                    <div>
                        <strong>Created:</strong> ${new Date(purchase.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                        <strong>Expires:</strong> ${new Date(purchase.expiresAt).toLocaleDateString()}
                    </div>
                    ${purchase.usedAt ? `
                        <div>
                            <strong>Used:</strong> ${new Date(purchase.usedAt).toLocaleDateString()}
                        </div>
                    ` : ''}
                </div>
                
                <div class="key-actions" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                    <button class="btn small secondary" onclick="copyKey('${purchase.purchaseKey}')" style="padding:4px 10px;font-size:12px;">
                        Copy Key
                    </button>
                    
                    <a href="https://wa.me/${getWhatsAppNumber(purchase.user?.whatsapp)}?text=${encodeURIComponent(`Hello ${purchase.user?.name}! Your purchase key for "${purchase.beat?.title}" is: ${purchase.purchaseKey}. Enter this key on the website to download.`)}" 
                       target="_blank" 
                       class="btn small" 
                       style="background:#25D366;color:white;padding:4px 10px;font-size:12px;text-decoration:none;">
                        WhatsApp User
                    </a>
                    
                    ${purchase.status === 'pending' ? `
                        <button class="btn small secondary" onclick="extendKey('${purchase._id}')" style="padding:4px 10px;font-size:12px;">
                            Extend 24h
                        </button>
                        <button class="btn small secondary" onclick="cancelKey('${purchase._id}')" style="padding:4px 10px;font-size:12px;">
                            Cancel
                        </button>
                    ` : ''}
                    
                    <button class="btn small secondary" onclick="viewKeyDetails('${purchase._id}')" style="padding:4px 10px;font-size:12px;">
                        Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update pagination
function updatePagination() {
    const totalKeys = window.allPurchaseKeys?.length || 0;
    const totalPages = Math.ceil(totalKeys / 10);
    const pagination = document.getElementById('keysPagination');
    
    if (!pagination || totalPages <= 1) {
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    const currentPage = window.currentPage || 1;
    
    // Previous button
    html += `
        <button class="page-btn" onclick="changeKeysPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} style="padding:8px 12px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);border-radius:4px;cursor:pointer;">
            ←
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `
                <button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changeKeysPage(${i})" style="padding:8px 12px;border:1px solid var(--border);background:${currentPage === i ? 'var(--accent1)' : 'var(--card-bg)'};color:${currentPage === i ? 'white' : 'var(--text)'};border-radius:4px;cursor:pointer;border-color:${currentPage === i ? 'var(--accent1)' : 'var(--border)'};">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span style="padding:8px 12px;color:var(--muted);">...</span>`;
        }
    }
    
    // Next button
    html += `
        <button class="page-btn" onclick="changeKeysPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} style="padding:8px 12px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);border-radius:4px;cursor:pointer;">
            →
        </button>
    `;
    
    pagination.innerHTML = html;
}

// Change keys page
function changeKeysPage(page) {
    const totalPages = Math.ceil((window.allPurchaseKeys?.length || 0) / 10);
    if (page < 1 || page > totalPages) return;
    
    window.currentPage = page;
    displayKeys(window.allPurchaseKeys);
    updatePagination();
    
    // Scroll to top of list
    const keysList = document.getElementById('keysList');
    if (keysList) keysList.scrollTop = 0;
}

// Filter keys
function filterKeys() {
    const search = document.getElementById('searchKeys')?.value.toLowerCase() || '';
    const status = document.getElementById('keyStatusFilter')?.value || '';
    
    const filtered = (window.allPurchaseKeys || []).filter(purchase => {
        const matchesSearch = purchase.purchaseKey?.toLowerCase().includes(search) ||
                             purchase.beat?.title?.toLowerCase().includes(search) ||
                             purchase.user?.name?.toLowerCase().includes(search) ||
                             purchase.user?.email?.toLowerCase().includes(search);
        const matchesStatus = !status || purchase.status === status;
        return matchesSearch && matchesStatus;
    });
    
    window.currentPage = 1;
    displayKeys(filtered);
    updatePagination(filtered.length);
}

// Refresh keys
function refreshKeys() {
    loadPurchaseKeys();
    showToast('Purchase keys refreshed', 'info');
}

// Copy key to clipboard
function copyKey(key) {
    navigator.clipboard.writeText(key)
        .then(() => showToast('Key copied to clipboard!', 'success'))
        .catch(err => {
            console.error('Copy failed:', err);
            showToast('Failed to copy. Please copy manually.', 'error');
        });
}

// ============================================
// INITIALIZATION
// ============================================

// Add to your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 EMPIRE BEATSTORE - Initializing...');
    
    // Initialize admin panel button
    initAdminPanelButton();
    
    // Check auth status (this will update button visibility)
    checkAuthStatus();
    setupEventListeners();
    setCurrentYear();
    
    // Set current year in footer
    document.getElementById('year').textContent = new Date().getFullYear();
});


// ============================================
// ADMIN PANEL TAB MANAGEMENT - FIXED
// ============================================

// Initialize admin panel on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 EMPIRE BEATSTORE - Initializing Admin Panel...');
    
    // Initialize admin panel button
    initAdminPanelButton();
    
    // Setup admin panel event listeners
    setupAdminPanelListeners();
});

// Initialize admin panel button
function initAdminPanelButton() {
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
    if (!adminPanelBtn) {
        console.log('❌ Admin panel button not found in HTML');
        return;
    }
    
    // Remove any existing event listeners
    const newBtn = adminPanelBtn.cloneNode(true);
    adminPanelBtn.parentNode.replaceChild(newBtn, adminPanelBtn);
    
    // Add click event listener to the new button
    newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🎛️ Admin panel button clicked');
        
        // Check if user is admin
        if (!currentUser || currentUser.role !== 'admin') {
            showToast('Admin access required. Please sign in as admin.', 'error');
            
            // Show admin login modal
            const adminModal = document.getElementById('adminModal');
            if (adminModal) {
                adminModal.style.display = 'flex';
                adminModal.setAttribute('aria-hidden', 'false');
                
                const adminLoginView = document.getElementById('adminLoginView');
                const adminUploader = document.getElementById('adminUploader');
                if (adminLoginView) adminLoginView.style.display = 'block';
                if (adminUploader) adminUploader.style.display = 'none';
            }
            return;
        }
        
        // Show admin panel
        showAdminPanel();
    });
    
    console.log('✅ Admin panel button initialized');
}

// Setup admin panel event listeners
function setupAdminPanelListeners() {
    // Close admin panel on backdrop click
    document.addEventListener('click', function(e) {
        if (e.target.id === 'adminPanelModal') {
            closeAdminPanel();
        }
    });
    
    // Close admin panel on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const adminPanelModal = document.getElementById('adminPanelModal');
            if (adminPanelModal && adminPanelModal.style.display === 'flex') {
                closeAdminPanel();
            }
        }
    });
    
    // Close admin panel when close button is clicked
    document.addEventListener('click', function(e) {
        if (e.target.closest('.modal-close') && e.target.closest('#adminPanelModal')) {
            closeAdminPanel();
        }
    });
}

// Show admin panel
function showAdminPanel() {
    console.log('🎛️ Showing admin panel...');
    
    const modal = document.getElementById('adminPanelModal');
    if (!modal) {
        console.log('❌ Admin panel modal not found');
        showToast('Admin panel not available', 'error');
        return;
    }
    
    // Show modal first
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Load data for admin panel
    loadAdminPanelData();
    
    // Setup tab switching with a small delay to ensure DOM is ready
    setTimeout(() => {
        setupAdminTabs();
        // Start with first tab
        switchAdminTab('generate');
    }, 100);
    
    console.log('✅ Admin panel displayed');
}

// Setup admin tabs - COMPLETELY REFACTORED
function setupAdminTabs() {
    console.log('🔧 Setting up admin tabs...');
    
    const tabs = document.querySelectorAll('.admin-tab');
    const tabPanes = document.querySelectorAll('.admin-tab-pane');
    
    if (!tabs.length || !tabPanes.length) {
        console.log('❌ No admin tabs or panes found');
        return;
    }
    
    console.log(`Found ${tabs.length} tabs and ${tabPanes.length} panes`);
    
    // Remove all existing click event listeners
    tabs.forEach(tab => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
    });
    
    // Get fresh references after cloning
    const freshTabs = document.querySelectorAll('.admin-tab');
    
    // Add click event listeners to tabs
    freshTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabId = this.getAttribute('data-tab');
            if (tabId) {
                console.log(`📑 Switching to admin tab: ${tabId}`);
                switchAdminTab(tabId);
            } else {
                console.warn('Tab has no data-tab attribute:', this);
            }
        });
    });
    
    console.log('✅ Admin tabs initialized');
}

// Switch admin tab - COMPLETELY REFACTORED
function switchAdminTab(tabId) {
    console.log(`🔄 Switching to tab: ${tabId}`);
    
    // Update active tab
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        const tabData = tab.getAttribute('data-tab');
        if (tabData === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Show active pane
    const tabPanes = document.querySelectorAll('.admin-tab-pane');
    let foundActive = false;
    
    tabPanes.forEach(pane => {
        if (pane.id === tabId + 'Tab') {
            pane.classList.add('active');
            pane.style.display = 'flex';
            foundActive = true;
            console.log(`✅ Showing pane: ${pane.id}`);
        } else {
            pane.classList.remove('active');
            pane.style.display = 'none';
        }
    });
    
    // If no pane found, show generate tab by default
    if (!foundActive) {
        console.warn(`Tab pane ${tabId}Tab not found, defaulting to generate`);
        switchAdminTab('generate');
        return;
    }
    
    // Load specific data for tab
    switch(tabId) {
        case 'keys':
            console.log('🔑 Loading purchase keys...');
            loadPurchaseKeys();
            break;
        case 'stats':
            console.log('📊 Loading stats...');
            loadAdminStats();
            break;
        case 'users':
            console.log('👥 Loading users...');
            loadUsersForAdmin();
            break;
        case 'generate':
            console.log('🔑 Loading beats for generation...');
            loadBeatsForAdmin();
            break;
    }
    
    console.log(`✅ Tab switched to: ${tabId}`);
}

// Close admin panel
function closeAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = 'auto';
        
        // Clear any status messages
        const keyResult = document.getElementById('keyResult');
        if (keyResult) keyResult.innerHTML = '';
        
        console.log('✅ Admin panel closed');
    }
}

// ============================================
// ADMIN PANEL DATA FUNCTIONS
// ============================================

// Load admin panel data
async function loadAdminPanelData() {
    console.log('📡 Loading admin panel data...');
    
    try {
        // Load beats for dropdown
        await loadBeatsForAdmin();
        
        // Load users
        await loadUsersForAdmin();
        
        // Load purchase keys
        await loadPurchaseKeys();
        
        // Load stats
        await loadAdminStats();
        
        console.log('✅ Admin panel data loaded');
    } catch (error) {
        console.error('Error loading admin panel data:', error);
        showToast('Error loading admin data', 'error');
    }
}

// Load beats for admin dropdown
async function loadBeatsForAdmin() {
    try {
        console.log('📡 Loading beats for admin dropdown...');
        
        const response = await fetch(`${API_BASE_URL}/beats`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('adminBeatSelect');
            if (!select) return;
            
            // Clear existing options except first
            select.innerHTML = '<option value="">-- Select a beat --</option>';
            
            data.beats.forEach(beat => {
                const option = document.createElement('option');
                option.value = beat.id;
                option.textContent = `${beat.title} (${beat.series}) - ${beat.price} KES`;
                select.appendChild(option);
            });
            
            console.log(`✅ Loaded ${data.beats.length} beats for admin`);
        }
    } catch (error) {
        console.error('Error loading beats for admin:', error);
    }
}

// Load users for admin
async function loadUsersForAdmin() {
    try {
        console.log('📡 Loading users for admin...');
        
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.allUsers = data.users || [];
            const usersList = document.getElementById('usersList');
            
            // Update users list
            if (usersList) {
                displayUsers(data.users);
            }
            
            console.log(`✅ Loaded ${data.users.length} users for admin`);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users', 'error');
    }
}

// Display users in admin panel
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    if (!users || users.length === 0) {
        usersList.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--muted);">
                No users found
            </div>
        `;
        return;
    }
    
    usersList.innerHTML = users.map(user => `
        <div class="user-card" style="padding:15px;border-bottom:1px solid var(--border);transition:background 0.2s;">
            <div class="user-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                    <strong>${user.name}</strong>
                    <span class="user-role ${user.role}" style="padding:2px 8px;border-radius:12px;font-size:12px;font-weight:500;margin-left:8px;background:${user.role === 'admin' ? '#ffebee' : '#e3f2fd'};color:${user.role === 'admin' ? '#c62828' : '#1565c0'};">${user.role}</span>
                </div>
                <div style="font-size:14px;color:var(--muted);">
                    Joined: ${new Date(user.createdAt).toLocaleDateString()}
                </div>
            </div>
            
            <div class="user-details" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;font-size:14px;color:var(--muted);">
                <div>
                    <strong>Email:</strong> ${user.email}
                </div>
                <div>
                    <strong>Purchases:</strong> ${user.purchaseCount || 0}
                </div>
                ${user.phone ? `
                    <div>
                        <strong>Phone:</strong> ${user.phone}
                    </div>
                ` : ''}
                ${user.whatsapp ? `
                    <div>
                        <strong>WhatsApp:</strong> ${user.whatsapp}
                    </div>
                ` : ''}
            </div>
            
            <div class="user-actions" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                <button class="btn small secondary" onclick="generateKeyForUser('${user._id || user.id}', '${user.email}')" style="padding:4px 10px;font-size:12px;">
                    Generate Key
                </button>
                ${user.role === 'user' ? `
                    <button class="btn small secondary" onclick="makeAdmin('${user._id || user.id}')" style="padding:4px 10px;font-size:12px;">
                        Make Admin
                    </button>
                ` : ''}
                <a href="https://wa.me/${getWhatsAppNumber(user.whatsapp)}?text=${encodeURIComponent(`Hello ${user.name}! This is from Empire Beatstore.`)}" 
                   target="_blank" 
                   class="btn small" 
                   style="background:#25D366;color:white;padding:4px 10px;font-size:12px;text-decoration:none;">
                    WhatsApp
                </a>
            </div>
        </div>
    `).join('');
}

// Filter users
function filterUsers() {
    const search = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const role = document.getElementById('userRoleFilter')?.value || '';
    
    const filtered = (window.allUsers || []).filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(search) ||
                             user.email?.toLowerCase().includes(search) ||
                             user.phone?.toLowerCase().includes(search);
        const matchesRole = !role || user.role === role;
        return matchesSearch && matchesRole;
    });
    
    displayUsers(filtered);
}

// Quick generate for user
function generateKeyForUser(userId, userEmail) {
    console.log(`🔑 Quick generate for user: ${userEmail}`);
    
    // Switch to generate tab
    switchAdminTab('generate');
    
    // Pre-fill user email
    const emailInput = document.getElementById('adminUserEmail');
    if (emailInput) {
        emailInput.value = userEmail;
        emailInput.focus();
    }
    
    showToast(`Prefilled for ${userEmail}. Now select a beat.`, 'info');
}

// Load purchase keys for admin
async function loadPurchaseKeys() {
    try {
        console.log('📡 Loading purchase keys...');
        
        const response = await fetch(`${API_BASE_URL}/purchases/admin/purchase-keys`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 404) {
            console.error('❌ Purchase keys route not found (404)');
            showToast('Admin route not configured. Check backend.', 'error');
            
            const keysList = document.getElementById('keysList');
            if (keysList) {
                keysList.innerHTML = `
                    <div style="text-align:center;padding:40px 20px;color:var(--muted);">
                        <p>⚠️ Route not configured</p>
                        <p style="font-size:12px;">Make sure backend has /api/purchases/admin/purchase-keys route</p>
                    </div>
                `;
            }
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            window.allPurchaseKeys = data.purchases || [];
            displayKeys(allPurchaseKeys);
            updatePagination();
            console.log(`✅ Loaded ${allPurchaseKeys.length} purchase keys`);
        } else {
            showToast(data.message || 'Error loading keys', 'error');
        }
    } catch (error) {
        console.error('Error loading purchase keys:', error);
        
        const keysList = document.getElementById('keysList');
        if (keysList) {
            keysList.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:var(--muted);">
                    <p>❌ Error loading purchase keys</p>
                    <p style="font-size:12px;">${error.message}</p>
                    <button class="btn small secondary" onclick="loadPurchaseKeys()" style="margin-top:10px;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// Display keys in admin panel
function displayKeys(keys) {
    const keysList = document.getElementById('keysList');
    if (!keysList) return;
    
    if (!keys || keys.length === 0) {
        keysList.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--muted);">
                No purchase keys found
            </div>
        `;
        return;
    }
    
    // Paginate
    const currentPage = window.currentPage || 1;
    const perPage = 10;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const paginatedKeys = keys.slice(start, end);
    
    keysList.innerHTML = paginatedKeys.map(purchase => {
        const statusColors = {
            pending: { bg: '#fff3cd', color: '#856404' },
            used: { bg: '#d4edda', color: '#155724' },
            expired: { bg: '#f8d7da', color: '#721c24' },
            cancelled: { bg: '#e2e3e5', color: '#383d41' }
        };
        
        const statusStyle = statusColors[purchase.status] || statusColors.pending;
        
        return `
            <div class="key-card" style="padding:15px;border-bottom:1px solid var(--border);transition:background 0.2s;">
                <div class="key-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div class="key-code" style="font-family:monospace;font-size:16px;font-weight:bold;color:var(--accent1);background:var(--card-bg);padding:4px 8px;border-radius:4px;letter-spacing:1px;">
                        ${purchase.purchaseKey}
                    </div>
                    <span class="key-status" style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;background:${statusStyle.bg};color:${statusStyle.color};">
                        ${purchase.status}
                    </span>
                </div>
                
                <div class="key-details" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;font-size:14px;color:var(--muted);">
                    <div>
                        <strong>Beat:</strong> ${purchase.beat?.title || 'N/A'}
                    </div>
                    <div>
                        <strong>User:</strong> ${purchase.user?.name || 'N/A'} (${purchase.user?.email || 'N/A'})
                    </div>
                    <div>
                        <strong>Amount:</strong> ${purchase.amount} KES
                    </div>
                    <div>
                        <strong>Created:</strong> ${new Date(purchase.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                        <strong>Expires:</strong> ${new Date(purchase.expiresAt).toLocaleDateString()}
                    </div>
                    ${purchase.usedAt ? `
                        <div>
                            <strong>Used:</strong> ${new Date(purchase.usedAt).toLocaleDateString()}
                        </div>
                    ` : ''}
                </div>
                
                <div class="key-actions" style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                    <button class="btn small secondary" onclick="copyKey('${purchase.purchaseKey}')" style="padding:4px 10px;font-size:12px;">
                        Copy Key
                    </button>
                    
                    <a href="https://wa.me/${getWhatsAppNumber(purchase.user?.whatsapp)}?text=${encodeURIComponent(`Hello ${purchase.user?.name}! Your purchase key for "${purchase.beat?.title}" is: ${purchase.purchaseKey}. Enter this key on the website to download.`)}" 
                       target="_blank" 
                       class="btn small" 
                       style="background:#25D366;color:white;padding:4px 10px;font-size:12px;text-decoration:none;">
                        WhatsApp User
                    </a>
                    
                    ${purchase.status === 'pending' ? `
                        <button class="btn small secondary" onclick="extendKey('${purchase._id || purchase.id}')" style="padding:4px 10px;font-size:12px;">
                            Extend 24h
                        </button>
                        <button class="btn small secondary" onclick="cancelKey('${purchase._id || purchase.id}')" style="padding:4px 10px;font-size:12px;">
                            Cancel
                        </button>
                    ` : ''}
                    
                    <button class="btn small secondary" onclick="viewKeyDetails('${purchase._id || purchase.id}')" style="padding:4px 10px;font-size:12px;">
                        Details
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Update pagination
function updatePagination() {
    const totalKeys = window.allPurchaseKeys?.length || 0;
    const totalPages = Math.ceil(totalKeys / 10);
    const pagination = document.getElementById('keysPagination');
    
    if (!pagination || totalPages <= 1) {
        if (pagination) pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    const currentPage = window.currentPage || 1;
    
    // Previous button
    html += `
        <button class="page-btn" onclick="changeKeysPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} style="padding:8px 12px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);border-radius:4px;cursor:pointer;">
            ←
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `
                <button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changeKeysPage(${i})" style="padding:8px 12px;border:1px solid var(--border);background:${currentPage === i ? 'var(--accent1)' : 'var(--card-bg)'};color:${currentPage === i ? 'white' : 'var(--text)'};border-radius:4px;cursor:pointer;border-color:${currentPage === i ? 'var(--accent1)' : 'var(--border)'};">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span style="padding:8px 12px;color:var(--muted);">...</span>`;
        }
    }
    
    // Next button
    html += `
        <button class="page-btn" onclick="changeKeysPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} style="padding:8px 12px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);border-radius:4px;cursor:pointer;">
            →
        </button>
    `;
    
    pagination.innerHTML = html;
}

// Change keys page
function changeKeysPage(page) {
    const totalPages = Math.ceil((window.allPurchaseKeys?.length || 0) / 10);
    if (page < 1 || page > totalPages) return;
    
    window.currentPage = page;
    displayKeys(window.allPurchaseKeys);
    updatePagination();
    
    // Scroll to top of list
    const keysList = document.getElementById('keysList');
    if (keysList) keysList.scrollTop = 0;
}

// Filter keys
function filterKeys() {
    const search = document.getElementById('searchKeys')?.value.toLowerCase() || '';
    const status = document.getElementById('keyStatusFilter')?.value || '';
    
    const filtered = (window.allPurchaseKeys || []).filter(purchase => {
        const matchesSearch = purchase.purchaseKey?.toLowerCase().includes(search) ||
                             purchase.beat?.title?.toLowerCase().includes(search) ||
                             purchase.user?.name?.toLowerCase().includes(search) ||
                             purchase.user?.email?.toLowerCase().includes(search);
        const matchesStatus = !status || purchase.status === status;
        return matchesSearch && matchesStatus;
    });
    
    window.currentPage = 1;
    displayKeys(filtered);
    updatePagination(filtered.length);
}

// Refresh keys
function refreshKeys() {
    loadPurchaseKeys();
    showToast('Purchase keys refreshed', 'info');
}

// Copy key to clipboard
function copyKey(key) {
    navigator.clipboard.writeText(key)
        .then(() => showToast('Key copied to clipboard!', 'success'))
        .catch(err => {
            console.error('Copy failed:', err);
            showToast('Failed to copy. Please copy manually.', 'error');
        });
}

// Load admin stats
async function loadAdminStats() {
    try {
        console.log('📊 Loading admin stats...');
        
        const response = await fetch(`${API_BASE_URL}/purchases/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update stats cards
            const totalKeysEl = document.getElementById('totalKeys');
            const pendingKeysEl = document.getElementById('pendingKeys');
            const usedKeysEl = document.getElementById('usedKeys');
            const expiredKeysEl = document.getElementById('expiredKeys');
            
            if (totalKeysEl) totalKeysEl.textContent = data.stats.totalKeys || 0;
            if (pendingKeysEl) pendingKeysEl.textContent = data.stats.pendingKeys || 0;
            if (usedKeysEl) usedKeysEl.textContent = data.stats.usedKeys || 0;
            if (expiredKeysEl) expiredKeysEl.textContent = data.stats.expiredKeys || 0;
            
            // Load recent purchases
            await loadRecentPurchases();
            
            console.log('✅ Admin stats loaded');
        } else {
            console.error('Stats error:', data.message);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load recent purchases for stats tab
async function loadRecentPurchases() {
    try {
        const response = await fetch(`${API_BASE_URL}/purchases/recent`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const container = document.getElementById('recentPurchases');
            if (!container) return;
            
            if (!data.purchases || data.purchases.length === 0) {
                container.innerHTML = '<p style="color:var(--muted);text-align:center;">No recent purchases</p>';
                return;
            }
            
            container.innerHTML = data.purchases.map(purchase => `
                <div style="padding:10px 0;border-bottom:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <strong>${purchase.beat?.title || 'Unknown Beat'}</strong><br>
                            <small style="color:var(--muted);">${purchase.user?.name || 'Unknown User'}</small>
                        </div>
                        <div style="text-align:right;">
                            <div>${purchase.amount || 0} KES</div>
                            <small style="color:var(--muted);">
                                ${new Date(purchase.usedAt || purchase.createdAt).toLocaleDateString()}
                            </small>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading recent purchases:', error);
    }
}

// Generate purchase key (admin panel)
async function generatePurchaseKeyAdmin() {
    console.log('🔑 Generating purchase key (admin)...');
    
    try {
        // Get elements safely
        const beatId = document.getElementById('adminBeatSelect')?.value;
        const userEmail = document.getElementById('adminUserEmail')?.value.trim();
        const expirationHours = document.getElementById('expirationHours')?.value || 24;
        const keyResult = document.getElementById('keyResult');
        const generateBtn = document.querySelector('#generateTab .btn');
        
        // Debug logging
        console.log('Elements found:', {
            beatId,
            userEmail,
            expirationHours,
            keyResult: !!keyResult,
            generateBtn: !!generateBtn
        });
        
        // Validation
        if (!beatId) {
            showKeyResult(keyResult, '❌ Please select a beat', 'error');
            return;
        }
        
        if (!userEmail) {
            showKeyResult(keyResult, '❌ Please enter user email', 'error');
            return;
        }
        
        // Get beat
        const selectedBeat = allBeats.find(b => b.id === beatId);
        if (!selectedBeat) {
            showKeyResult(keyResult, '❌ Selected beat not found', 'error');
            return;
        }
        
        // Update button text
        if (generateBtn) {
            generateBtn.disabled = true;
            const originalText = generateBtn.innerHTML;
            
            generateBtn.innerHTML = `
                <span style="display:flex;align-items:center;gap:8px">
                    <svg class="loading-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Generating...
                </span>
            `;
            
            try {
                const response = await fetch(`${API_BASE_URL}/purchases/generate-key`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        beatId,
                        userEmail,
                        expirationHours: parseInt(expirationHours)
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const key = data.purchaseKey;
                    
                    // Show success message
                    showKeyResult(keyResult, `
                        <div style="text-align:center;">
                            <h4 style="margin-bottom:15px;color:var(--success);">✅ Purchase Key Generated!</h4>
                            <div style="background:var(--card-bg);padding:15px;border-radius:8px;border:2px solid var(--accent1);margin-bottom:15px;">
                                <div style="font-family:monospace;font-size:20px;font-weight:bold;color:var(--accent1);letter-spacing:1px;margin-bottom:10px;">
                                    ${key}
                                </div>
                                <div style="margin-top:10px;font-size:14px;color:var(--muted);">
                                    <div><strong>Beat:</strong> ${selectedBeat.title}</div>
                                    <div><strong>User:</strong> ${userEmail}</div>
                                    <div><strong>Expires in:</strong> ${expirationHours} hours</div>
                                </div>
                            </div>
                            <div style="display:flex;gap:10px;justify-content:center;">
                                <button class="btn" onclick="copyKeyToClipboard('${key}')">
                                    📋 Copy Key
                                </button>
                                <button class="btn secondary" onclick="sendKeyViaWhatsApp('${key}', '${userEmail}', '${selectedBeat.title}')">
                                    💬 WhatsApp
                                </button>
                            </div>
                        </div>
                    `, 'success');
                    
                    // Reset form
                    document.getElementById('adminUserEmail').value = '';
                    document.getElementById('adminBeatSelect').selectedIndex = 0;
                    
                    // Refresh keys list
                    setTimeout(() => {
                        loadPurchaseKeys();
                    }, 1000);
                    
                    showToast('Purchase key generated successfully!', 'success');
                    
                } else {
                    showKeyResult(keyResult, `❌ ${data.message || 'Failed to generate key'}`, 'error');
                }
            } catch (error) {
                console.error('Generate key error:', error);
                showKeyResult(keyResult, '❌ Network error. Please check connection and try again.', 'error');
            } finally {
                // Restore button state
                generateBtn.disabled = false;
                generateBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Generate Purchase Key
                `;
            }
        }
    } catch (error) {
        console.error('Unexpected error in generatePurchaseKeyAdmin:', error);
        showToast('An unexpected error occurred', 'error');
    }
}

// Show key result
function showKeyResult(element, message, type = 'info') {
    if (!element) return;
    
    const typeClass = type === 'success' ? 'success' : 
                     type === 'error' ? 'error' : 'info';
    
    element.innerHTML = `
        <div class="key-result ${typeClass}" style="padding:15px;border-radius:8px;margin:10px 0;">
            ${message}
        </div>
    `;
    
    // Auto-clear after 10 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            if (element && element.innerHTML.includes('key-result')) {
                element.innerHTML = '';
            }
        }, 10000);
    }
}

// Helper functions
function copyKeyToClipboard(key) {
    navigator.clipboard.writeText(key)
        .then(() => showToast('Key copied to clipboard!', 'success'))
        .catch(err => {
            console.error('Copy failed:', err);
            showToast('Failed to copy. Please copy manually.', 'error');
        });
}

function sendKeyViaWhatsApp(key, userEmail, beatTitle) {
    const message = encodeURIComponent(
        `Hello! Your purchase key for "${beatTitle}" is: ${key}\n\n` +
        `Enter this key at Empire Beatstore to download your beat.\n` +
        `Key: ${key}\n` +
        `Email: ${userEmail}\n` +
        `Note: This key expires in 24 hours.`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
}