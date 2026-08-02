
/* ============================================================
   BACKEND CONFIG — point at your existing backend
   ============================================================ */
const API_BASE = "/api/marketing";

const ENDPOINTS = {
    flyer: `${API_BASE}/flyer`,     // POST -> { imageUrl }
    caption: `${API_BASE}/caption`,   // POST -> { caption }
    hashtags: `${API_BASE}/hashtags`,  // POST -> { hashtags: string[] }
    campaign: `${API_BASE}/campaign`,  // POST -> { imageUrl, caption, hashtags: string[] }
};

// Product context is optional. null until the seller adds one.
let currentProduct = null;

const STORE = {
    slug: "urbanthreadz",
    name: "Urban Threadz",
    whatsappNumber: "2348012345678" // seller's WhatsApp number, digits only, no +
};

let selectedHashtags = new Set();
let hasFlyer = false;

function showError(msg) {
    const el = document.getElementById("errorMsg");
    el.textContent = msg;
    el.style.display = "block";
}
function hideError() { document.getElementById("errorMsg").style.display = "none"; }

async function callBackend(url, payload) {
    hideError();
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Couldn't generate that (${res.status}). ${text || "Try again."}`);
    }
    return res.json();
}

function whatsappLink(text) {
    return `https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

/* ---------- composer ---------- */
const mainPrompt = document.getElementById("mainPrompt");
const mainPromptCount = document.getElementById("mainPromptCount");
mainPrompt.addEventListener("input", () => {
    mainPromptCount.textContent = `${mainPrompt.value.length} / 160`;
});
document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
        mainPrompt.value = chip.dataset.fill;
        mainPrompt.dispatchEvent(new Event("input"));
    });
});

/* ============================================================
   PRODUCT CONTEXT — optional. Add / edit via an inline form;
   generation works fine with no product attached.
   ============================================================ */
const addProductBtn = document.getElementById("addProductBtn");
const productRow = document.getElementById("productRow");
const productForm = document.getElementById("productForm");
const productNameInput = document.getElementById("productNameInput");
const productPriceInput = document.getElementById("productPriceInput");
const productImagePicker = document.getElementById("productImagePicker");
const productImageInput = document.getElementById("productImageInput");
const productImagePreview = document.getElementById("productImagePreview");
const editProductBtn = document.getElementById("editProductBtn");
const cancelProductBtn = document.getElementById("cancelProductBtn");
const saveProductBtn = document.getElementById("saveProductBtn");

// Holds the image for whatever's currently in the form (persists across
// cancel only via currentProduct; cleared/reset each time the form opens).
let draftImageUrl = null;

function setDraftImage(src) {
    draftImageUrl = src;
    productImagePreview.src = src || "";
    productImagePicker.classList.toggle("has-image", !!src);
}

productImagePicker.addEventListener("click", () => productImageInput.click());
productImageInput.addEventListener("change", () => {
    const file = productImageInput.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showError("Image is larger than 5MB — try a smaller file.");
        return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraftImage(reader.result);
    reader.readAsDataURL(file);
});

function openProductForm() {
    addProductBtn.style.display = "none";
    productRow.style.display = "none";
    productForm.classList.add("open");
    productNameInput.value = currentProduct ? currentProduct.name : "";
    productPriceInput.value = currentProduct ? currentProduct.price : "";
    setDraftImage(currentProduct ? currentProduct.imageUrl : null);
    productNameInput.focus();
}
function closeProductForm() {
    productForm.classList.remove("open");
    renderProductState();
}
function renderProductState() {
    if (currentProduct) {
        addProductBtn.style.display = "none";
        productRow.style.display = "flex";
        document.getElementById("productName").textContent = currentProduct.name;
        document.getElementById("productPrice").textContent = currentProduct.price || "";
        const img = document.getElementById("productImg");
        img.style.display = currentProduct.imageUrl ? "block" : "none";
        img.src = currentProduct.imageUrl || "";
    } else {
        addProductBtn.style.display = "flex";
        productRow.style.display = "none";
    }
}

addProductBtn.addEventListener("click", openProductForm);
editProductBtn.addEventListener("click", openProductForm);
cancelProductBtn.addEventListener("click", closeProductForm);
saveProductBtn.addEventListener("click", () => {
    const name = productNameInput.value.trim();
    const price = productPriceInput.value.trim();
    if (!name) {
        showError("Give the product a name before saving.");
        return;
    }
    currentProduct = {
        id: currentProduct?.id || `prod_${Date.now()}`,
        name,
        price,
        imageUrl: draftImageUrl || null
    };
    productForm.classList.remove("open");
    renderProductState();
});

renderProductState();

/* ============================================================
   FLYER — AI-generated only. Starts empty; fills in once
   ENDPOINTS.flyer or ENDPOINTS.campaign returns an imageUrl.
   ============================================================ */
const flyerEmpty = document.getElementById("flyerEmpty");
const flyerCanvas = document.getElementById("flyerCanvas");
const flyerBg = document.getElementById("flyerBg");
const flyerTitle = document.getElementById("flyerTitle");
const flyerPrice = document.getElementById("flyerPrice");
const flyerBrandName = document.getElementById("flyerBrandName");
const refineFlyerBtn = document.getElementById("refineFlyerBtn");
const downloadFlyerBtn = document.getElementById("downloadFlyerBtn");
const shareFlyerBtn = document.getElementById("shareFlyerBtn");

flyerBrandName.textContent = STORE.name;

function setFlyerImage(src) {
    flyerBg.src = src;
    flyerTitle.innerHTML = (currentProduct?.name || "").replace(/\s+/g, "<br>") || "Your product";
    flyerPrice.textContent = currentProduct?.price || "";
    flyerPrice.style.display = currentProduct?.price ? "inline-block" : "none";
    flyerEmpty.style.display = "none";
    flyerCanvas.classList.add("filled");
    hasFlyer = true;
    refineFlyerBtn.disabled = false;
    downloadFlyerBtn.disabled = false;
    shareFlyerBtn.disabled = false;
}

async function generateFlyer(promptText) {
    const stage = document.querySelector(".flyer-stage");
    const original = stage.innerHTML;
    stage.innerHTML = `<div class="spinner"></div>`;
    refineFlyerBtn.disabled = true;
    try {
        const data = await callBackend(ENDPOINTS.flyer, {
            productId: currentProduct?.id || null,
            productName: currentProduct?.name || null,
            price: currentProduct?.price || null,
            productImage: currentProduct?.imageUrl || null,
            storeName: STORE.name,
            storeSlug: STORE.slug,
            prompt: promptText || "Clean product flyer, premium quality look"
        });
        stage.innerHTML = original;
        setFlyerImage(data.imageUrl);
    } catch (err) {
        stage.innerHTML = original;
        showError(err.message);
    } finally {
        refineFlyerBtn.disabled = !hasFlyer;
    }
}
refineFlyerBtn.addEventListener("click", () => generateFlyer(mainPrompt.value.trim()));

downloadFlyerBtn.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = flyerBg.src;
    a.download = `${STORE.slug}-flyer.png`;
    a.click();
});

shareFlyerBtn.addEventListener("click", async () => {
    if (navigator.share && navigator.canShare) {
        try {
            const res = await fetch(flyerBg.src);
            const blob = await res.blob();
            const file = new File([blob], "flyer.png", { type: blob.type });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: currentProduct?.name || "Flyer" });
                return;
            }
        } catch (e) { /* fall through to link-based share */ }
    }
    const label = currentProduct
        ? `Check out ${currentProduct.name}${currentProduct.price ? " — " + currentProduct.price : ""}`
        : "Check out our latest post";
    window.open(whatsappLink(label), "_blank");
});

/* ============================================================
   CAPTION — starts empty until generated
   ============================================================ */
const captionPlaceholder = document.getElementById("captionPlaceholder");
const captionBox = document.getElementById("captionBox");
const refineCaptionBtn = document.getElementById("refineCaptionBtn");
const copyCaptionBtn = document.getElementById("copyCaptionBtn");
const sendCaptionBtn = document.getElementById("sendCaptionBtn");

function setCaption(text) {
    captionBox.textContent = text;
    captionPlaceholder.style.display = "none";
    captionBox.style.display = "block";
    refineCaptionBtn.disabled = false;
    copyCaptionBtn.disabled = false;
    sendCaptionBtn.disabled = false;
}

async function generateCaption(promptText) {
    const hadCaption = captionBox.style.display === "block";
    const original = captionBox.textContent;
    if (hadCaption) captionBox.textContent = "Writing…";
    refineCaptionBtn.disabled = true;
    try {
        const data = await callBackend(ENDPOINTS.caption, {
            productId: currentProduct?.id || null,
            productName: currentProduct?.name || null,
            price: currentProduct?.price || null,
            productImage: currentProduct?.imageUrl || null,
            storeSlug: STORE.slug,
            prompt: promptText || "Short, friendly promotional caption"
        });
        setCaption(data.caption);
    } catch (err) {
        if (hadCaption) captionBox.textContent = original;
        showError(err.message);
    } finally {
        refineCaptionBtn.disabled = false;
    }
}
refineCaptionBtn.addEventListener("click", () => generateCaption(mainPrompt.value.trim()));

copyCaptionBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(captionBox.textContent.trim());
});
sendCaptionBtn.addEventListener("click", () => {
    window.open(whatsappLink(captionBox.textContent.trim()), "_blank");
});

/* ============================================================
   HASHTAGS — starts empty until generated
   ============================================================ */
const hashtagPlaceholder = document.getElementById("hashtagPlaceholder");
const hashtagGrid = document.getElementById("hashtagGrid");
const refineHashtagsBtn = document.getElementById("refineHashtagsBtn");
const copyHashtagsBtn = document.getElementById("copyHashtagsBtn");
const selectedCountEl = document.getElementById("selectedCount");

function renderHashtags(tags, preselectFirstN = 0) {
    hashtagGrid.innerHTML = "";
    selectedHashtags.clear();
    tags.forEach((tag, i) => {
        const chip = document.createElement("button");
        chip.className = "hashtag-chip";
        chip.innerHTML = `#${tag.replace(/^#/, "")} <span class="check">✓</span>`;
        if (i < preselectFirstN) { chip.classList.add("selected"); selectedHashtags.add(tag); }
        chip.addEventListener("click", () => {
            chip.classList.toggle("selected");
            if (chip.classList.contains("selected")) selectedHashtags.add(tag);
            else selectedHashtags.delete(tag);
            selectedCountEl.textContent = selectedHashtags.size;
        });
        hashtagGrid.appendChild(chip);
    });
    selectedCountEl.textContent = selectedHashtags.size;
    hashtagPlaceholder.style.display = "none";
    hashtagGrid.style.display = "flex";
    refineHashtagsBtn.disabled = false;
    copyHashtagsBtn.disabled = false;
}

async function generateHashtags(promptText) {
    const hadTags = hashtagGrid.style.display === "flex";
    refineHashtagsBtn.disabled = true;
    const prevHTML = hashtagGrid.innerHTML;
    if (hadTags) hashtagGrid.innerHTML = `<div class="spinner"></div>`;
    try {
        const data = await callBackend(ENDPOINTS.hashtags, {
            productId: currentProduct?.id || null,
            productName: currentProduct?.name || null,
            productImage: currentProduct?.imageUrl || null,
            storeSlug: STORE.slug,
            prompt: promptText || "Trending hashtags for this product"
        });
        renderHashtags(data.hashtags, Math.min(4, data.hashtags.length));
    } catch (err) {
        if (hadTags) hashtagGrid.innerHTML = prevHTML;
        showError(err.message);
    } finally {
        refineHashtagsBtn.disabled = false;
    }
}
refineHashtagsBtn.addEventListener("click", () => generateHashtags(mainPrompt.value.trim()));

copyHashtagsBtn.addEventListener("click", () => {
    const text = [...selectedHashtags].map(t => `#${t.replace(/^#/, "")}`).join(" ");
    navigator.clipboard.writeText(text);
});

/* ============================================================
   GENERATE CAMPAIGN — the primary action, fills all three cards
   ============================================================ */
const generateCampaignBtn = document.getElementById("generateCampaignBtn");
generateCampaignBtn.addEventListener("click", async () => {
    const promptText = mainPrompt.value.trim();
    if (!promptText) {
        showError("Tell us what you're promoting first.");
        return;
    }
    generateCampaignBtn.disabled = true;
    generateCampaignBtn.textContent = "Generating…";
    hideError();

    try {
        const data = await callBackend(ENDPOINTS.campaign, {
            productId: currentProduct?.id || null,
            productName: currentProduct?.name || null,
            price: currentProduct?.price || null,
            productImage: currentProduct?.imageUrl || null,
            storeSlug: STORE.slug,
            storeName: STORE.name,
            prompt: promptText
        });
        if (data.imageUrl) setFlyerImage(data.imageUrl);
        if (data.caption) setCaption(data.caption);
        if (data.hashtags) renderHashtags(data.hashtags, Math.min(4, data.hashtags.length));
        document.getElementById("lastGeneratedNote").textContent = "Generated just now";
    } catch (err) {
        showError(err.message);
    } finally {
        generateCampaignBtn.disabled = false;
        generateCampaignBtn.textContent = "✦ Generate campaign";
    }
});
