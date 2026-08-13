import { requireAuth } from './auth.js'
import { fetchStore } from './store.js'
import { fetchProducts } from './products.js'
import { formatPrice, getStoreUrl, copyToClipboard, showToast } from './utils.js'
import { renderBottomNav } from '../components/bottomNav.js'
import { supabase } from './supabase.js'

//  Init 
const user = await requireAuth()
const store = await fetchStore(user.id)
const products = await fetchProducts(user.id)

renderBottomNav('marketing', null, store?.store_name, store?.logo_url)

//  Header avatar 
const avatar = document.getElementById('vendorAvatar')
const storeName = store?.store_name || 'Your Store'
if (store?.logo_url) {
    avatar.innerHTML = `<img src="${store.logo_url}" alt="${storeName}">`
} else {
    avatar.textContent = storeName.charAt(0).toUpperCase()
}

//  State 
let selectedProduct = null
let generatedCaption = ''
let generatedHashtags = []
let selectedHashtags = new Set()
let currentTemplate = null

const storeUrl = getStoreUrl(store?.id, store?.slug)
const DAILY_LIMIT = 10

//  Load and show usage count on page load 
async function loadUsageCount() {
    try {
        const today = new Date().toISOString().split('T')[ 0 ]
        const { data, error } = await supabase
            .from('ai_usage')
            .select('id')
            .eq('vendor_id', user.id)
            .gte('used_at', `${today}T00:00:00`)

        if (error) throw error
        updateUsageDisplay(data?.length || 0, DAILY_LIMIT)
    } catch (err) {
        console.error('Could not load usage count:', err)
        updateUsageDisplay(0, DAILY_LIMIT)
    }
}

function updateUsageDisplay(used, limit) {
    const remaining = limit - used
    const counter = document.getElementById('usageCounter')
    const counterBar = document.getElementById('usageBarFill')

    if (!counter) return

    counter.textContent = `${remaining} of ${limit} campaigns left today`
    counter.className = remaining <= 2
        ? 'usage-counter usage-low'
        : remaining <= 5
            ? 'usage-counter usage-mid'
            : 'usage-counter'

    if (counterBar) {
        const pct = ((limit - remaining) / limit) * 100
        counterBar.style.width = `${pct}%`
        counterBar.className = remaining <= 2
            ? 'usage-bar-fill usage-bar-low'
            : 'usage-bar-fill'
    }

    // Disable generate button if limit reached
    const btn = document.getElementById('generateCampaignBtn')
    if (btn && remaining <= 0) {
        btn.disabled = true
        btn.textContent = '✦ Daily limit reached'
    }
}

loadUsageCount()

//  Populate Product Selector 
const productSelect = document.getElementById('productSelect')

if (products && products.length > 0) {
    products.forEach(p => {
        const option = document.createElement('option')
        option.value = p.id
        option.textContent = `${p.name} — ${formatPrice(p.price)}`
        productSelect.appendChild(option)
    })
}

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
    updateFlyerPreview()
})

document.getElementById('clearProductBtn').addEventListener('click', () => {
    productSelect.value = ''
    selectedProduct = null
    document.getElementById('selectedProductCard').style.display = 'none'
    updateFlyerPreview()
})

//  Prompt Character Count 
const mainPrompt = document.getElementById('mainPrompt')

mainPrompt.addEventListener('input', () => {
    document.getElementById('mainPromptCount').textContent =
        `${mainPrompt.value.length} / 160`
})

//  Chips 
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        mainPrompt.value = chip.dataset.fill
        mainPrompt.dispatchEvent(new Event('input'))
    })
})

//  Generate Campaign 
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

        if (result.usage) {
            updateUsageDisplay(result.usage.used, result.usage.limit)
        }

    } catch (err) {
        showError(err.message || 'Failed to generate campaign. Please try again.')
        console.error(err)
    } finally {
        setGenerating(false)
    }
})

//  Call Gemini API via Edge Function 
async function callGeminiAPI(prompt, product, store) {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        throw new Error('Your session has expired. Please log in again.')
    }

    //  Fetch first 
    const response = await fetch(
        `https://dkvhlfigmyzekmnwzhil.supabase.co/functions/v1/generate-campaign`,
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

    //  Parse response then handle errors 
    const data = await response.json()

    if (!response.ok) {
        if (data.code === 'LIMIT_REACHED') {
            throw new Error(
                `You've used all ${DAILY_LIMIT} free campaigns for today. Come back tomorrow for more! 🙌`
            )
        }
        if (data.code === 'API_QUOTA' || data.code === 'UNKNOWN') {
            throw new Error(
                `Our AI is a bit busy right now. Please try again in a moment.`
            )
        }
        if (data.code === 'NO_AUTH' || data.code === 'INVALID_AUTH') {
            throw new Error(
                `Your session has expired. Please log in again.`
            )
        }
        throw new Error(data.error || 'Something went wrong. Please try again.')
    }

    return data
}

//  Render Results 
function renderResults(result, prompt) {
    generatedCaption = result.caption || ''
    generatedHashtags = result.hashtags || []
    selectedHashtags = new Set()

    document.getElementById('flyerTitle').textContent = result.flyer_headline || ''
    document.querySelector('.flyer-canvas .sub').textContent = result.flyer_subtext || ''

    applyFlyerVisualStyle(prompt)
    updateFlyerPreview()

    document.getElementById('flyerEmpty').style.display = 'none'
    document.getElementById('flyerCanvas').classList.add('filled')

    document.getElementById('captionPlaceholder').style.display = 'none'
    const captionBox = document.getElementById('captionBox')
    captionBox.textContent = generatedCaption
    captionBox.style.display = 'block'

    document.getElementById('hashtagPlaceholder').style.display = 'none'
    renderHashtags(generatedHashtags)

    enableButtons()
    showTemplateIndicator(currentTemplate)
    showOutputActions()
}

//  Update Flyer Preview 
function updateFlyerPreview() {
    const name = store?.store_name || 'My Store'
    const flyerCanvas = document.getElementById('flyerCanvas')

    document.getElementById('flyerBrandName').textContent = name

    const flyerLink = document.querySelector('.flyer-canvas .flyer-link')
    if (flyerLink) flyerLink.textContent = storeUrl

    const storeLinkEl = document.getElementById('flyerStoreLink')
    if (storeLinkEl) storeLinkEl.textContent = storeUrl

    const badge = document.querySelector('.flyer-canvas .badge')
    if (badge) {
        if (store?.logo_url) {
            badge.innerHTML = `<img src="${store.logo_url}" alt="${name}"
        style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        } else {
            badge.textContent = name.substring(0, 2).toUpperCase()
        }
    }

    const bgImg = document.getElementById('flyerBg')
    if (selectedProduct?.image_url) {
        bgImg.src = selectedProduct.image_url
        bgImg.style.display = 'block'
        flyerCanvas.classList.add('has-image')
    } else {
        bgImg.style.display = 'none'
        flyerCanvas.classList.remove('has-image')
    }

    const pricePill = document.getElementById('flyerPrice')
    if (pricePill) {
        if (selectedProduct) {
            pricePill.textContent = formatPrice(selectedProduct.price)
            pricePill.style.display = 'inline-flex'
        } else {
            pricePill.style.display = 'none'
        }
    }
}

//  Template Engine 
const FLYER_TEMPLATES = [
    { id: 'luxury-fashion', name: 'Luxury Fashion', class: 'template-luxury-fashion', defaultBadge: 'NEW IN', tagline: 'Premium Collection' },
    { id: 'naija-market', name: 'Naija Market', class: 'template-naija-market', defaultBadge: 'HOT DEAL', tagline: 'Shop Direct · No Middleman' },
    { id: 'clean-minimal', name: 'Clean Minimal', class: 'template-clean-minimal', defaultBadge: 'NEW', tagline: 'Quality You Can Trust' },
    { id: 'beauty', name: 'Beauty & Glow', class: 'template-beauty', defaultBadge: 'GLOW UP', tagline: 'Feel Beautiful Every Day' },
    { id: 'streetwear', name: 'Streetwear Hype', class: 'template-streetwear', defaultBadge: 'DROP', tagline: 'Limited Edition' },
    { id: 'food', name: 'Food & Eats', class: 'template-food', defaultBadge: 'FRESH', tagline: 'Made with Love · Order Now' },
    { id: 'tech-purple', name: 'Tech & Gadgets', class: 'template-tech-purple', defaultBadge: 'LATEST', tagline: 'Powered by Innovation' },
    { id: 'emerald', name: 'Fresh & Natural', class: 'template-emerald', defaultBadge: 'FRESH', tagline: 'Pure Quality · Fast Delivery' },
]

const ALL_TEMPLATE_CLASSES = FLYER_TEMPLATES.map(t => t.class)

function applyFlyerVisualStyle(prompt) {
    const canvas = document.getElementById('flyerCanvas')
    const template = FLYER_TEMPLATES[ Math.floor(Math.random() * FLYER_TEMPLATES.length) ]
    currentTemplate = template

    canvas.classList.remove(...ALL_TEMPLATE_CLASSES)
    canvas.classList.add(template.class)

    const taglineEl = canvas.querySelector('.tagline')
    if (taglineEl) taglineEl.textContent = template.tagline

    const badgeEl = document.getElementById('flyerBadge')
    if (badgeEl) badgeEl.textContent = getSmartBadge(prompt, template)
}

function getSmartBadge(prompt, template) {
    const text = `${prompt || ''} ${selectedProduct?.name || ''}`.toLowerCase()
    const badgeMap = [
        { regex: /new|just arrived|fresh|launch|brand new|just in/i, label: 'NEW IN' },
        { regex: /limited|limited stock|only few|last chance/i, label: 'LIMITED' },
        { regex: /sale|discount|flash sale|price drop|off/i, label: 'SALE' },
        { regex: /trending|viral|hot|everyone/i, label: 'TRENDING' },
        { regex: /restock|back in stock|returned/i, label: 'RESTOCKED' },
        { regex: /best seller|selling fast|popular|must have/i, label: 'BEST SELLER' },
        { regex: /food|eat|meal|snack|drink|juice/i, label: 'FRESH' },
        { regex: /beauty|skin|glow|cream|hair/i, label: 'GLOW UP' },
        { regex: /tech|phone|gadget|device|electronic/i, label: 'LATEST' },
    ]
    const match = badgeMap.find(b => b.regex.test(text))
    return match ? match.label : template.defaultBadge
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
    const ca = document.getElementById('captionActions')
    const ha = document.getElementById('hashtagActions')
    if (ca) ca.style.display = 'flex'
    if (ha) ha.style.display = 'flex'
}

document.getElementById('reshuffleBtn')?.addEventListener('click', () => {
    applyFlyerVisualStyle(mainPrompt.value.trim())
    updateFlyerPreview()
    showTemplateIndicator(currentTemplate)
})

//  Render Hashtags 
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

//  Enable Buttons 
function enableButtons() {
    ;[ 'refineFlyerBtn', 'refineCaptionBtn', 'refineHashtagsBtn',
        'downloadFlyerBtn', 'shareFlyerBtn', 'copyCaptionBtn',
        'sendCaptionBtn', 'copyHashtagsBtn'
    ].forEach(id => {
        const el = document.getElementById(id)
        if (el) el.disabled = false
    })
}

//  Download Flyer 
document.getElementById('downloadFlyerBtn').addEventListener('click', async () => {
    const btn = document.getElementById('downloadFlyerBtn')
    btn.disabled = true
    btn.textContent = 'Preparing...'

    try {
        if (!window.html2canvas) {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
        }

        const canvas = await window.html2canvas(document.getElementById('flyerCanvas'), {
            scale: 2, useCORS: true, allowTaint: true, backgroundColor: null,
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

//  Share / Copy / Send 
document.getElementById('shareFlyerBtn').addEventListener('click', () => {
    const message = encodeURIComponent(`${store?.store_name || 'My Store'}\n\nCheck out our store: ${storeUrl}`)
    const phone = store?.whatsapp?.replace(/[^0-9]/g, '') || ''
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
})

document.getElementById('copyCaptionBtn').addEventListener('click', async () => {
    if (!generatedCaption) return
    await copyToClipboard(generatedCaption)
    showToast('Caption copied ✓')
})

document.getElementById('sendCaptionBtn').addEventListener('click', () => {
    if (!generatedCaption) return
    const phone = store?.whatsapp?.replace(/[^0-9]/g, '') || ''
    const message = encodeURIComponent(generatedCaption)
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
})

document.getElementById('copyHashtagsBtn').addEventListener('click', async () => {
    const tags = selectedHashtags.size > 0
        ? Array.from(selectedHashtags).join(' ')
        : generatedHashtags.join(' ')
    if (!tags) return
    await copyToClipboard(tags)
    showToast(`${selectedHashtags.size > 0 ? 'Selected' : 'All'} hashtags copied ✓`)
})

//  Refine Buttons 
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

//  Helpers 
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