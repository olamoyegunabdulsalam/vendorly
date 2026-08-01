import { requireAuth } from './auth.js'
import { supabase } from './supabase.js'  
import { renderBottomNav } from '../components/bottomNav.js'

const user = await requireAuth()

renderBottomNav('settings') 


// ---- Logo / banner upload: click or keyboard to open picker, preview on select ----
function wireUpload(boxId, inputId, uploadLabel) {
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);

    box.addEventListener('click', (e) => {
        if (e.target.closest('.up-remove')) return; // remove button handles its own click
        input.click();
    });
    box.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });

    input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please choose an image file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            let img = box.querySelector('.up-preview');
            if (!img) {
                img = document.createElement('img');
                img.className = 'up-preview';
                box.prepend(img);
            }
            img.src = reader.result;
            box.classList.add('has-image');

            let overlay = box.querySelector('.up-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'up-overlay';
                overlay.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><rect x="3" y="16" width="18" height="5" rx="2"/></svg>
            <span style="font-size:0.72rem;font-weight:600;">Change ${uploadLabel}</span>`;
                box.appendChild(overlay);
            }
        };
        reader.readAsDataURL(file);
    });

    box.querySelector('.up-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = '';
        box.classList.remove('has-image');
        const img = box.querySelector('.up-preview');
        if (img) img.remove();
    });
}

wireUpload('logo-box', 'logo-input', 'logo');
wireUpload('banner-box', 'banner-input', 'banner');

// ---- Save buttons: brief "Saved" confirmation state ----
document.querySelectorAll('[data-save]').forEach(btn => {
    const original = btn.innerHTML;
    btn.addEventListener('click', () => {
        btn.classList.add('saved');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg> Saved';
        setTimeout(() => { btn.classList.remove('saved'); btn.innerHTML = original; }, 1600);
    });
});

// ---- Theme color swatches ----
document.querySelectorAll('.swatch:not(.swatch-custom)').forEach(sw => {
    sw.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
    });
});

// ---- Copy store link ----
const copyBtn = document.getElementById('copy-link-btn');
const linkInput = document.getElementById('store-link');
copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(linkInput.value);
    } catch {
        linkInput.select();
        document.execCommand('copy');
    }
    const original = copyBtn.innerHTML;
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg> Copied';
    setTimeout(() => { copyBtn.innerHTML = original; }, 1600);
});

// ---- Password show/hide toggles ----
document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.toggle);
        input.type = input.type === 'password' ? 'text' : 'password';
    });
});

// ---- Simple password strength meter ----
const pwNew = document.getElementById('pw-new');
const strengthFill = document.getElementById('pw-strength-fill');
pwNew.addEventListener('input', () => {
    const val = pwNew.value;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const pct = (score / 4) * 100;
    const colors = ['#DC3545', '#E8A400', '#E8A400', '#1F8A53', '#1F8A53'];
    strengthFill.style.width = pct + '%';
    strengthFill.style.background = colors[score];
});
