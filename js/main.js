// ================================
// main.js — Shared across: home.html, about.html, contact.html
//
// CHANGES FROM ORIGINAL:
//  [FIX]  observer → observers bug fixed (line ~984 in original)
//  [PERF] 4 separate scroll listeners merged into 1 rAF-throttled handler
//  [PERF] 2 separate time-update intervals (updatePhilippinesTime +
//         updateCurrentTime) consolidated into 1 shared function
//  [PERF] Body opacity flash on load removed (conflicted with page loader)
//  [PERF] { passive: true } added to all scroll, mousemove, resize listeners
//  [PERF] Cursor rAF loop paused when cursor is inactive
//  [CLEAN] All commented-out dead code blocks removed
//  [CLEAN] Cursor code isolated at the top — ready to extract to cursor.js
//         (see AUDIT_REPORT.md §9 for extraction instructions)
// ================================

// ================================
// Custom Cursor Trail Effect
// NOTE: This entire section is identical in main.js, work.js, project-page.js
// Extract to a shared cursor.js and load it before each page script.
// See AUDIT_REPORT.md §9 for instructions.
// ================================

const cursorDot = document.getElementById('cursorDot');
const cursorOutline = document.getElementById('cursorOutline');
const trailContainer = document.getElementById('cursorTrailSvg');

const svgNS = "http://www.w3.org/2000/svg";

// [PERF] Skip all cursor logic on touch devices — saves mousemove/rAF work on mobile
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
    [cursorDot, cursorOutline, trailContainer].forEach(el => { if (el) el.style.display = 'none'; });
}

let mouseX = 0;
let mouseY = 0;
let outlineX = 0;
let outlineY = 0;
let lastX = 0;
let lastY = 0;

let trailPoints = [];
let currentTrailPath = null;
let isDrawing = false;
let drawingTimeout = null;

// Pause rAF when cursor is not active to avoid wasting cycles
let cursorRAFId = null;
let cursorActive = false;

// [PERF] Pencil rotation constant — kept here so CSS doesn't need to set transform
const PENCIL_ROTATION = -230;

function updateSVGViewBox() {
    if (!trailContainer) return;
    trailContainer.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
}

updateSVGViewBox();
window.addEventListener('resize', updateSVGViewBox, { passive: true });

if (!isTouchDevice) {
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    cursorDot?.classList.add('active');
    cursorOutline?.classList.add('active');
    trailContainer?.classList.add('active');

    const isHovering = cursorDot?.classList.contains('hover');

    if (!isDrawing) startNewTrail();

    if (isHovering) {
        addPointToTrail(mouseX, mouseY);
    } else {
        const deltaX = mouseX - lastX;
        const deltaY = mouseY - lastY;
        if ((deltaX * deltaX + deltaY * deltaY) > 0.01) {
            addPointToTrail(mouseX, mouseY);
        }
    }

    clearTimeout(drawingTimeout);
    if (!isHovering) {
        drawingTimeout = setTimeout(finishTrail, 50);
    }

    lastX = mouseX;
    lastY = mouseY;

    // Resume rAF if it was paused
    if (!cursorActive) {
        cursorActive = true;
        animateCursor();
    }
}, { passive: true });

document.addEventListener('mouseleave', () => {
    cursorDot?.classList.remove('active');
    cursorOutline?.classList.remove('active');
    trailContainer?.classList.remove('active');
    finishTrail();
    cursorActive = false;
});
} // end !isTouchDevice

function animateCursor() {
    if (!cursorActive) {
        cursorRAFId = null;
        return; // Stop the loop when cursor is inactive
    }

    // [PERF] Use transform instead of left/top — transform is compositor-only,
    //        left/top trigger layout reflow every frame causing cursor lag.
    if (cursorDot) {
        const scale = cursorDot.classList.contains('hover') ? 1.3 : 1;
        cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) scale(${scale})`;
    }

    if (cursorOutline) {
        outlineX += (mouseX - outlineX) * 0.2;
        outlineY += (mouseY - outlineY) * 0.2;
        // Combine translate + pencil rotation in one transform — no layout triggered
        cursorOutline.style.transform = `translate(${outlineX}px, ${outlineY}px) rotate(${PENCIL_ROTATION}deg)`;
    }

    cursorRAFId = requestAnimationFrame(animateCursor);
}

function startNewTrail() {
    if (!trailContainer) return;
    isDrawing = true;
    trailPoints = [[mouseX, mouseY]];
    currentTrailPath = document.createElementNS(svgNS, 'path');
    currentTrailPath.classList.add('cursor-trail-path');
    trailContainer.appendChild(currentTrailPath);
}

function addPointToTrail(x, y) {
    if (!isDrawing || !currentTrailPath) return;
    trailPoints.push([x, y]);
    if (trailPoints.length > 10) trailPoints.shift();
    currentTrailPath.setAttribute('d', createSmoothPath(trailPoints));
}

function createSmoothPath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length - 1; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        d += ` Q ${x1} ${y1}, ${cx} ${cy}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last[0]} ${last[1]}`;
    return d;
}

function finishTrail() {
    if (!isDrawing || !currentTrailPath) return;
    isDrawing = false;
    const pathToRemove = currentTrailPath;
    currentTrailPath = null;
    trailPoints = [];
    setTimeout(() => pathToRemove?.remove(), 1500);
}

document.addEventListener('mousedown', () => {
    for (let i = 0; i < 4; i++) {
        setTimeout(() => {
            const mark = document.createElement('div');
            mark.className = 'cursor-sketch';
            mark.style.left = (mouseX + (Math.random() - 0.5) * 15) + 'px';
            mark.style.top  = (mouseY + (Math.random() - 0.5) * 15) + 'px';
            mark.style.setProperty('--rotation', Math.random() * 360 + 'deg');
            document.body.appendChild(mark);
            setTimeout(() => mark.remove(), 500);
        }, i * 25);
    }
});

document.querySelectorAll(
    'a, button, .btn, .filter-chip, .project-card, .nav-link, .nav-cta, .pagination-number, .pagination-btn'
).forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursorDot?.classList.add('hover');
        cursorOutline?.classList.add('hover');
    });
    el.addEventListener('mouseleave', () => {
        cursorDot?.classList.remove('hover');
        cursorOutline?.classList.remove('hover');
    });
});

// ================================
// Navigation
// ================================
const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navMenu   = document.getElementById('navMenu');
const navLinks  = document.querySelectorAll('.nav-link');

navToggle?.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
});

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
    });
});

document.querySelector('.nav-cta')?.addEventListener('click', () => {
    navMenu.classList.remove('active');
    navToggle.classList.remove('active');
});

// ================================
// Smooth scrolling for anchor links
// ================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
            }
        }
    });
});

// ================================
// Active nav link — page-based detection
// ================================
function getCurrentPage() {
    return window.location.pathname.split('/').pop() || 'home.html';
}

function setActiveNavLink() {
    const currentPage = getCurrentPage();
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active',
            href === currentPage ||
            (currentPage === '' && href === 'home.html') ||
            (currentPage === '/' && href === 'home.html')
        );
    });
}

document.addEventListener('DOMContentLoaded', setActiveNavLink);

// ================================
// Unified rAF-throttled scroll handler
// Replaces 4 separate scroll listeners — PERF improvement
// ================================
const heroContent  = document.querySelector('.hero-content');
const backToTopBtn = document.getElementById('backToTop');
const sections     = document.querySelectorAll('section[id]');
const isHomePage   = ['home.html', '', '/'].includes(getCurrentPage());

let scrollPending = false;

function handleScroll() {
    const scrollY = window.pageYOffset;

    // 1. Navbar shadow
    navbar?.classList.toggle('scrolled', scrollY > 50);

    // 2. Back-to-top visibility
    backToTopBtn?.classList.toggle('show', scrollY > 300);

    // 3. Hero parallax (home page only, and only above the fold)
    if (heroContent && scrollY < window.innerHeight) {
        heroContent.style.transform = `translateY(${scrollY * 0.3}px)`;
        heroContent.style.opacity   = String(Math.max(0, 1 - scrollY / 500));
    }

    // 4. Section-based nav highlighting (home page only)
    if (isHomePage) {
        let currentSection = '';
        sections.forEach(section => {
            const top    = section.offsetTop - 150;
            const bottom = top + section.offsetHeight;
            if (scrollY >= top && scrollY < bottom) currentSection = section.id;
        });
        if (!currentSection && sections.length) {
            currentSection = sections[sections.length - 1].id;
        }
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                link.classList.toggle('active', href === `#${currentSection}`);
            }
        });
        // Keep Home link active on home page
        document.querySelector('.nav-link[href="home.html"]')?.classList.add('active');
    }
}

window.addEventListener('scroll', () => {
    if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(() => {
            handleScroll();
            scrollPending = false;
        });
    }
}, { passive: true });

// Back-to-top click
backToTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ================================
// Intersection Observer — fade-in animations
// ================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity   = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.project-card, .tech-item, .stat-item').forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

document.querySelectorAll('.process-step').forEach((step, index) => {
    step.style.opacity   = '0';
    step.style.transform = 'translateX(-30px)';
    step.style.transition = `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s`;
    observer.observe(step);
});

// ================================
// Contact card animations
// FIX: was using `observer` (wrong ref), now correctly uses `observers`
// ================================
const observersOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observers = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity   = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observersOptions);

document.querySelectorAll('.availability-card, .contact-methods-card, .social-card, .form-card').forEach(card => {
    card.style.opacity   = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observers.observe(card); // FIX: was `observer.observe(card)` — wrong reference
});

// ================================
// Proficiency bar animations
// ================================
const proficiencyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const fill = entry.target;
            fill.style.setProperty('--proficiency-width', fill.getAttribute('data-proficiency') + '%');
            fill.classList.add('animate');
            proficiencyObserver.unobserve(fill);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.proficiency-fill').forEach(bar => proficiencyObserver.observe(bar));

// ================================
// Project Filtering with Auto-Sort
// ================================
const filterChips   = document.querySelectorAll('.filter-chip');
const projectsGrid  = document.querySelector('.projects-grid');
const noResults     = document.getElementById('noResults');
let allProjects     = [];

document.addEventListener('DOMContentLoaded', () => {
    allProjects = Array.from(document.querySelectorAll('.project-card'));
});

window.addEventListener('load', () => {
    if (allProjects.length === 0) {
        allProjects = Array.from(document.querySelectorAll('.project-card'));
    }
    filterProjects('featured');
});

function sortProjectsByDate(projects) {
    return [...projects].sort((a, b) =>
        new Date(b.getAttribute('data-date')) - new Date(a.getAttribute('data-date'))
    );
}

function filterProjects(filter) {
    if (allProjects.length === 0) {
        allProjects = Array.from(document.querySelectorAll('.project-card'));
    }

    let projectsToShow = allProjects;
    if (filter === 'featured') {
        projectsToShow = allProjects.filter(c => c.getAttribute('data-featured') === 'true');
    } else if (filter !== 'all') {
        projectsToShow = allProjects.filter(c => c.getAttribute('data-category')?.includes(filter));
    }

    const recentProjects = sortProjectsByDate(projectsToShow).slice(0, 6);

    // Clean up all cards
    allProjects.forEach(card => {
        card.classList.remove('fade-in', 'fade-out', 'hidden');
        card.style.animationDelay = '';
        card.style.opacity = '';
        card.style.transform = '';
    });

    if (projectsGrid) void projectsGrid.offsetHeight; // force reflow once

    allProjects.forEach(card => card.classList.add('fade-out'));

    setTimeout(() => {
        if (!projectsGrid) return;
        projectsGrid.innerHTML = '';

        if (recentProjects.length === 0) {
            if (noResults) noResults.style.display = 'block';
            return;
        }
        if (noResults) noResults.style.display = 'none';

        recentProjects.forEach((card, index) => {
            card.classList.remove('fade-out', 'hidden');
            card.style.animationDelay = '';
            void card.offsetHeight;
            card.classList.add('fade-in');
            card.style.animationDelay = `${index * 0.1}s`;
            projectsGrid.appendChild(card);
        });

        const totalTime = ((recentProjects.length - 1) * 0.1 + 0.5) * 1000;
        setTimeout(() => {
            recentProjects.forEach(card => {
                card.classList.remove('fade-in');
                card.style.animationDelay = '';
            });
        }, totalTime);
    }, 300);
}

filterChips.forEach(chip => {
    chip.addEventListener('click', function () {
        filterChips.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        filterProjects(this.getAttribute('data-filter'));
    });
});

// ================================
// Animated Counter for Stats
// ================================
function animateCounter(element, target, duration = 2000, suffix = '+') {
    const end = parseInt(target);
    let startTimestamp = null;

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 4);
        element.textContent = Math.floor(eased * end) + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else element.textContent = target;
    };

    requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
            entry.target.classList.add('counted');
            animateCounter(entry.target, entry.target.textContent);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(stat => statObserver.observe(stat));

// ================================
// Technology Toggle
// ================================
const techToggleBtn  = document.getElementById('techToggleBtn');
const techToggleText = document.getElementById('techToggleText');
const techHiddenItems = document.querySelectorAll('.tech-hidden');

techToggleBtn?.addEventListener('click', () => {
    const isExpanded = techToggleBtn.classList.toggle('expanded');
    techToggleText.textContent = isExpanded ? 'See Less' : 'See More';
    techHiddenItems.forEach(item => {
        item.style.display = isExpanded ? 'block' : 'none';
    });
});

// ================================
// Consolidated Real-Time Clock
// Replaces two separate setInterval calls (updatePhilippinesTime + updateCurrentTime)
// Updates footer clock (#timeText) and contact page clock (#currentTime) in one tick
// ================================
function updateClocks() {
    const TZ = 'Asia/Manila';

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    const shortFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true
    });
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ, hour: 'numeric', hour12: false
    });

    const now  = new Date();
    const hour = parseInt(hourFormatter.format(now));
    const isDay = hour >= 6 && hour < 18;

    // — Footer clock (#timeText) —
    const timeText = document.getElementById('timeText');
    if (timeText) {
        timeText.textContent = `It's currently ${shortFormatter.format(now)} in Mark's city`;

        const timeIcon  = document.getElementById('timeIcon');
        const sunIcons  = document.querySelectorAll('.sun-icon');
        const moonIcons = document.querySelectorAll('.moon-icon');

        timeIcon?.classList.toggle('night', !isDay);
        sunIcons.forEach(el  => el.style.display = isDay ? '' : 'none');
        moonIcons.forEach(el => el.style.display = isDay ? 'none' : '');
    }

    // — Contact page timezone clock (#currentTime) —
    const currentTime   = document.getElementById('currentTime');
    const timezoneIcon  = document.getElementById('timezoneIcon');
    if (currentTime) {
        try {
            currentTime.textContent = timeFormatter.format(now);

            if (timezoneIcon) {
                if      (hour >= 5  && hour < 12) timezoneIcon.textContent = '🌅';
                else if (hour >= 12 && hour < 17) timezoneIcon.textContent = '☀️';
                else if (hour >= 17 && hour < 20) timezoneIcon.textContent = '🌇';
                else                              timezoneIcon.textContent = '🌙';
            }
        } catch (err) {
            // Silently fail; clock is non-critical
        }
    }
}

// Start clock if either element is present on this page
if (document.getElementById('timeText') || document.getElementById('currentTime')) {
    const clockReady = () => {
        updateClocks();
        setInterval(updateClocks, 1000);
    };
    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', clockReady)
        : clockReady();
}

// ================================
// Contact Form
// ================================
const contactForm = document.getElementById('contactForm');
const submitBtn   = document.getElementById('submitBtn');
const formMessage = document.getElementById('formMessage');
const messageText = document.getElementById('messageText');
const charCount   = document.getElementById('charCount');
const messageInput = document.getElementById('message');

if (messageInput && charCount) {
    messageInput.addEventListener('input', () => {
        const count = messageInput.value.length;
        charCount.textContent = count;
        charCount.style.color =
            count > 950 ? '#EF4444' :
            count > 800 ? '#F59E0B' :
            'var(--gray-500)';
    });
}

// Input focus effects
document.querySelectorAll('.input-icon').forEach(container => {
    const input = container.querySelector('input, textarea');
    if (input) {
        input.addEventListener('focus', () => container.classList.add('focused'));
        input.addEventListener('blur',  () => container.classList.remove('focused'));
    }
});

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        formMessage.classList.remove('show');

        try {
            const [response] = await Promise.all([
                fetch(contactForm.action, {
                    method: 'POST',
                    body: new FormData(contactForm),
                    headers: { 'Accept': 'application/json' }
                }),
                new Promise(resolve => setTimeout(resolve, 1000)) // min UX delay
            ]);

            if (response.ok) {
                formMessage.classList.remove('error');
                formMessage.classList.add('success', 'show');
                messageText.textContent = '✨ Message sent successfully! I\'ll get back to you soon.';
                contactForm.reset();
                if (charCount) charCount.textContent = '0';
                setTimeout(() => formMessage.classList.remove('show'), 5000);
            } else {
                throw new Error('Submission failed');
            }
        } catch {
            formMessage.classList.remove('success');
            formMessage.classList.add('error', 'show');
            messageText.textContent = '❌ Oops! Something went wrong. Please try again.';
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });
}

// Ripple effect on social cards
document.querySelectorAll('.social-link-card').forEach(card => {
    card.addEventListener('click', function (e) {
        const ripple = document.createElement('div');
        Object.assign(ripple.style, {
            position: 'absolute', borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            width: '20px', height: '20px',
            animation: 'ripple-effect 0.6s ease-out'
        });
        const rect = card.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left - 10) + 'px';
        ripple.style.top  = (e.clientY - rect.top  - 10) + 'px';
        card.style.position = 'relative';
        card.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

// ================================
// Skills tag click feedback
// ================================
document.querySelectorAll('.skill-tag').forEach(tag => {
    tag.addEventListener('click', function () {
        this.style.transform = 'scale(0.95)';
        setTimeout(() => { this.style.transform = 'translateY(-2px)'; }, 100);
    });
});

// ================================
// Prevent default on placeholder links
// ================================
document.querySelectorAll('a[href="#"]').forEach(link => {
    link.addEventListener('click', e => e.preventDefault());
});

// ================================
// Dynamic footer year
// ================================
const footerYear = document.querySelector('.footer-bottom p');
if (footerYear) {
    footerYear.textContent = `© ${new Date().getFullYear()} Mark Christian Labucca. All rights reserved.`;
}

// ================================
// Page Loader
// ================================
function init() {
    document.body.classList.add('loader-active');
    setupInternalLinks();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.addEventListener('load', () => {
    const loader = document.getElementById('pageLoader');
    if (!loader) return;
    setTimeout(() => {
        loader.classList.add('fade-out');
        document.body.classList.remove('loader-active');
        setTimeout(() => { loader.style.display = 'none'; }, 1000);
    }, 500); // Reduced from 1000ms — page is already loaded, don't make users wait
});

function setupInternalLinks() {
    document.querySelectorAll(
        'a[href^="home.html"], a[href^="work.html"], a[href^="about.html"], a[href^="contact.html"]'
    ).forEach(link => {
        link.addEventListener('click', (e) => {
            const loader = document.getElementById('pageLoader');
            if (loader && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                loader.classList.remove('fade-out');
                loader.style.display = 'flex';
                document.body.classList.add('loader-active');
            }
        });
    });
}