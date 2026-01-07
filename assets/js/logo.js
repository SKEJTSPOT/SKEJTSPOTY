/* 
Rozpiska: Logo (JS)
- Co zawiera: funkcja setLogoScale do zwiększania/zmniejszania logo bez przycinania
- Jak zmienić: wywołaj setLogoScale(1.0–1.5); skaluje obiekt, nie rozmiar obrazka
- Co wysłać do innego chatu: assets/js/logo.js i docelową wartość skali
*/

window.setLogoScale = (val) => {
    const v = Math.max(0.5, Math.min(2.0, Number(val) || 1));
    document.documentElement.style.setProperty('--logo-scale', v);
};

async function setLogoSrc(dataUrl) {
    document.querySelectorAll('.app-logo-img').forEach(img => {
        img.src = dataUrl;
    });
}

async function fetchAsDataUrl(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
    });
}

async function loadLogoBase64() {
    const cached = localStorage.getItem('skejty_logo_data_url');
    if (cached) {
        await setLogoSrc(cached);
        return;
    }
    try {
        if (window.firebase && firebase.apps && firebase.apps.length > 0) {
            const fs = firebase.firestore();
            const doc = await fs.collection('branding').doc('logo').get();
            const data = doc.exists ? doc.data() : null;
            if (data && data.dataUrl) {
                localStorage.setItem('skejty_logo_data_url', data.dataUrl);
                await setLogoSrc(data.dataUrl);
                return;
            }
        }
    } catch {}
    try {
        const fallbackUrl = 'https://i.ibb.co/SwTK5SHh/skejtylogo.png';
        const dataUrl = await fetchAsDataUrl(fallbackUrl);
        localStorage.setItem('skejty_logo_data_url', dataUrl);
        await setLogoSrc(dataUrl);
    } catch {
        await setLogoSrc('https://i.ibb.co/SwTK5SHh/skejtylogo.png');
    }
}

document.addEventListener('DOMContentLoaded', loadLogoBase64);
