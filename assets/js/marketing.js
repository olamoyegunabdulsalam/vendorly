import { requireAuth } from './auth.js'
import { fetchStore } from './store.js'
import { fetchProducts } from './products.js'
import { formatPrice, getStoreUrl, copyToClipboard, showToast } from './utils.js'
import { renderBottomNav } from '../components/bottomNav.js'
import { supabase } from './supabase.js'

// Init
const user = await requireAuth()
const store = await fetchStore(user.id)
const products = await fetchProducts(user.id)

renderBottomNav('marketing', null, store?.store_name, store?.logo_url)

function renderHeader(store) {
    const storeName = store?.store_name || 'Your Store'

    const avatar = document.getElementById('vendorAvatar')
    if (store?.logo_url) {
        avatar.innerHTML = `<img src="${store.logo_url}" alt="${storeName}">`
    } else {
        avatar.textContent = storeName.charAt(0).toUpperCase() || '?'
    }
}

renderHeader(store)

// State
let selectedProduct = null
let generatedCaption = ''
let generatedHashtags = []
let selectedHashtags = new Set()
const storeUrl = getStoreUrl(store.id, store.slug)

// Populate Product Selector
const productSelect = document.getElementById('productSelect')

if (products && products.length > 0) {
    products.forEach(p => {
        const option = document.createElement('option')
        option.value = p.id
        option.textContent = `${p.name} — ${formatPrice(p.price)}`
        productSelect.appendChild(option)
    })
}

// Product select change
productSelect.addEventListener('change', () => {
    const id = productSelect.value

    if (!id) {
        selectedProduct = null
        document.getElementById('selectedProductCard').style.display = 'none'
        updateFlyerPreview()
        return
    }

    selectedProduct = products.find(p => p.id === id)
    if (!selectedProduct) return

    // Show selected product card
    const card = document.getElementById('selectedProductCard')
    const img = document.getElementById('selectedProductImg')

    if (selectedProduct.image_url) {
        img.src = selectedProduct.image_url
        img.style.display = 'block'
    } else {
        img.style.display = 'none'
    }

    document.getElementById('selectedProductName').textContent = selectedProduct.name
    document.getElementById('selectedProductPrice').textContent = formatPrice(selectedProduct.price)
    card.style.display = 'flex'

    // Update flyer preview immediately
    updateFlyerPreview()
})

// Clear selected product
document.getElementById('clearProductBtn').addEventListener('click', () => {
    productSelect.value = ''
    selectedProduct = null
    document.getElementById('selectedProductCard').style.display = 'none'
    updateFlyerPreview()
})

// Prompt Character Count
const mainPrompt = document.getElementById('mainPrompt')

mainPrompt.addEventListener('input', () => {
    document.getElementById('mainPromptCount').textContent =
        `${mainPrompt.value.length} / 160`
})

// Chips
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        mainPrompt.value = chip.dataset.fill
        mainPrompt.dispatchEvent(new Event('input'))
    })
})


// Generate Campaign
document.getElementById('generateCampaignBtn').addEventListener('click', async () => {
    const prompt = mainPrompt.value.trim()

    if (!prompt && !selectedProduct) {
        showError('Please describe what you are promoting or select a product.')
        return
    }

    hideError()
    setGenerating(true)

    try {
        const result = await callGeminiAPI(prompt, selectedProduct, store)
        renderResults(result, prompt)
        document.getElementById('lastGeneratedNote').textContent =
            `Generated just now · ${new Date().toLocaleTimeString()}`
    } catch (err) {
        showError('Failed to generate campaign. Please try again.')
        console.error(err)
    } finally {
        setGenerating(false)
    }
})

// Call Gemini API
async function callGeminiAPI(prompt, product, store) {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
        throw new Error('User is not logged in.')
    }

    const response = await fetch(
        `${import.meta.env?.VITE_SUPABASE_URL ?? 'https://dkvhlfigmyzekmnwzhil.supabase.co'}/functions/v1/generate-campaign`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                prompt,
                productName: product?.name || '',
                productPrice: product ? formatPrice(product.price) : '',
                storeName: store?.store_name || 'My Store',
                storeUrl
            })
        }
    )

    if (!response.ok) {
        const text = await response.text()
        console.error(text)
        throw new Error(`Edge Function Error: ${response.status}`)
    }

    return await response.json()
}

// Render Results
function renderResults(result, prompt) {
    generatedCaption = result.caption || ''
    generatedHashtags = result.hashtags || []
    selectedHashtags = new Set()

    // Update flyer
    document.getElementById('flyerTitle').textContent = result.flyer_headline || ''
    document.querySelector('.flyer-canvas .sub').textContent = result.flyer_subtext || ''
    applyFlyerVisualStyle(prompt)
    updateFlyerPreview()

    // Show flyer canvas
    document.getElementById('flyerEmpty').style.display = 'none'
    document.getElementById('flyerCanvas').classList.add('filled')

    // Caption
    document.getElementById('captionPlaceholder').style.display = 'none'
    const captionBox = document.getElementById('captionBox')
    captionBox.textContent = generatedCaption
    captionBox.style.display = 'block'

    // Hashtags
    document.getElementById('hashtagPlaceholder').style.display = 'none'
    renderHashtags(generatedHashtags)

    // Enable all buttons
    enableButtons()
    showTemplateIndicator(currentTemplate)
    showOutputActions()
}

// Update Flyer Preview
function updateFlyerPreview() {
    const storeName = store?.store_name || 'My Store'
    const flyerCanvas = document.getElementById('flyerCanvas')

    document.getElementById('flyerBrandName').textContent = storeName
    document.querySelector('.flyer-canvas .flyer-link').textContent = storeUrl

    // Replace initials with real store logo
    const badge = document.querySelector('.flyer-canvas .badge')
    if (store?.logo_url) {
        badge.innerHTML = `<img src="${store.logo_url}" alt="${storeName}"
      style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
    } else {
        // Fallback to initials if no logo
        badge.textContent = storeName.substring(0, 2).toUpperCase()
    }

    // Product image as hero — rest stays the same
    const bgImg = document.getElementById('flyerBg')
    if (selectedProduct?.image_url) {
        bgImg.src = selectedProduct.image_url
        bgImg.style.display = 'block'
        flyerCanvas.classList.add('has-image')
    } else {
        bgImg.style.display = 'none'
        flyerCanvas.classList.remove('has-image')
    }

    // Price pill
    const pricePill = document.getElementById('flyerPrice')
    if (selectedProduct) {
        pricePill.textContent = formatPrice(selectedProduct.price)
        pricePill.style.display = 'inline-flex'
    } else {
        pricePill.style.display = 'none'
    }

    const storeLinkEl = document.getElementById('flyerStoreLink')
    if (storeLinkEl) storeLinkEl.textContent = storeUrl
}

function showTemplateIndicator(template) {
    const indicator = document.getElementById('templateIndicator')
    const nameEl = document.getElementById('templateName')
    if (indicator && nameEl && template) {
        nameEl.textContent = template.name
        indicator.style.display = 'flex'
    }
}

function showOutputActions() {
    document.getElementById('captionActions').style.display = 'flex'
    document.getElementById('hashtagActions').style.display = 'flex'
}

document.getElementById('reshuffleBtn')?.addEventListener('click', () => {
    applyFlyerVisualStyle(mainPrompt.value.trim())
    updateFlyerPreview()
    showTemplateIndicator(currentTemplate)
})

// 8 premium templates — each maps to a CSS class
const FLYER_TEMPLATES = [
    {
        id: 'luxury-fashion',
        name: 'Luxury Fashion',
        class: 'template-luxury-fashion',
        defaultBadge: 'NEW IN',
        tagline: 'Premium Collection',
    },
    {
        id: 'naija-market',
        name: 'Naija Market',
        class: 'template-naija-market',
        defaultBadge: 'HOT DEAL',
        tagline: 'Shop Direct · No Middleman',
    },
    {
        id: 'clean-minimal',
        name: 'Clean Minimal',
        class: 'template-clean-minimal',
        defaultBadge: 'NEW',
        tagline: 'Quality You Can Trust',
    },
    {
        id: 'beauty',
        name: 'Beauty & Glow',
        class: 'template-beauty',
        defaultBadge: 'GLOW UP',
        tagline: 'Feel Beautiful Every Day',
    },
    {
        id: 'streetwear',
        name: 'Streetwear Hype',
        class: 'template-streetwear',
        defaultBadge: 'DROP',
        tagline: 'Limited Edition',
    },
    {
        id: 'food',
        name: 'Food & Eats',
        class: 'template-food',
        defaultBadge: 'FRESH',
        tagline: 'Made with Love · Order Now',
    },
    {
        id: 'tech-purple',
        name: 'Tech & Gadgets',
        class: 'template-tech-purple',
        defaultBadge: 'LATEST',
        tagline: 'Powered by Innovation',
    },
    {
        id: 'emerald',
        name: 'Fresh & Natural',
        class: 'template-emerald',
        defaultBadge: 'FRESH',
        tagline: 'Pure Quality · Fast Delivery',
    },
]

// All template classes — used to clear before applying new one
const ALL_TEMPLATE_CLASSES = FLYER_TEMPLATES.map(t => t.class)

// Current active template
let currentTemplate = null

function applyFlyerVisualStyle(prompt) {
    const canvas = document.getElementById('flyerCanvas')

    // Remove all existing template classes
    canvas.classList.remove(...ALL_TEMPLATE_CLASSES)

    // Pick random template
    const template = FLYER_TEMPLATES[ Math.floor(Math.random() * FLYER_TEMPLATES.length) ]
    currentTemplate = template

    // Apply template class
    canvas.classList.add(template.class)

    // Update tagline
    const taglineEl = canvas.querySelector('.tagline')
    if (taglineEl) taglineEl.textContent = template.tagline

    // Apply smart badge
    const badge = getSmartBadge(prompt, template)
    const badgeEl = document.getElementById('flyerBadge')
    if (badgeEl) badgeEl.textContent = badge
}

function getSmartBadge(prompt, template) {
    const text = `${prompt || ''} ${selectedProduct?.name || ''}`.toLowerCase()

    const badgeMap = [
        { regex: /new|just arrived|fresh|launch|brand new|just in/i, label: 'NEW IN' },
        { regex: /limited|limited stock|only few|last chance|almost gone/i, label: 'LIMITED' },
        { regex: /sale|discount|flash sale|price drop|off|slash/i, label: 'SALE' },
        { regex: /trending|viral|hot|everyone/i, label: 'TRENDING' },
        { regex: /restock|back in stock|returned/i, label: 'RESTOCKED' },
        { regex: /best seller|selling fast|popular|must have/i, label: 'BEST SELLER' },
        { regex: /food|eat|meal|snack|drink|juice|fresh/i, label: 'FRESH' },
        { regex: /beauty|skin|glow|cream|hair/i, label: 'GLOW UP' },
        { regex: /tech|phone|gadget|device|electronic/i, label: 'LATEST' },
    ]

    const match = badgeMap.find(b => b.regex.test(text))
    return match ? match.label : template.defaultBadge
}


// Render Hashtags
function renderHashtags(hashtags) {
    const grid = document.getElementById('hashtagGrid')
    grid.style.display = 'flex'

    grid.innerHTML = hashtags.map(tag => `
    <button class="hashtag-chip" data-tag="${tag}">
      <span class="check">✓</span>
      ${tag}
    </button>
  `).join('')

    grid.querySelectorAll('.hashtag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const tag = chip.dataset.tag
            if (selectedHashtags.has(tag)) {
                selectedHashtags.delete(tag)
                chip.classList.remove('selected')
            } else {
                selectedHashtags.add(tag)
                chip.classList.add('selected')
            }
            document.getElementById('selectedCount').textContent = selectedHashtags.size
        })
    })
}

// Enable Buttons
function enableButtons() {
    ;[ 'refineFlyerBtn', 'refineCaptionBtn', 'refineHashtagsBtn',
        'downloadFlyerBtn', 'shareFlyerBtn',
        'copyCaptionBtn', 'sendCaptionBtn',
        'copyHashtagsBtn'
    ].forEach(id => {
        const el = document.getElementById(id)
        if (el) el.disabled = false
    })
}

// Download Flyer
document.getElementById('downloadFlyerBtn').addEventListener('click', async () => {
    const btn = document.getElementById('downloadFlyerBtn')
    btn.disabled = true
    btn.textContent = 'Preparing...'

    try {
        // Dynamically load html2canvas
        if (!window.html2canvas) {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
        }

        const canvas = await window.html2canvas(document.getElementById('flyerCanvas'), {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
        })

        const link = document.createElement('a')
        link.download = `${store?.store_name || 'vendorly'}-flyer.png`
        link.href = canvas.toDataURL('image/png')
        link.click()

        showToast('Flyer downloaded ✓')
    } catch (err) {
        showToast('Download failed. Try again.', 'error')
        console.error(err)
    } finally {
        btn.disabled = false
        btn.textContent = '⬇ Download'
    }
})

// Share Flyer on WhatsApp
document.getElementById('shareFlyerBtn').addEventListener('click', () => {
    const message = encodeURIComponent(
        `${store?.store_name || 'My Store'}\n\nCheck out our store: ${storeUrl}`
    )
    const phone = store?.whatsapp?.replace(/[^0-9]/g, '') || ''
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
})

// Copy Caption
document.getElementById('copyCaptionBtn').addEventListener('click', async () => {
    if (!generatedCaption) return
    await copyToClipboard(generatedCaption)
    showToast('Caption copied ✓')
})

// Send Caption on WhatsApp
document.getElementById('sendCaptionBtn').addEventListener('click', () => {
    if (!generatedCaption) return
    const phone = store?.whatsapp?.replace(/[^0-9]/g, '') || ''
    const message = encodeURIComponent(generatedCaption)
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
})

// Copy Hashtags
document.getElementById('copyHashtagsBtn').addEventListener('click', async () => {
    const tags = selectedHashtags.size > 0
        ? Array.from(selectedHashtags).join(' ')
        : generatedHashtags.join(' ')

    if (!tags) return
    await copyToClipboard(tags)
    showToast(`${selectedHashtags.size > 0 ? 'Selected' : 'All'} hashtags copied ✓`)
})

// Refine Buttons
document.getElementById('refineFlyerBtn').addEventListener('click', () => {
    mainPrompt.value = mainPrompt.value + ' (make the flyer headline more catchy)'
    document.getElementById('generateCampaignBtn').click()
})

document.getElementById('refineCaptionBtn').addEventListener('click', () => {
    mainPrompt.value = mainPrompt.value + ' (make the caption shorter and punchier)'
    document.getElementById('generateCampaignBtn').click()
})

document.getElementById('refineHashtagsBtn').addEventListener('click', () => {
    mainPrompt.value = mainPrompt.value + ' (suggest different hashtags more specific to Nigeria)'
    document.getElementById('generateCampaignBtn').click()
})

// Helpers
function setGenerating(loading) {
    const btn = document.getElementById('generateCampaignBtn')
    const loader = document.getElementById('flyerSkeleton')
    const canvas = document.getElementById('flyerCanvas')
    const empty = document.getElementById('flyerEmpty')

    btn.disabled = loading
    btn.textContent = loading ? '✦ Generating...' : '✦ Generate campaign'

    if (loading) {
        empty.style.display = 'none'
        canvas.classList.remove('filled')
        canvas.classList.add('loading')
        loader.style.display = 'flex'
    } else {
        canvas.classList.remove('loading')
        loader.style.display = 'none'
    }
}

function showError(message) {
    const el = document.getElementById('errorMsg')
    el.textContent = message
    el.style.display = 'block'
}

function hideError() {
    const el = document.getElementById('errorMsg')
    el.style.display = 'none'
    el.textContent = ''
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
    })
}

