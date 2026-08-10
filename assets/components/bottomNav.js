const tabs = [
  {
    id: 'home',
    label: 'Home',
    href: 'dashboard.html',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>`,
  },
  {
    id: 'products',
    label: 'Products',
    href: 'products.html',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>`,
  },
  {
    id: 'add',
    label: 'Add Product',
    href: 'add-product.html',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>`,
  },
  {
    id: 'marketing',
    label: 'Ai Marketing',
    href: 'marketing.html',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 010 7.07"/>
      <path d="M19.07 4.93a10 10 0 010 14.14"/>
    </svg>`,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: 'settings.html',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>`,
  },
]

// Detect desktop
function isDesktop() {
  return window.innerWidth >= 768
}

// Sticky header scroll shadow─
function initStickyHeader() {
  const header = document.querySelector('.dash-header')
  const scrollEl = document.querySelector('.page-content')
  if (!header || !scrollEl) return

  scrollEl.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', scrollEl.scrollTop > 4)
  })
}

// Render Nav
export function renderBottomNav(activeTab = 'home', onAddClick = null, storeName = '', logoUrl = '') {
  if (isDesktop()) {
    renderSidebar(activeTab, onAddClick, storeName, logoUrl)
  } else {
    renderMobileNav(activeTab, onAddClick)
  }

  initStickyHeader()

  // Re-render on resize
  let resizeTimer
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      // Remove both and re-render correct one
      document.getElementById('bottom-nav')?.remove()
      document.getElementById('sidebar-nav')?.remove()
      if (isDesktop()) {
        renderSidebar(activeTab, onAddClick, storeName, logoUrl)
      } else {
        renderMobileNav(activeTab, onAddClick)
      }
    }, 150)
  })
}

// Mobile Bottom Nav─
function renderMobileNav(activeTab, onAddClick) {
  document.getElementById('bottom-nav')?.remove()

  const nav = document.createElement('nav')
  nav.id = 'bottom-nav'
  nav.className = 'bottom-nav'

  nav.innerHTML = tabs.map(tab => {
    if (tab.id === 'add') {
      return `
        <button class="nav-add-btn" id="nav-add-btn" aria-label="Add product">
          ${tab.icon}
        </button>
      `
    }
    const isActive = tab.id === activeTab
    return `
      <a href="${tab.href}" class="nav-item ${isActive ? 'active' : ''}" data-tab="${tab.id}">
        <span class="nav-icon">${tab.icon}</span>
        <span class="nav-label">${tab.label}</span>
      </a>
    `
  }).join('')

  document.body.appendChild(nav)

  document.getElementById('nav-add-btn')?.addEventListener('click', () => {
    if (onAddClick) onAddClick()
    else window.location.href = 'add-product.html'
  })
}

// Desktop Sidebar─
function renderSidebar(activeTab, onAddClick, storeName, logoUrl) {
  document.getElementById('sidebar-nav')?.remove()

  // Wrap body in desktop layout if not already
  if (!document.querySelector('.desktop-layout')) {
    const shell = document.querySelector('.app-shell')
    const layout = document.createElement('div')
    layout.className = 'desktop-layout'
    shell.parentNode.insertBefore(layout, shell)
    layout.appendChild(shell)
  }

  const sidebar = document.createElement('aside')
  sidebar.id = 'sidebar-nav'
  sidebar.className = 'sidebar'

  // Build sidebar nav items — skip the mobile-only add button
  const navItems = tabs.filter(t => t.id !== 'add').map(tab => {
    const isActive = tab.id === activeTab
    return `
      <a href="${tab.href}" class="sidebar-item ${isActive ? 'active' : ''}" data-tab="${tab.id}">
        <span class="sidebar-item-icon">${tab.icon}</span>
        <span class="sidebar-item-label">${tab.label}</span>
      </a>
    `
  }).join('')

  // Avatar initials or image
  const avatarContent = logoUrl
    ? `<img src="${logoUrl}" alt="Vendorly logo">`
    : `<span>${storeName ? storeName.charAt(0).toUpperCase() : '?'}</span>`

  sidebar.innerHTML = `
    <!-- Logo -->
<div class="sidebar-brand">
    <a href="dashboard.html" class="sidebar-brand-link">
        <img
            src="assets/images/vendorly-logo.png"
            alt="Vendorly"
            class="sidebar-brand-logo"
        />

        <div class="sidebar-brand-text">
            <h2>Vendorly</h2>
            <p>Build • Share • Sell</p>
        </div>
    </a>
</div>

    <!-- Nav items -->
    <nav class="sidebar-nav">
      ${navItems}

      <!-- Add Product button -->
      <button class="sidebar-add-btn" id="sidebar-add-btn">
        <div class="sidebar-add-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <span>Add Product</span>
      </button>
    </nav>

    <!-- Vendor profile at bottom -->
    <a href="settings.html" class="sidebar-profile">
      <div class="sidebar-profile-avatar">${avatarContent}</div>
      <div class="sidebar-profile-info">
        <p class="sidebar-profile-name">${storeName || 'My Store'}</p>
        <p class="sidebar-profile-handle">View Settings</p>
      </div>
    </a>
  `

  // Insert sidebar before app-shell inside desktop-layout
  const layout = document.querySelector('.desktop-layout')
  layout.insertBefore(sidebar, layout.firstChild)

  // Add button handler
  document.getElementById('sidebar-add-btn')?.addEventListener('click', () => {
    if (onAddClick) onAddClick()
    else window.location.href = 'add-product.html'
  })
}
