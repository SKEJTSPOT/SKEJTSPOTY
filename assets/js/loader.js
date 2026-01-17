/* 
Rozpiska: Loader (JS)
- Co zawiera: bezpieczne, jednokrotne uruchomienie animacji ładowania
- Jak zmienić: edytuj timeliny GSAP; funkcja runLoaderOnce() startuje animację
- Co wysłać do innego chatu: assets/js/loader.js
*/

/* 
Rozpiska: Loader (JS) - OLLIE ANIMATION
*/

let __loaderDone = false;
function runLoaderOnce() {
    if (typeof gsap === 'undefined' || __loaderDone) return;
    const tl = gsap.timeline();
    const statusEl = document.getElementById('loader-status');
    const progressFill = document.querySelector('.loader-progress-fill');
    
    const statuses = [
        "INICJALIZACJA SYSTEMU...",
        "SYNCHRONIZACJA SPOTÓW...",
        "ŁADOWANIE MAPY...",
        "KALIBRACJA NEONÓW...",
        "GOTOWY DO JAZDY"
    ];

    // Fade in the loader
    tl.fromTo('.stickman-loader-container', {
        opacity: 0,
        scale: 0.8
    }, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'back.out(1.7)'
    });
    
    // Fade in title and status
    tl.fromTo(['#loader h2', '#loader-status'], {
        opacity: 0,
        y: 10
    }, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.2
    }, "-=0.3");

    // Progress bar and status cycle
    statuses.forEach((status, index) => {
        tl.to(progressFill, {
            width: `${(index + 1) * 20}%`,
            duration: 0.4,
            ease: "power1.inOut",
            onStart: () => {
                if (statusEl) statusEl.textContent = status;
            }
        }, "+=0.1");
    });

    // Final push to 100%
    tl.to(progressFill, {
        width: "100%",
        duration: 0.3,
        onStart: () => {
            if (statusEl) statusEl.textContent = "SYSTEM ONLINE";
        }
    });
    
    // Exit animation - Professional glitch-out
    tl.to('#loader', {
        opacity: 0,
        filter: "blur(10px) brightness(2)",
        duration: 0.5,
        delay: 0.2,
        onComplete: () => {
            const el = document.getElementById('loader');
            if (el) el.style.display = 'none';
            
            // Show main app with a slick entrance
            gsap.fromTo('.app-container', {
                opacity: 0,
                scale: 1.05,
                filter: "contrast(1.5) brightness(0.5)"
            }, {
                opacity: 1,
                scale: 1,
                filter: "contrast(1) brightness(1)",
                duration: 0.8,
                ease: "power2.out"
            });
            __loaderDone = true;
        }
    });
}

document.addEventListener('DOMContentLoaded', runLoaderOnce);
