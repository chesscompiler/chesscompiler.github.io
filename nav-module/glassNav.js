/**
 * @file glassNav.js
 * @description A modular glass-effect navigation bar for modern web applications.
 * Provides a customizable, responsive navigation with glassmorphism styling.
 * 
 * Basic Usage:
 * ```javascript
 * import { injectGlassNav } from './nav-module/glassNav.js';
 * injectGlassNav();
 * ```
 * 
 * Advanced Usage with Custom Options:
 * ```javascript
 * injectGlassNav({
 *   // Custom navigation links
 *   navLinks: [
 *     { href: '/home', label: 'Home' },
 *     { href: '/about', label: 'About' },
 *     { href: '/contact', label: 'Contact', cta: true } // cta: true for call-to-action styling
 *   ],
 *   // Custom branding
 *   logoText: 'Your Brand',
 *   logoImg: '/path/to/logo.png',
 *   logoImgAlt: 'Your Brand Logo',
 *   logoImgWidth: 40,
 *   logoImgHeight: 40,
 *   // Custom placement
 *   target: document.querySelector('#custom-container'),
 *   position: 'top'  // or any other position
 * });
 * ```
 * 
 * Features:
 * - 🎨 Glass effect styling with blur and transparency
 * - 📱 Fully responsive with mobile menu
 * - ⚡ Smooth animations and transitions
 * - 🎯 Call-to-action button support
 * - 🔧 Customizable logo and branding
 * - 🎪 Custom positioning and target element
 * 
 * @param {Object} options - Configuration options for the navigation
 * @param {HTMLElement} [options.target=document.body] - Target element to inject the nav into
 * @param {string} [options.position='top'] - Position of the nav ('top' or other)
 * @param {Array<{href: string, label: string, cta?: boolean}>} [options.navLinks] - Navigation links
 * @param {string} [options.logoText='Chess Compiler'] - Text for the logo
 * @param {string} [options.logoImg='/log/android-chrome-192x192.png'] - Path to logo image
 * @param {string} [options.logoImgAlt='Chess Compiler Logo'] - Alt text for logo image
 * @param {number} [options.logoImgWidth=32] - Width of the logo image
 * @param {number} [options.logoImgHeight=32] - Height of the logo image
 */

export function injectGlassNav({
    target = document.body,
    position = 'top',
    navLinks = [
        { href: '/learn', label: 'Learn' },
        { href: '/board', label: 'Board' },
        { href: '/videos', label: 'Videos' },
        { href: '#cp5', label: 'About' },
        { href: '#cp4', label: 'Get Started', cta: true }
    ],
    logoText = 'Chess Compiler',
    logoImg = '/log/android-chrome-192x192.png',
    logoImgAlt = 'Chess Compiler Logo',
    logoImgWidth = 32,
    logoImgHeight = 32
} = {}) {
    // 1. Inject styles (idempotent)
    if (!document.getElementById('glass-nav-styles')) {
        const style = document.createElement('style');
        style.id = 'glass-nav-styles';
        style.textContent = `
:root {
    --blue1: #48e3fb;
    --blue2: #00b6ff;
    --purple1: #643efe;
    --text-main: #ffffff;
    --btn-primary: linear-gradient(135deg, var(--blue2), var(--purple1));
}
.glass-nav {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    background: rgba(255,255,255,0.08);
    border-radius: 100px;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 90%;
    max-width: 1200px;
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 8px 32px 0 rgba(31,38,135,0.13);
    background-clip: padding-box;
    overflow: hidden;
    opacity: 0;
    transform: translate(-50%, -30px) scale(0.98);
    animation: glassNavSlideIn 1.2s cubic-bezier(0.22,1,0.36,1) 0.2s forwards;
    transition: opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1), border-radius 0.5s cubic-bezier(0.22,1,0.36,1);
}
.glass-nav.menu-open {
    border-radius: 32px;
    box-shadow: 0 16px 48px 0 rgba(31,38,135,0.18);
    background: rgba(255,255,255,0.16);
    transition: border-radius 0.5s cubic-bezier(0.22,1,0.36,1), background 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s cubic-bezier(0.22,1,0.36,1);
}
@keyframes glassNavSlideIn {
    from { opacity: 0; transform: translate(-50%, -30px) scale(0.98); }
    60% { opacity: 1; transform: translate(-50%, 6px) scale(1.01); }
    80% { opacity: 1; transform: translate(-50%, -2px) scale(1.005); }
    to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
.glass-nav .logo-container {
    display: flex;
    align-items: center;
    gap: 8px;
}
.glass-nav .logo {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
    background: linear-gradient(to right, var(--blue1), var(--purple1));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-fill-color: transparent;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    position: relative;
}
.glass-nav nav {
    display: flex;
    gap: 2rem;
    align-items: center;
    transition: max-height 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.4s cubic-bezier(0.22,1,0.36,1);
}
.glass-nav nav a {
    color: var(--text-main);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.4s ease-out, transform 0.3s cubic-bezier(0.22,1,0.36,1);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 32px;
    padding: 0.4em 1.2em;
    background: transparent;
    box-shadow: none;
    position: relative;
    overflow: hidden;
    z-index: 1;
}
.glass-nav nav a::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 32px;
    background: linear-gradient(135deg, rgba(100, 62, 254, 0.25), rgba(72, 227, 251, 0.15));
    z-index: -1;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.glass-nav nav a:hover, .glass-nav nav a:focus {
    color: #ffffff;
    transform: translateY(-2px);
}
.glass-nav nav a:hover::before, .glass-nav nav a:focus::before {
    transform: scaleX(1);
}
.glass-nav .nav-cta {
    background: var(--btn-primary);
    color: var(--text-main) !important;
    font-weight: 700;
    box-shadow: 0 2px 12px 0 rgba(72,227,251,0.18);
    transition: background 0.3s, color 0.3s, box-shadow 0.3s, transform 0.2s;
}
.glass-nav .nav-cta:hover, .glass-nav .nav-cta:focus {
    background: linear-gradient(135deg, var(--purple1), var(--blue1));
    color: #fff !important;
    box-shadow: 0 6px 24px 0 rgba(100,62,254,0.18);
    transform: translateY(-2px) scale(1.06);
}
.menu-btn {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: background 0.2s, transform 0.4s cubic-bezier(0.22,1,0.36,1);
    z-index: 102;
    position: relative;
    outline: none;
}
.menu-btn svg {
    width: 32px;
    height: 32px;
    display: block;
}

.menu-line {
    transition: transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
    transform-origin: center;
}

.menu-btn.open .menu-line-1 {
    transform: translate(0, 6px) rotate(45deg);
}

.menu-btn.open .menu-line-2 {
    opacity: 0;
}

.menu-btn.open .menu-line-3 {
    transform: translate(0, -6px) rotate(-45deg);
}
.menu-btn:active {
    background: rgba(72,227,251,0.13);
    transform: scale(1.08);
}
@media (max-width: 768px) {
    .glass-nav { flex-direction: row; gap: 0; padding: 0.7rem 1rem; width: 90%; max-width: 100vw; }
    .glass-nav.menu-open { flex-direction: column; gap: 1rem; border-radius: 20px; padding: 1rem; }
    .glass-nav .logo { font-size: 1.2rem; }
    .menu-btn { display: block; margin-left: auto; margin-right: 0; }
    .glass-nav nav { position: static; width: 100%; background: none; border: none; box-shadow: none; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; gap: 1.2rem; opacity: 1; pointer-events: auto; transform: none; transition: none; padding: 0; max-height: 0; overflow: hidden; opacity: 0; }
    .glass-nav.menu-open nav { max-height: 500px; opacity: 1; transition: max-height 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.4s cubic-bezier(0.22,1,0.36,1); }
    .glass-nav nav a { font-size: 1.2rem; padding: 0.7rem 2rem; border-radius: 100px; background: none; color: var(--text-main); text-align: center; transition: background 0.2s; }
    .glass-nav nav .nav-cta { background: var(--btn-primary); color: var(--text-main) !important; }
    .glass-nav nav:not(.open) { display: none; }
}
`;
        document.head.appendChild(style);
    }
    // 2. Inject menu and close icons if not present
    if (!document.getElementById('glass-nav-menu-svg')) {
        const svg = document.createElement('div');
        svg.id = 'glass-nav-menu-svg';
        svg.style.display = 'none';
        svg.innerHTML = `
            <svg class="menu-icon" xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32' fill='none'>
                <rect x='6' y='9' width='20' height='2.5' rx='1.25' fill='#fff' class="menu-line menu-line-1"/>
                <rect x='6' y='15' width='20' height='2.5' rx='1.25' fill='#fff' class="menu-line menu-line-2"/>
                <rect x='6' y='21' width='20' height='2.5' rx='1.25' fill='#fff' class="menu-line menu-line-3"/>
            </svg>`;
        document.body.appendChild(svg);
    }
    // 3. Build nav HTML
    const nav = document.createElement('header');
    nav.className = 'glass-nav';
    nav.innerHTML = `
        <a href="/" class="logo-container" style="text-decoration: none;">
            <img src="${logoImg}" alt="${logoImgAlt}" width="${logoImgWidth}" height="${logoImgHeight}" style="user-select: none; -webkit-user-select: none; pointer-events: none;" draggable="false">
            <div class="logo">${logoText}</div>
        </a>
        <button id="menu-toggle" class="menu-btn" aria-label="Toggle menu">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="6" y="9" width="20" height="2.5" rx="1.25" fill="#fff" class="menu-line menu-line-1"/>
                <rect x="6" y="15" width="20" height="2.5" rx="1.25" fill="#fff" class="menu-line menu-line-2"/>
                <rect x="6" y="21" width="20" height="2.5" rx="1.25" fill="#fff" class="menu-line menu-line-3"/>
            </svg>
        </button>
        <nav id="main-nav">
            ${navLinks.map(l => `<a href="${l.href}"${l.cta ? ' class="nav-cta"' : ''}>${l.label}</a>`).join('')}
        </nav>
    `;
    // 4. Insert nav
    if (position === 'top') {
        target.insertBefore(nav, target.firstChild);
    } else {
        target.appendChild(nav);
    }
    // 5. Mobile menu toggle with animation
    const menuBtn = nav.querySelector('#menu-toggle');
    const mainNav = nav.querySelector('#main-nav');
    menuBtn.addEventListener('click', () => {
        nav.classList.toggle('menu-open');
        menuBtn.classList.toggle('open');
        if (mainNav.classList.contains('open')) {
            mainNav.classList.remove('open');
        } else {
            mainNav.classList.add('open');
        }
    });
}
