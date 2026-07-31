// ============================================================
// bottomNav.js — Reusable bottom navigation component
// Usage: import { renderBottomNav } from './components/bottomNav.js'
//        renderBottomNav('home') ← pass the active tab name
// ============================================================

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
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>`,
  },
  {
    id: 'add',
    label: '',
    href: null,
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>`,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    href: 'marketing.html',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>`,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: 'settings.html',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`,
  },
]

export function renderBottomNav(activeTab = 'home', onAddClick = null) {
  // Remove existing nav if already rendered
  const existing = document.getElementById('bottom-nav')
  if (existing) existing.remove()

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

  document.querySelector('.app-shell').appendChild(nav)

  // Handle add button click
  const addBtn = document.getElementById('nav-add-btn')
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (onAddClick) {
        onAddClick()
      } else {
        // Default — navigate to add product page
        window.location.href = 'add-product.html'
      }
    })
  }
}
