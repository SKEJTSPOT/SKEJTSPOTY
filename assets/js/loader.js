/* 
Rozpiska: Loader (JS)
- Co zawiera: bezpieczne, jednokrotne uruchomienie animacji ładowania
- Jak zmienić: edytuj timeliny GSAP; funkcja runLoaderOnce() startuje animację
- Co wysłać do innego chatu: assets/js/loader.js
*/

let __loaderDone = false;
function runLoaderOnce() {
    if (typeof gsap === 'undefined' || __loaderDone) return;
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.fromTo('.stickman-loader-container', { scale: 0.96, y: 6 }, { scale: 1, y: 0, duration: 0.5 });
    tl.fromTo('.stickman-svg', { opacity: 0.9 }, { opacity: 1, duration: 0.3 }, 0);
    tl.to('.speed-line', { opacity: 1, duration: 0.25, stagger: 0.08 }, 0);
    tl.fromTo('#loader h2', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, 0.1);
    tl.to('#loader', { opacity: 0, duration: 0.4, delay: 0.8, onComplete: () => {
        const el = document.getElementById('loader');
        if (el) el.style.display = 'none';
        if (typeof gsap !== 'undefined') gsap.to('.app-container', { opacity: 1, duration: 0.5 });
        __loaderDone = true;
    }});
}

document.addEventListener('DOMContentLoaded', runLoaderOnce);
