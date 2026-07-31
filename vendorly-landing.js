const header = document.getElementById('site-header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 8));
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
hamburger.addEventListener('click', () => {
const open = navLinks.style.display === 'flex';
    navLinks.style.display = open ? 'none' : 'flex';
    navLinks.style.cssText += open ? '' : 'position:absolute;top:76px;left:0;right:0;background:var(--cream);flex-direction:column;padding:20px 32px;gap:18px;border-bottom:1px solid var(--line);';
});