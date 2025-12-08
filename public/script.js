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

let adminPanelInitialized = false;
let adminTabsInitialized = false;
let usersLoaded = false;
let currentAdminTab = null;

// Mobile menu functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileNavOverlay = document.getElementById('mobileNavOverlay');
const mobileNav = document.getElementById('mobileNav');
const mobileNavClose = document.getElementById('mobileNavClose');

// Toggle mobile menu
mobileMenuToggle?.addEventListener('click', () => {
  mobileNav.classList.add('active');
  mobileNavOverlay.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent scrolling
});

// Close mobile menu
function closeMobileMenu() {
  mobileNav.classList.remove('active');
  mobileNavOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

mobileNavClose?.addEventListener('click', closeMobileMenu);
mobileNavOverlay?.addEventListener('click', closeMobileMenu);

// Close mobile menu on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
    closeMobileMenu();
  }
});

// Sync desktop and mobile user states
function syncUserStateToMobile(isLoggedIn, userData) {
  const userDropdownMobile = document.getElementById('userDropdownMobile');
  const userInitialMobile = document.getElementById('userInitialMobile');
  const userEmailMobile = document.getElementById('userEmailMobile');
  const signBtnMobile = document.getElementById('signBtnMobile');
  
  if (isLoggedIn && userData) {
    userDropdownMobile.style.display = 'block';
    signBtnMobile.style.display = 'none';
    userInitialMobile.textContent = userData.name?.charAt(0).toUpperCase() || 'U';
    userEmailMobile.textContent = userData.email || '';
  } else {
    userDropdownMobile.style.display = 'none';
    signBtnMobile.style.display = 'flex';
  }
}

// Mobile button event listeners
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

// Close mobile menu when clicking on dropdown items
document.querySelectorAll('.mobile-nav .dropdown-item').forEach(item => {
  item.addEventListener('click', closeMobileMenu);
});

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

     initAdminPanelButton();
    setupAdminPanelNavigation(); 
    
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
        syncUserStateToMobile(false, null); // ✅ ADD THIS
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
                
                // ✅ ADD THIS: Sync mobile UI
                syncUserStateToMobile(true, data.user);
                
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
            
            // ✅ ADD THIS: Sync mobile UI
            syncUserStateToMobile(false, null);
            
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
        
        // ✅ ADD THIS: Sync mobile UI
        syncUserStateToMobile(false, null);
        
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
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
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
            if (adminPanelBtn) {
                adminPanelBtn.style.display = 'inline-flex';
                adminPanelBtn.style.alignItems = 'center';
                adminPanelBtn.style.gap = '6px';
            }
        } else {
            console.log('👤 User is REGULAR - hiding admin features');
            if (adminUsersBtn) adminUsersBtn.style.display = 'none';
            if (adminDivider) adminDivider.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminPanelBtn) adminPanelBtn.style.display = 'none';
        }
        
        // Update UI visibility
        signBtn.style.display = 'none';
        userDropdown.style.display = 'block';
        
        // ✅ ADD THIS: Sync mobile UI
        syncUserStateToMobile(true, currentUser);
        
        // Force refresh beats to update delete buttons
        setTimeout(() => {
            if (document.getElementById('beatsGrid')) {
                displayBeats(allBeats);
            }
        }, 100);
    }
}

function updateUIForLoggedOutUser() {
    const signBtn = document.getElementById('signBtn');
    const userDropdown = document.getElementById('userDropdown');
    const adminBtn = document.getElementById('adminBtn');
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
    if (signBtn) signBtn.style.display = 'block';
    if (userDropdown) userDropdown.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none';
    if (adminPanelBtn) adminPanelBtn.style.display = 'none';
    
    // ✅ ADD THIS: Sync mobile UI
    syncUserStateToMobile(false, null);
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
    const title = document.getElementById('checkoutTitle');
    const body = document.getElementById('checkoutBody');
    const footer = document.getElementById('checkoutFooter');
    
    if (!modal || !title || !body || !footer) return;
    
    const formattedPrice = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(beat.price);
    
    title.textContent = `Purchase: ${beat.title}`;
    
    // Check if user is logged in
    if (!currentUser || !authToken) {
        body.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <h3 style="margin:20px 0 10px 0;">Sign In Required</h3>
                <p style="color:var(--muted);margin-bottom:20px;">
                    Please sign in to make a purchase
                </p>
            </div>
        `;
        
        footer.innerHTML = `
            <button class="btn secondary" onclick="hideModal('checkoutModal')">Cancel</button>
            <button class="btn" onclick="hideModal('checkoutModal'); showAuthModal();">Sign In</button>
        `;
        
        modal.style.display = 'flex';
        return;
    }
    
    // Step 1: Show purchase info and WhatsApp contact
  // Create optimized CSS
const checkoutStyles = document.createElement('style');
checkoutStyles.textContent = `
/* Reset problematic inline styles */
.checkout-step {
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    min-height: 0 !important;
    width: 100% !important;
    overflow: hidden !important;
}

/* Simple responsive layout */
.main-content-row {
    flex: 1 !important;
    min-height: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    gap: 16px !important;
    width: 100% !important;
}

/* Instructions column - scrollable content only */
.instructions-column {
    flex: 1 !important;
    min-width: 0 !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
}

/* Container for instructions with scroll */
.instructions-container {
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
}

// Update the scrollable steps section to remove top margin:
.scrollable-steps {
    flex: 1 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    padding-right: 8px !important;
    margin-top: 0 !important; /* Add this line */
    padding-top: 0 !important; /* Add this line */
}

// Also make sure the instructions header doesn't add extra margin below:
.instructions-container > div:first-child {
    margin-bottom: 16px !important;
}
/* Actions column - fixed width, scroll if needed */
.actions-column {
    flex: 0 0 300px !important;
    min-width: 0 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    max-height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
}

/* Beat card - always stays at top */
.beat-info-card {
    flex-shrink: 0 !important;
}

/* Bottom actions - always at bottom */
.bottom-actions {
    flex-shrink: 0 !important;
    margin-top: auto !important;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .main-content-row {
        flex-direction: column !important;
        gap: 12px !important;
    }
    
    .instructions-column {
        flex: 1 !important;
        min-height: 300px !important;
    }
    
    .actions-column {
        flex: 0 0 auto !important;
        width: 100% !important;
        max-height: 40vh !important;
    }
    
    .beat-tags {
        flex-wrap: wrap !important;
    }
}

@media (max-width: 480px) {
    .checkout-modal-content {
        margin: 8px !important;
        width: calc(100% - 16px) !important;
        max-height: 95vh !important;
    }
    
    .beat-info-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 12px !important;
    }
    
    .price-display {
        align-self: flex-start !important;
    }
    
    .step-grid {
        grid-template-columns: 1fr !important;
    }
}

/* Prevent text overflow */
.beat-title {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
}

/* Smooth scrolling */
.scrollable-steps::-webkit-scrollbar {
    width: 4px;
}

.scrollable-steps::-webkit-scrollbar-thumb {
    background: var(--accent1);
    border-radius: 2px;
}
`;

document.head.appendChild(checkoutStyles);

// Now create the HTML with minimal inline styles and proper classes
body.innerHTML = `
    <div class="checkout-step" id="checkoutStep1">
        <!-- Beat Information Card -->
        <div class="beat-info-card" style="background: linear-gradient(135deg, var(--card-bg) 0%, var(--bg-secondary) 100%); border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                    <h3 class="beat-title" style="margin: 0 0 8px 0; color: var(--text); font-size: 1.1rem; line-height: 1.3;">${beat.title}</h3>
                    <div class="beat-tags" style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <span style="background: var(--accent1-opaque); color: var(--accent1); padding: 3px 10px; border-radius: 16px; font-size: 11px; font-weight: 500;">${beat.series}</span>
                        <span style="background: rgba(138, 43, 226, 0.1); color: #8a2be2; padding: 3px 10px; border-radius: 16px; font-size: 11px; font-weight: 500;">${beat.fileType}</span>
                        <span style="background: rgba(108, 117, 125, 0.1); color: var(--muted); padding: 3px 10px; border-radius: 16px; font-size: 11px; font-weight: 500;">By: ${beat.uploadedBy?.name || 'Unknown'}</span>
                    </div>
                </div>
                <div style="background: var(--accent1); color: white; padding: 10px 16px; border-radius: 10px; text-align: center; min-width: 100px; flex-shrink: 0;">
                    <div style="font-size: 10px; opacity: 0.9; margin-bottom: 3px;">PRICE</div>
                    <div style="font-size: 1.3rem; font-weight: 700; line-height: 1;">${formattedPrice}</div>
                </div>
            </div>
            
            <div style="border-top: 1px solid var(--border); padding-top: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Complete purchase in 2-5 minutes</span>
                </div>
            </div>
        </div>
        
        <!-- Main Content Area -->
        <div class="main-content-row">
            <!-- Left Column - Instructions -->
            <div class="instructions-column">
                <div class="instructions-container" style="background: var(--card-bg); border-radius: 12px; padding: 20px; border: 1px solid var(--border);">
                    <div style="flex-shrink: 0; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; flex-shrink: 0;">1</div>
                            <div style="flex: 1; min-width: 0;">
                                <h4 style="margin: 0 0 4px 0; color: var(--text); font-size: 1.1rem; line-height: 1.3;">Purchase Instructions</h4>
                                <p style="margin: 0; color: var(--muted); font-size: 13px; line-height: 1.3;">Follow these steps to get your beat</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Scrollable Steps Content -->
                    <div class="scrollable-steps">
                        <!-- Steps Grid -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; margin-bottom: 16px;">
                            ${generateStepsHTML(currentUser.email)}
                        </div>
                        
                        <!-- Important Info Box -->
                        <div style="background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%); border: 2px solid rgba(255, 193, 7, 0.3); border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                            ${generateInfoBoxHTML()}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Right Column - Actions -->
            <div class="actions-column">
                ${generateActionsHTML(beat, currentUser.email, formattedPrice, beatId)}
            </div>
        </div>
        
        <!-- Bottom Actions -->
        <div class="bottom-actions" style="padding-top: 16px; border-top: 1px solid var(--border);">
            <div style="display: flex; gap: 12px;">
                <button onclick="hideModal('checkoutModal')" style="flex: 1; padding: 12px; border-radius: 10px; font-weight: 500; font-size: 14px; background: var(--bg-secondary); color: var(--text); border: 1px solid var(--border); cursor: pointer;">
                    Cancel
                </button>
                <button onclick="checkMyPurchases()" style="flex: 1; padding: 12px; border-radius: 10px; font-weight: 500; font-size: 14px; background: var(--card-bg); color: var(--text); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

// Helper functions to break up the HTML
function generateStepsHTML(email) {
    const steps = [
        { num: 1, title: "Contact on WhatsApp", desc: `Click WhatsApp button to message the seller.`, color: "var(--accent1)" },
       // { num: 2, title: "Confirm Your Email", desc: `Share this email with the seller:<br><strong style="color: var(--text); font-size: 13px; display: inline-block; margin-top: 4px; padding: 4px 8px; background: var(--card-bg); border-radius: 4px; border: 1px solid var(--border);">${email}</strong>`, color: "#8a2be2" },
        { num: 2, title: "Complete Payment", desc: "Pay via seller's whatsapp number. Confirm payment with seller.", color: "#28a745" },
        { num: 3, title: "Receive Purchase Key", desc: 'Get unique key via WhatsApp. Example format: <code style="font-family: monospace; color: #ffc107;">BKT-7X92-3F8A-1C5D</code>', color: "#ffc107" }
    ];
    
    return steps.map(step => `
        <div style="background: var(--bg-secondary); padding: 16px; border-radius: 10px; border-left: 4px solid ${step.color};">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="background: ${step.color}20; color: ${step.color}; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: bold; font-size: 14px;">
                    ${step.num}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <h5 style="margin: 0 0 8px 0; color: var(--text); font-size: 0.95rem;">${step.title}</h5>
                    <p style="margin: 0; color: var(--muted); font-size: 13px; line-height: 1.4;">${step.desc}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function generateInfoBoxHTML() {
    return `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="background: #ffc107; color: #856404; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#856404" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </div>
            <h5 style="margin: 0; color: #856404; font-size: 0.95rem; font-weight: 600;">Important Information</h5>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 6px; height: 6px; background: #28a745; border-radius: 50%; flex-shrink: 0;"></div>
                <span style="color: var(--text); font-size: 12px; font-weight: 500;">Keys are linked to your account</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 6px; height: 6px; background: #dc3545; border-radius: 50%; flex-shrink: 0;"></div>
                <span style="color: var(--text); font-size: 12px; font-weight: 500;">One-time use only</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 6px; height: 6px; background: #17a2b8; border-radius: 50%; flex-shrink: 0;"></div>
                <span style="color: var(--text); font-size: 12px; font-weight: 500;">Valid for 24 hours after generation</span>
            </div>
        </div>
    `;
}

function generateActionsHTML(beat, email, price, beatId) {
    const whatsappNumber = getWhatsAppNumber(beat.uploadedBy?.whatsapp);
    const whatsappMessage = encodeURIComponent(`Hello! I want to purchase "${beat.title}" (${price}). My email is: ${email}`);
    
    return `
        <!-- WhatsApp Action Card -->
        <div style="background: linear-gradient(135deg, var(--card-bg) 0%, rgba(37, 211, 102, 0.05) 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(37, 211, 102, 0.2); text-align: center;">
            <div style="margin-bottom: 16px;">
                <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.150-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.130-.606.134-.133.298-.347.446-.520.149-.174.198-.298.298-.497.099-.198.050-.371-.025-.520-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.500-.669-.510-.173-.008-.371-.010-.57-.010-.198 0-.520.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.200 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.76.982.998-3.675-.236-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.826 9.86 0 0 1 2.9 6.994c-.004 5.45-4.438 9.88-9.888 9.88m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.333 .157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.892 0-3.18-1.24-6.162-3.495-8.411"/>
                    </svg>
                </div>
                <h4 style="margin: 0 0 6px 0; color: var(--text); font-size: 1.1rem;">Start Purchase</h4>
                <p style="margin: 0; color: var(--muted); font-size: 13px; line-height: 1.3;">
                    Contact seller directly via WhatsApp
                </p>
            </div>
            
            <a href="https://wa.me/${whatsappNumber}?text=${whatsappMessage}" 
               target="_blank" 
               style="display: block; width: 100%; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: white; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3); border: none; cursor: pointer; margin-bottom: 12px;">
                Contact on WhatsApp
            </a>
        </div>
        
        <!-- Key Entry Card -->
        <div style="background: var(--card-bg); border-radius: 12px; padding: 20px; border: 1px solid var(--border); text-align: center;">
            <div style="margin-bottom: 16px;">
                <div style="width: 48px; height: 48px; background: white; border: 2px solid var(--accent1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent1)" stroke-width="2">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                    </svg>
                </div>
                <h5 style="margin: 0 0 6px 0; color: var(--text); font-size: 1rem;">Already Have Key?</h5>
                <p style="margin: 0; color: var(--muted); font-size: 12px; line-height: 1.3;">
                    Enter purchase key to download instantly
                </p>
            </div>
            
            <button onclick="showKeyInputStep('${beatId}')"
                    style="width: 100%; background: white; color: var(--text); padding: 12px; border-radius: 10px; border: 2px solid var(--accent1); font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(138, 43, 226, 0.1);">
                Enter Purchase Key
            </button>
        </div>
        
        <!-- User Info Card -->
        <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; border: 1px solid var(--border); margin-top: auto;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent1)" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <div style="flex: 1; min-width: 0;">
                    <div style="color: var(--text); font-size: 12px; font-weight: 500; margin-bottom: 4px;">Logged in as</div>
                    <div style="color: var(--accent1); font-weight: 600; font-size: 12px; word-break: break-all; line-height: 1.3;">
                        ${email}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Set modal to proper height constraints
modal.style.display = 'flex';
modal.setAttribute('aria-hidden', 'false');

const modalContent = modal.querySelector('.modal-content');
if (modalContent) {
    modalContent.style.height = '85vh';
    modalContent.style.maxHeight = '700px';
    modalContent.style.minHeight = '500px';
    modalContent.style.display = 'flex';
    modalContent.style.flexDirection = 'column';
    modalContent.style.width = '95%';
    modalContent.style.maxWidth = '1000px';
}
}

// Show key input step
// Show key input step - FIXED VERSION
function showKeyInputStep(beatId) {
    const body = document.getElementById('checkoutBody');
    const footer = document.getElementById('checkoutFooter');
    
    if (!body || !footer) return;
    
    body.innerHTML = `
        <div class="checkout-step" id="checkoutStep2">
            <div class="purchase-instructions" style="margin-bottom:20px;">
                <h4>Enter Purchase Key</h4>
                <p>Enter the purchase key you received from the seller after making payment.</p>
            </div>
            
            <div class="key-input-section">
                <label style="display:block;margin-bottom:8px;color:var(--text);font-weight:500;">
                    Purchase Key:
                </label>
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
                    <input type="text" 
                           id="purchaseKeyInput" 
                           placeholder="Enter your purchase key (e.g., EMP-ABC123XYZ)"
                           style="flex:1;padding:12px 15px;border:1px solid var(--border);border-radius:6px;background:var(--input-bg);color:var(--text);font-family:monospace;letter-spacing:1px;"
                           maxlength="20">
                    <button class="btn secondary" onclick="clearKeyInput()">
                        Clear
                    </button>
                </div>
                
                <div style="display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <span>Keys are 10 characters long, start with EMP-</span>
                </div>
            </div>
            
            <div id="keyVerificationStatus" style="margin-top:20px;"></div>
        </div>
    `;
    
    // Update footer with event listener, NOT onclick attribute
    footer.innerHTML = `
        <button class="btn secondary" onclick="showCheckoutModal('${beatId}')">
            ← Back
        </button>
        <button class="btn" id="verifyDownloadBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Verify & Download
        </button>
    `;
    
    // Add event listener to the new button
    setTimeout(() => {
        const verifyBtn = document.getElementById('verifyDownloadBtn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', verifyAndDownloadPurchaseKey);
        }
    }, 100);
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('purchaseKeyInput');
        if (input) input.focus();
    }, 100);
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

async function generatePurchaseKeyAdmin() {
    console.log('🔑 Generating purchase key (admin)...');
    
    try {
        // Get elements safely
        const beatId = document.getElementById('adminBeatSelect')?.value;
        const userEmail = document.getElementById('adminUserEmail')?.value.trim();
        const amountInput = document.getElementById('adminKeyAmount');
        const keyResult = document.getElementById('keyResult');
        const generateBtn = document.querySelector('#generateKeyForm button[type="submit"]') || 
                          document.querySelector('#generateKeyForm .btn') ||
                          document.querySelector('button[onclick="generatePurchaseKeyAdmin()"]');
        
        // Debug logging
        console.log('Elements found:', {
            beatId,
            userEmail,
            amountInput: !!amountInput,
            keyResult: !!keyResult,
            generateBtn: !!generateBtn
        });
        
        // Validation with better error messages
        if (!beatId) {
            if (keyResult) {
                showKeyResult(keyResult, '❌ Please select a beat', 'error');
            } else {
                showToast('Please select a beat', 'error');
            }
            return;
        }
        
        if (!userEmail) {
            if (keyResult) {
                showKeyResult(keyResult, '❌ Please enter user email', 'error');
            } else {
                showToast('Please enter user email', 'error');
            }
            return;
        }
        
        // Get beat price from the selected beat
        const selectedBeat = allBeats.find(b => b.id === beatId);
        if (!selectedBeat) {
            if (keyResult) {
                showKeyResult(keyResult, '❌ Selected beat not found', 'error');
            } else {
                showToast('Selected beat not found', 'error');
            }
            return;
        }
        
        // Use beat's price as default
        let finalAmount = selectedBeat.price;
        
        // If amount input exists, use its value
        if (amountInput && amountInput.value) {
            const inputAmount = parseFloat(amountInput.value);
            if (!isNaN(inputAmount) && inputAmount > 0) {
                finalAmount = inputAmount;
            }
        }
        
        // Update button text safely
        if (generateBtn) {
            generateBtn.disabled = true;
            const originalText = generateBtn.innerHTML;
            
            // Store original text if not already stored
            if (!generateBtn.hasAttribute('data-original-text')) {
                generateBtn.setAttribute('data-original-text', originalText);
            }
            
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
                        amount: finalAmount
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const key = data.purchaseKey;
                    
                    // Show success message
                    if (keyResult) {
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
                                        <div><strong>Amount:</strong> ${finalAmount} KES</div>
                                    </div>
                                </div>
                                <div style="display:flex;gap:10px;justify-content:center;">
                                    <button class="btn" onclick="copyKeyToClipboard('${key}')">
                                        📋 Copy Key
                                    </button>
                                    <button class="btn secondary" onclick="sendKeyViaWhatsApp('${key}', '${userEmail}', '${selectedBeat.title}', ${finalAmount})">
                                        💬 WhatsApp
                                    </button>
                                </div>
                            </div>
                        `, 'success');
                    } else {
                        showToast(`Key generated: ${key}`, 'success');
                    }
                    
                    // Refresh keys list
                    setTimeout(() => {
                        if (typeof loadPurchaseKeys === 'function') {
                            loadPurchaseKeys();
                        }
                    }, 1000);
                    
                    // Reset form
                    const generateForm = document.getElementById('generateKeyForm');
                    if (generateForm) {
                        generateForm.reset();
                    }
                    
                    showToast('Purchase key generated successfully!', 'success');
                    
                } else {
                    const errorMsg = data.message || 'Failed to generate key';
                    if (keyResult) {
                        showKeyResult(keyResult, `❌ ${errorMsg}`, 'error');
                    } else {
                        showToast(errorMsg, 'error');
                    }
                }
            } catch (error) {
                console.error('Generate key error:', error);
                const errorMsg = 'Network error. Please check connection and try again.';
                if (keyResult) {
                    showKeyResult(keyResult, `❌ ${errorMsg}`, 'error');
                } else {
                    showToast(errorMsg, 'error');
                }
            } finally {
                // Restore button state
                generateBtn.disabled = false;
                const originalText = generateBtn.getAttribute('data-original-text') || 'Generate Key';
                generateBtn.innerHTML = originalText;
            }
        } else {
            // If button not found, proceed without UI updates
            console.warn('Generate button not found, proceeding without UI updates');
            
            const response = await fetch(`${API_BASE_URL}/purchases/generate-key`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    beatId,
                    userEmail,
                    amount: finalAmount
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const key = data.purchaseKey;
                showToast(`Key generated: ${key}`, 'success');
                
                // Try to show in keyResult if exists
                if (keyResult) {
                    showKeyResult(keyResult, `✅ Key generated: ${key}`, 'success');
                }
                
                // Refresh keys list
                setTimeout(() => {
                    if (typeof loadPurchaseKeys === 'function') {
                        loadPurchaseKeys();
                    }
                }, 1000);
            } else {
                showToast(data.message || 'Failed to generate key', 'error');
            }
        }
    } catch (error) {
        console.error('Unexpected error in generatePurchaseKeyAdmin:', error);
        showToast('An unexpected error occurred', 'error');
    }
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
            
            // ✅ ADD THIS: Sync mobile UI
            syncUserStateToMobile(true, data.user);
            
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
            
            // ✅ ADD THIS: Sync mobile UI
            syncUserStateToMobile(true, data.user);
            
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
        
        // ✅ ADD THIS: Sync mobile UI
        syncUserStateToMobile(false, null);
        
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
// Replace your existing initAdminPanelButton function with this:
function initAdminPanelButton() {
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    
    if (!adminPanelBtn) {
        console.log('❌ Admin panel button not found in HTML');
        return;
    }
    
    // Remove any existing event listeners first
    const newBtn = adminPanelBtn.cloneNode(true);
    adminPanelBtn.parentNode.replaceChild(newBtn, adminPanelBtn);
    
    // Get fresh reference
    const freshBtn = document.getElementById('adminPanelBtn');
    
    // Add click event listener
    freshBtn.addEventListener('click', function(e) {
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
// Fixed admin tab switching - SIMPLE VERSION
// Replace your existing setupAdminTabs function with this:
function setupAdminTabs() {
    if (adminTabsInitialized) {
        console.log('⚠️ Admin tabs already initialized, skipping...');
        return;
    }
    
    console.log('🔧 Setting up admin tabs...');
    adminTabsInitialized = true;
    
    // Remove all existing event listeners first
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-tab]');
    
    sidebarItems.forEach(item => {
        // Clone and replace to remove old event listeners
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
    });
    
    // Get fresh references
    const freshItems = document.querySelectorAll('.sidebar-item[data-tab]');
    
    freshItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabId = this.dataset.tab;
            console.log(`📑 Switching to admin tab: ${tabId}`);
            switchAdminTab(tabId);
        });
    });
    
    console.log(`✅ Admin tabs initialized (${freshItems.length} tabs found)`);
}

// Handle ALL admin panel navigation clicks
function setupAdminPanelNavigation() {
    console.log('🔧 Setting up admin panel navigation...');
    
    // Handle sidebar navigation
    document.addEventListener('click', function(e) {
        // Check if clicked on sidebar item
        const sidebarItem = e.target.closest('.sidebar-item[data-tab]');
        if (sidebarItem) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabId = sidebarItem.getAttribute('data-tab');
            console.log(`📑 Sidebar click: Switching to ${tabId} tab`);
            switchAdminTab(tabId);
            return;
        }
        
        // Handle close button
        const closeBtn = e.target.closest('.modal-close[data-close]');
        if (closeBtn && document.getElementById('adminPanelModal').style.display === 'flex') {
            e.preventDefault();
            closeAdminPanel();
            return;
        }
        
        // Handle logout button in sidebar
        const logoutBtn = e.target.closest('.sidebar-action');
        if (logoutBtn) {
            e.preventDefault();
            logout();
            closeAdminPanel();
            return;
        }
    });
    
    // Handle keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('adminPanelModal').style.display === 'flex') {
            closeAdminPanel();
        }
    });
}

// Switch admin tab
// Switch admin tab - FIXED VERSION
// Update switchAdminTab function for users tab
// Replace your existing switchAdminTab function with this:
function switchAdminTab(tabId) {
    // Don't re-switch to same tab
    if (currentAdminTab === tabId) {
        console.log(`⚠️ Already on ${tabId} tab, skipping...`);
        return;
    }
    
    console.log(`🔄 Switching to tab: ${tabId}`);
    currentAdminTab = tabId;
    
    // Update active sidebar item
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabId);
    });
    
    // Show active content tab
    document.querySelectorAll('.admin-tab-content').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId + 'Tab');
    });
    
    // Load specific data for tab if needed
    switch(tabId) {
        case 'dashboard':
            console.log('📊 Loading dashboard...');
            if (typeof loadAdminStats === 'function') {
                loadAdminStats();
            }
            break;
            
        case 'keys':
            console.log('🔑 Loading purchase keys...');
            if (typeof loadPurchaseKeys === 'function') {
                loadPurchaseKeys();
            }
            break;
            
        case 'generate':
            console.log('🔑 Loading generate tab...');
            if (typeof loadBeatsForAdmin === 'function') {
                loadBeatsForAdmin();
            }
            break;
            
        case 'users':
            console.log('👥 Loading users...');
            // Reset usersLoaded flag when switching to users tab
            usersLoaded = false;
            if (typeof loadUsersForAdmin === 'function') {
                loadUsersForAdmin();
            }
            break;
            
        case 'settings':
            console.log('⚙️ Loading settings...');
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
// Replace your existing loadUsersForAdmin function with this:
async function loadUsersForAdmin() {
    // Prevent loading multiple times
    if (usersLoaded) {
        console.log('⚠️ Users already loaded, skipping...');
        return;
    }
    
    console.log('📡 Loading users for admin...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.allUsers = data.users || [];
            
            // Mark as loaded BEFORE displaying
            usersLoaded = true;
            
            // Update dropdown
            const select = document.getElementById('adminUserSelect');
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
            const usersList = document.getElementById('usersList');
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
// Display users in admin panel - CORRECTED VERSION
// Display users in admin panel - FIXED VERSION
// REPLACE your displayUsers function with this:
function displayUsers(users) {
    console.log('👥 Displaying users called with:', users?.length || 0, 'users');
    
    // DEBUG: Check what's in the users array
    console.log('🔍 Users data:', users);
    
    // Try multiple ways to find the table body
    let tableBody = null;
    
    // Try by ID first
    tableBody = document.getElementById('usersTableBody');
    console.log('🔍 By ID (usersTableBody):', tableBody ? 'Found' : 'Not found');
    
    // If not found, try finding any tbody in usersTab
    if (!tableBody) {
        const usersTab = document.getElementById('usersTab');
        if (usersTab) {
            tableBody = usersTab.querySelector('tbody');
            console.log('🔍 By querySelector in usersTab:', tableBody ? 'Found' : 'Not found');
        }
    }
    
    // If still not found, check ALL tbodies
    if (!tableBody) {
        const allTbodies = document.querySelectorAll('tbody');
        console.log('🔍 All tbody elements found:', allTbodies.length);
        if (allTbodies.length > 0) {
            tableBody = allTbodies[0]; // Use first one
        }
    }
    
    // CREATE TABLE IF IT DOESN'T EXIST
    if (!tableBody) {
        console.log('📝 Creating users table structure...');
        
        // Find users tab
        const usersTab = document.getElementById('usersTab');
        if (!usersTab) {
            console.error('❌ usersTab element not found!');
            showToast('Users tab not found', 'error');
            return;
        }
        
        // Create table HTML
        usersTab.innerHTML = `
            <div class="admin-table-container">
                <div class="admin-filters">
                    <input type="text" id="searchUsers" placeholder="Search users..." oninput="filterUsers()">
                    <select id="userRoleFilter" onchange="filterUsers()">
                        <option value="">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Contact</th>
                            <th>Role</th>
                            <th>Purchases</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        <!-- Users will load here -->
                    </tbody>
                </table>
            </div>
        `;
        
        tableBody = document.getElementById('usersTableBody');
        console.log('✅ Created new table body:', tableBody ? 'Found' : 'Still missing');
    }
    
    if (!tableBody) {
        console.error('❌ Could not find or create users table body');
        showToast('Could not display users table', 'error');
        return;
    }
    
    console.log('🎨 Now calling displayUsersInTable with table body:', tableBody);
    displayUsersInTable(users, tableBody);
}

// Helper function to display users in table
function displayUsersInTable(users, tableBody) {
    console.log('📊 Rendering', users?.length || 0, 'users to table body:', tableBody);
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:40px 20px;color:var(--muted);">
                    No users found
                </td>
            </tr>
        `;
        console.log('📭 No users to display');
        return;
    }
    
    console.log('🎨 First user sample:', users[0]);
    
    // Clear existing content safely
    tableBody.innerHTML = '';
    
    // Create HTML for each user
    users.forEach((user, index) => {
        console.log(`👤 Processing user ${index + 1}:`, user.name || user.email);
        
        // Extract user data safely
        const userId = user._id || user.id || `user-${index}`;
        const userName = user.name || 'Unknown User';
        const userEmail = user.email || 'No email';
        const userRole = user.role || 'user';
        const purchaseCount = user.purchaseCount || user.purchases?.length || 0;
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
        const shortId = userId.substring(0, 8) + '...';
        const userInitial = userName.charAt(0).toUpperCase();
        
        // Role styling
        const roleColor = userRole === 'admin' ? '#dc3545' : '#28a745';
        const roleBg = userRole === 'admin' ? '#ffebee' : '#e3f2fd';
        
        // Create row element
        const row = document.createElement('tr');
        row.setAttribute('data-user-id', userId);
        row.style.cssText = 'animation: fadeIn 0.3s ease;';
        
        row.innerHTML = `
            <td style="vertical-align:middle;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;background:var(--accent1);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;">
                        ${userInitial}
                    </div>
                    <div>
                        <div style="font-weight:500;color:var(--text);">${userName}</div>
                        <div style="font-size:11px;color:var(--muted);margin-top:2px;">ID: ${shortId}</div>
                    </div>
                </div>
            </td>
            <td style="vertical-align:middle;">
                <div style="font-size:14px;color:var(--text);">${userEmail}</div>
                ${user.phone ? `<div style="font-size:12px;color:var(--muted);margin-top:2px;">📱 ${user.phone}</div>` : ''}
            </td>
            <td style="vertical-align:middle;">
                <span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${roleBg};color:${roleColor};border:1px solid ${roleColor}20;display:inline-block;">
                    ${userRole.toUpperCase()}
                </span>
            </td>
            <td style="vertical-align:middle;">
                <div style="text-align:center;font-weight:600;font-size:16px;color:var(--accent1);">${purchaseCount}</div>
                <div style="font-size:11px;color:var(--muted);text-align:center;">purchases</div>
            </td>
            <td style="vertical-align:middle;">
                <div style="font-size:14px;color:var(--text);">${createdAt}</div>
                <div style="font-size:11px;color:var(--muted);">${user.createdAt ? formatTimeAgo(user.createdAt) : ''}</div>
            </td>
            <td style="vertical-align:middle;">
                <div style="display:flex;gap:8px;justify-content:center;">
                    <button class="btn-icon small" onclick="generateKeyForUser('${userId}', '${userEmail}')" title="Generate Key" style="background:var(--accent1);color:white;border:none;border-radius:4px;padding:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                        </svg>
                    </button>
                    
                    ${userRole === 'user' ? `
                        <button class="btn-icon small" onclick="makeAdmin('${userId}')" title="Make Admin" style="background:#17a2b8;color:white;border:none;border-radius:4px;padding:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 0 0 8 11a4 4 0 1 1 8 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0 0 15.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 0 0 8 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path>
                            </svg>
                        </button>
                    ` : ''}
                    
                    <button class="btn-icon small" onclick="viewUserDetails('${userId}')" title="View Details" style="background:var(--muted);color:white;border:none;border-radius:4px;padding:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        // Append row to table
        tableBody.appendChild(row);
    });
    
    console.log('✅ Users table updated with', users.length, 'users');
    
    // Force a visual check
    setTimeout(() => {
        console.log('👁️ Visual check - table rows count:', tableBody.querySelectorAll('tr').length);
        
        // Highlight the table for debugging
        const table = tableBody.closest('table');
        if (table) {
            table.style.border = '2px solid #4CAF50';
            table.style.boxShadow = '0 0 10px rgba(76, 175, 80, 0.3)';
            
            // Remove highlight after 2 seconds
            setTimeout(() => {
                table.style.border = '';
                table.style.boxShadow = '';
            }, 2000);
        }
    }, 100);
}

// Add this helper function to format time ago
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
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
// Display keys in admin panel - CORRECTED VERSION
function displayKeys(keys) {
    const keysTableBody = document.getElementById('keysTableBody');
    const keysCount = document.getElementById('keysCount');
    
    if (!keysTableBody) {
        console.log('❌ keysTableBody element not found');
        return;
    }
    
    if (!keys || keys.length === 0) {
        keysTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:40px 20px;color:var(--muted);">
                    No purchase keys found
                </td>
            </tr>
        `;
        if (keysCount) keysCount.textContent = '0';
        return;
    }
    
    // Update count
    if (keysCount) keysCount.textContent = keys.length;
    
    // Paginate
    const start = (window.currentPage || 1 - 1) * 10;
    const end = start + 10;
    const paginatedKeys = keys.slice(start, end);
    
    keysTableBody.innerHTML = paginatedKeys.map(purchase => {
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
                    <code style="font-family:monospace;font-size:13px;color:var(--accent1);background:var(--card-bg);padding:4px 8px;border-radius:4px;letter-spacing:1px;">
                        ${purchase.purchaseKey}
                    </code>
                </td>
                <td>
                    <div>
                        <div style="font-weight:500;">${purchase.beat?.title || 'N/A'}</div>
                        <div style="font-size:12px;color:var(--muted);">${purchase.beat?.series || ''}</div>
                    </div>
                </td>
                <td>
                    <div>
                        <div style="font-weight:500;">${purchase.user?.name || 'N/A'}</div>
                        <div style="font-size:12px;color:var(--muted);">${purchase.user?.email || ''}</div>
                    </div>
                </td>
                <td>
                    <span style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;background:${statusStyle.bg};color:${statusStyle.color};">
                        ${purchase.status}
                    </span>
                </td>
                <td>
                    <div>${new Date(purchase.expiresAt).toLocaleDateString()}</div>
                    <div style="font-size:12px;color:var(--muted);">
                        ${purchase.status === 'pending' ? 'Expires in: ' + getTimeUntilExpiry(purchase.expiresAt) : 'Expired'}
                    </div>
                </td>
                <td>
                    <div style="display:flex;gap:5px;">
                        <button class="btn-icon small" onclick="copyKey('${purchase.purchaseKey}')" title="Copy Key">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </button>
                        ${purchase.status === 'pending' ? `
                            <button class="btn-icon small" onclick="extendKey('${purchase._id}')" title="Extend 24h">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </button>
                            <button class="btn-icon small" onclick="cancelKey('${purchase._id}')" title="Cancel Key" style="color:#dc3545;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        ` : ''}
                        <button class="btn-icon small" onclick="viewKeyDetails('${purchase._id}')" title="View Details">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Helper function to get time until expiry
function getTimeUntilExpiry(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry - now;
    
    if (diffMs <= 0) return 'Expired';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
    } else {
        return `${diffMinutes}m`;
    }
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
// Filter keys - UPDATED VERSION
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
    updatePagination();
}

// Filter users - NEW FUNCTION
function filterUsers() {
    const search = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const role = document.getElementById('userRoleFilter')?.value || '';
    
    const filtered = (window.allUsers || []).filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(search) ||
                             user.email?.toLowerCase().includes(search);
        const matchesRole = !role || user.role === role;
        return matchesSearch && matchesRole;
    });
    
    displayUsers(filtered);
}

// Refresh stats function
function refreshStats() {
    console.log('🔄 Refreshing admin stats...');
    
    // Show loading state on refresh button
    const refreshBtn = document.querySelector('.btn.secondary.small[onclick="refreshStats()"]');
    if (refreshBtn) {
        const originalHTML = refreshBtn.innerHTML;
        refreshBtn.innerHTML = `
            <svg class="loading-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refreshing...
        `;
        refreshBtn.disabled = true;
        
        setTimeout(() => {
            loadAdminStats();
            refreshBtn.innerHTML = originalHTML;
            refreshBtn.disabled = false;
            showToast('Stats refreshed', 'success');
        }, 1000);
    } else {
        loadAdminStats();
    }
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
// UPDATED ADMIN PANEL FUNCTIONS
// ============================================

// Setup admin tabs - UPDATED VERSION
function setupAdminTabs() {
    console.log('🔧 Setting up admin tabs...');
    
    // Remove existing event listeners first
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-tab]');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.dataset.tab;
            console.log(`📑 Switching to admin tab: ${tabId}`);
            switchAdminTab(tabId);
        });
    });
    
    console.log(`✅ Admin tabs initialized (${sidebarItems.length} tabs found)`);
}

// Switch admin tab - UPDATED VERSION
function switchAdminTab(tabId) {
    console.log(`🔄 Switching to tab: ${tabId}`);
    
    // Update active sidebar item
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabId);
    });
    
    // Show active content tab
    document.querySelectorAll('.admin-tab-content').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId + 'Tab');
    });
    
    // Load specific data for tab if needed
    switch(tabId) {
        case 'dashboard':
            console.log('📊 Loading dashboard...');
            if (typeof loadAdminStats === 'function') {
                loadAdminStats();
            }
            break;
        case 'keys':
            console.log('🔑 Loading purchase keys...');
            if (typeof loadPurchaseKeys === 'function') {
                loadPurchaseKeys();
            }
            break;
        case 'generate':
            console.log('🔑 Loading generate tab...');
            // Load beats dropdown if not already loaded
            if (typeof loadBeatsForAdmin === 'function') {
                loadBeatsForAdmin();
            }
            break;
        case 'users':
            console.log('👥 Loading users...');
            if (typeof loadUsersForAdmin === 'function') {
                loadUsersForAdmin();
            }
            break;
        case 'settings':
            console.log('⚙️ Loading settings...');
            // Settings tab doesn't need additional loading
            break;
    }
}

// Load beats for admin dropdown - ADD THIS FUNCTION IF NOT EXISTS
async function loadBeatsForAdmin() {
    try {
        console.log('📡 Loading beats for admin dropdown...');
        
        const response = await fetch(`${API_BASE_URL}/beats`);
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('adminBeatSelect');
            if (!select) return;
            
            // Clear existing options except first
            select.innerHTML = '<option value="">Choose a beat...</option>';
            
            data.beats.forEach(beat => {
                const option = document.createElement('option');
                option.value = beat.id;
                option.textContent = `${beat.title} (${beat.series}) - ${beat.price} KES`;
                select.appendChild(option);
            });
            
            console.log(`✅ Loaded ${data.beats.length} beats for admin dropdown`);
        }
    } catch (error) {
        console.error('Error loading beats for admin:', error);
    }
}

// Update showAdminPanel function to properly setup tabs
// Replace your existing showAdminPanel function with this:
async function showAdminPanel() {
    console.log('🎛️ Admin panel button clicked');
    
    // Prevent multiple initializations
    if (!adminPanelInitialized) {
        adminPanelInitialized = true;
        console.log('📡 Loading admin panel data...');
        await loadAdminPanelData();
    }
    
    const modal = document.getElementById('adminPanelModal');
    if (!modal) {
        console.log('❌ Admin panel modal not found');
        showToast('Admin panel not available', 'error');
        return;
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Setup tabs ONCE
    if (!adminTabsInitialized) {
        setupAdminTabs();
        adminTabsInitialized = true;
    }
    
    // Start with dashboard tab active
    switchAdminTab('dashboard');
    
    console.log('✅ Admin panel displayed');
}

// Update loadAdminPanelData function
async function loadAdminPanelData() {
    console.log('📡 Loading admin panel data...');
    
    try {
        // Load beats for dropdown
        await loadBeatsForAdmin();
        
        // Load users
        await loadUsersForAdmin();
        
        // Load stats
        if (typeof loadAdminStats === 'function') {
            await loadAdminStats();
        }
        
        console.log('✅ Admin panel data loaded');
    } catch (error) {
        console.error('Error loading admin panel data:', error);
        showToast('Error loading admin data', 'error');
    }
}

// Add this function to handle sidebar item clicks directly
function setupAdminSidebarNavigation() {
    document.addEventListener('click', function(e) {
        // Check if clicked element is a sidebar item
        const sidebarItem = e.target.closest('.sidebar-item[data-tab]');
        if (sidebarItem && document.getElementById('adminPanelModal').style.display === 'flex') {
            e.preventDefault();
            const tabId = sidebarItem.dataset.tab;
            switchAdminTab(tabId);
        }
        
        // Handle close button
        if (e.target.closest('.modal-close') && e.target.closest('#adminPanelModal')) {
            closeAdminPanel();
        }
    });
}

// Initialize admin sidebar navigation when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    setupAdminSidebarNavigation();
    
    // Also add keyboard navigation
    document.addEventListener('keydown', function(e) {
        const adminModal = document.getElementById('adminPanelModal');
        if (adminModal && adminModal.style.display === 'flex') {
            // Handle escape key to close
            if (e.key === 'Escape') {
                closeAdminPanel();
            }
        }
    });
});