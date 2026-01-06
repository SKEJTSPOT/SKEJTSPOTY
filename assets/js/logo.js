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
