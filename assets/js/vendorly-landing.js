// ==========================================
// HEADER SCROLL EFFECT
// ==========================================

const header = document.getElementById('site-header');

const updateHeaderScrolled = () => {
    if (header) {
        header.classList.toggle('scrolled', window.scrollY > 8);
    }
};

updateHeaderScrolled();
window.addEventListener('scroll', updateHeaderScrolled);


// ==========================================
// MOBILE DROPDOWN MENU
// ==========================================

const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {

    // Scroll-close is only "armed" a short moment after the menu
    // opens, and openScrollY is sampled at that later point too —
    // this skips the layout shift caused by the mobile browser's
    // toolbar collapsing as the dropdown expands, which otherwise
    // reads as a big, instant scroll and closes the menu right away.
    let openScrollY = 0;
    let scrollCloseArmed = false;
    let armTimer = null;

    // Open / close the mobile menu
    const setMenuState = (isOpen) => {
        navLinks.classList.toggle('mobile-open', isOpen);

        hamburger.setAttribute(
            'aria-expanded',
            String(isOpen)
        );

        clearTimeout(armTimer);
        scrollCloseArmed = false;

        if (isOpen) {
            armTimer = setTimeout(() => {
                openScrollY = window.scrollY;
                scrollCloseArmed = true;
            }, 350);
        }
    };


    // ==========================================
    // HAMBURGER BUTTON
    // ==========================================

    hamburger.addEventListener('click', (event) => {
        event.stopPropagation();

        const isOpen =
            !navLinks.classList.contains('mobile-open');

        setMenuState(isOpen);
    });


    // ==========================================
    // CLOSE WHEN A MENU LINK IS CLICKED
    // ==========================================

    navLinks.addEventListener('click', (event) => {

        const link = event.target.closest('a');

        if (link) {
            setMenuState(false);
        }

    });


    // ==========================================
    // CLOSE WHEN CLICKING OUTSIDE THE MENU
    // ==========================================

    document.addEventListener('click', (event) => {

        if (!navLinks.classList.contains('mobile-open')) {
            return;
        }

        const clickedInsideMenu =
            event.target.closest('.nav-links');

        const clickedHamburger =
            event.target.closest('.hamburger');

        if (!clickedInsideMenu && !clickedHamburger) {
            setMenuState(false);
        }

    });


    // ==========================================
    // CLOSE MENU ON SCROLL
    // Only closes once the page has actually moved a
    // meaningful distance from where the menu was opened —
    // avoids false triggers from toolbar-collapse jitter.
    // ==========================================

    window.addEventListener('scroll', () => {
        if (
            scrollCloseArmed &&
            navLinks.classList.contains('mobile-open') &&
            Math.abs(window.scrollY - openScrollY) > 10
        ) {
            setMenuState(false);
        }
    });


    // ==========================================
    // CLOSE MENU WHEN RESIZING TO DESKTOP
    // ==========================================

    window.addEventListener('resize', () => {

        if (window.innerWidth > 960) {
            setMenuState(false);
        }

    });

}


// ==========================================
// SCROLL ANIMATIONS
// ==========================================

const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
};


const observer = new IntersectionObserver(
    (entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }

        });

    },
    observerOptions
);


// Elements that should animate into view
document
    .querySelectorAll(
        '.section-head, .how-step, .feature-card, .usecase-card, .faq-item'
    )
    .forEach((element) => {

        element.classList.add('scroll-animate');

        observer.observe(element);

    });