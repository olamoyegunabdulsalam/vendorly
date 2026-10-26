export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Lu81eLXaRfN5ZkeJdiV63C'

const WHATSAPP_ICON_SRC = '/images/whatsapp.svg'
const POSITION_KEY = 'vendorly_community_fab_position'
const LONG_PRESS_MS = 400
const MOVE_TOLERANCE = 8
const EDGE_GAP = 8

function loadPosition() {
  try {
    const raw = localStorage.getItem(POSITION_KEY)
    if (!raw) return null
    const pos = JSON.parse(raw)
    if (typeof pos.left === 'number' && typeof pos.top === 'number') return pos
    return null
  } catch (err) {
    return null
  }
}

function savePosition(pos) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos))
  } catch (err) {
    console.warn('Could not save icon position:', err)
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function applyPosition(el, left, top) {
  const maxLeft = Math.max(EDGE_GAP, window.innerWidth - el.offsetWidth - EDGE_GAP)
  const maxTop = Math.max(EDGE_GAP, window.innerHeight - el.offsetHeight - EDGE_GAP)
  const pos = {
    left: clamp(left, EDGE_GAP, maxLeft),
    top: clamp(top, EDGE_GAP, maxTop),
  }
  el.style.left = `${pos.left}px`
  el.style.top = `${pos.top}px`
  el.style.right = 'auto'
  el.style.bottom = 'auto'
  return pos
}

export function initVendorCommunityButton() {
  if (document.querySelector('.vendor-community-fab')) return

  const link = document.createElement('a')
  link.className = 'vendor-community-fab'
  link.href = WHATSAPP_GROUP_URL
  link.target = '_blank'
  link.rel = 'noopener'
  link.title = 'Join the vendor community (press and hold to move)'
  link.setAttribute('aria-label', 'Join the Vendorly vendor community on WhatsApp')

  const img = document.createElement('img')
  img.src = WHATSAPP_ICON_SRC
  img.alt = ''
  img.width = 56
  img.height = 56
  img.draggable = false

  link.append(img)
  document.body.append(link)

  const saved = loadPosition()
  if (saved) applyPosition(link, saved.left, saved.top)

  let pressTimer = null
  let isPressing = false
  let isDragging = false
  let justDragged = false
  let startX = 0
  let startY = 0
  let startLeft = 0
  let startTop = 0
  let currentPos = saved

  link.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    isPressing = true
    startX = event.clientX
    startY = event.clientY
    const rect = link.getBoundingClientRect()
    startLeft = rect.left
    startTop = rect.top

    pressTimer = window.setTimeout(() => {
      isDragging = true
      link.classList.add('is-dragging')
      try {
        link.setPointerCapture(event.pointerId)
      } catch (err) {
        // ignore
      }
      if (navigator.vibrate) navigator.vibrate(20)
    }, LONG_PRESS_MS)
  })

  link.addEventListener('pointermove', (event) => {
    const dx = event.clientX - startX
    const dy = event.clientY - startY

    if (!isDragging) {
      if (isPressing && Math.hypot(dx, dy) > MOVE_TOLERANCE) {
        clearTimeout(pressTimer)
      }
      return
    }

    event.preventDefault()
    currentPos = applyPosition(link, startLeft + dx, startTop + dy)
  })

  function endPress() {
    clearTimeout(pressTimer)
    isPressing = false

    if (isDragging) {
      isDragging = false
      justDragged = true
      link.classList.remove('is-dragging')
      if (currentPos) savePosition(currentPos)
      window.setTimeout(() => {
        justDragged = false
      }, 150)
    }
  }

  link.addEventListener('pointerup', endPress)
  link.addEventListener('pointercancel', endPress)

  link.addEventListener('click', (event) => {
    if (justDragged) event.preventDefault()
  })

  link.addEventListener('contextmenu', (event) => {
    if (isPressing || isDragging) event.preventDefault()
  })

  window.addEventListener('resize', () => {
    if (!link.style.left) return
    const rect = link.getBoundingClientRect()
    currentPos = applyPosition(link, rect.left, rect.top)
    savePosition(currentPos)
  })
}