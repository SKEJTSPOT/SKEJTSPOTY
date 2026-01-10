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
    
    // Fade in the loader
    tl.fromTo('.stickman-loader-container', {
        opacity: 0
    }, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out'
    });
    
    // Fade in title
    tl.fromTo('#loader h2', {
        opacity: 0,
        y: 10
    }, {
        opacity: 1,
        y: 0,
        duration: 0.4
    }, "-=0.2");
    
    // Let the ollie animation play, then fade out
    tl.to('#loader', {
        opacity: 0,
        duration: 0.5,
        delay: 2, // Show ollie animation for 2 seconds
        onComplete: () => {
            const el = document.getElementById('loader');
            if (el) el.style.display = 'none';
            
            // Show main app
            gsap.to('.app-container', {
                opacity: 1,
                duration: 0.5
            });
            __loaderDone = true;
        }
    });
}

document.addEventListener('DOMContentLoaded', runLoaderOnce);
