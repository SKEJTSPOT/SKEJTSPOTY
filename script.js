// === KONFIGURACJA FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyCCxW6X7MJlWPfxP_6I8FlLc7Vp2wiR69Q",
    authDomain: "skejspoty.firebaseapp.com",
    projectId: "skejspoty",
    storageBucket: "skejspoty.firebasestorage.app",
    messagingSenderId: "1067851773136",
    appId: "1:1067851773136:web:39bdc7f7af34cbbf94dad5",
    measurementId: "G-WH6DYL95DH"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const spotsCollection = db.collection('spots');

const IMGBB_API_KEY = '8fd076f6d9cc935b3dcf18f88af1ed67';

async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            return data.data.url;
        } else {
            throw new Error(data.error ? data.error.message : 'Upload failed');
        }
    } catch (error) {
        console.error('ImgBB Upload Error:', error);
        throw error;
    }
}

let currentUser = null; 
let deferredPwaPrompt = null;
const installSectionEl = document.getElementById('pwaInstallSection');
const installPwaBtn = document.getElementById('installPwaBtn');
const accountSettingsEl = document.getElementById('accountSettings');
const newNickInput = document.getElementById('newNickInput');
const newPasswordInput = document.getElementById('newPasswordInput');

// --- OGÓLNE NARZĘDZIA UI ---
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notification-container');
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;

    container.prepend(notif); 

    gsap.fromTo(notif, 
        { y: '100%', opacity: 0, scale: 0.9 }, 
        { y: '0%', opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
    );

    setTimeout(() => {
        gsap.to(notif, 
            { 
                opacity: 0, y: '-100%', duration: 0.5, ease: "power2.in",
                onComplete: () => {
                    notif.remove();
                }
            }
        );
    }, duration);
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    if (installSectionEl) installSectionEl.style.display = 'block';
});
function showInstallPromptIfAvailable() {
    if (deferredPwaPrompt) {
        if (installSectionEl) installSectionEl.style.display = 'block';
        showNotification("Dodaj aplikację na ekran główny", 'info', 4000);
    }
}
function triggerInstallOrGuide() {
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        deferredPwaPrompt.userChoice.then(choice => {
            if (choice.outcome === 'accepted') {
                showNotification("Instalacja rozpoczęta.", 'success', 3000);
            } else {
                showNotification("Instalacja anulowana.", 'info', 3000);
            }
        }).catch(() => {});
        deferredPwaPrompt = null;
        if (installSectionEl) installSectionEl.style.display = 'none';
    } else {
        showNotification("Na iOS: Udostępnij → Dodaj do ekranu głównego. Na Android: Menu przeglądarki → Zainstaluj aplikację.", 'info', 6000);
    }
}
// === REJESTRACJA SERVICE WORKERA ===
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log("Service Worker aktywny."));
}

let deferredPwaPrompt = null;
const installSectionEl = document.getElementById('pwaInstallSection');
const installPwaBtn = document.getElementById('installPwaBtn');

// Przechwytywanie systemowego komunikatu o instalacji
window.addEventListener('beforeinstallprompt', (e) => {
    // Zablokuj automatyczne pokazanie, abyśmy mogli wywołać to naszym przyciskiem
    e.preventDefault();
    deferredPwaPrompt = e;
    
    // Pokaż sekcję instalacji w menu Konto, bo wiemy, że urządzenie pozwala na instalację
    if (installSectionEl) installSectionEl.style.display = 'block';
});

// Co się dzieje po kliknięciu "ZAINSTALUJ"
if (installPwaBtn) {
    installPwaBtn.addEventListener('click', async () => {
        if (deferredPwaPrompt) {
            // WYWOŁAJ NATYWNE OKNO PRZEGLĄDARKI
            deferredPwaPrompt.prompt();
            
            // Sprawdź decyzję użytkownika
            const { outcome } = await deferredPwaPrompt.userChoice;
            if (outcome === 'accepted') {
                showNotification("Dzięki za instalację!", 'success');
                if (installSectionEl) installSectionEl.style.display = 'none';
            }
            deferredPwaPrompt = null; // Można wywołać tylko raz
        } else {
            // Instrukcja dla iPhone (iOS nie obsługuje natywnego okna prompt)
            showNotification("Aby zainstalować na iOS: kliknij 'Udostępnij' i 'Dodaj do ekranu głównego'.", 'info', 6000);
        }
    });
}

// Sprawdź czy aplikacja jest już zainstalowana (wtedy ukryj przycisk)
window.addEventListener('appinstalled', () => {
    if (installSectionEl) installSectionEl.style.display = 'none';
    deferredPwaPrompt = null;
});
if (document.getElementById('changeNickBtn')) {
    document.getElementById('changeNickBtn').addEventListener('click', async () => {
        const newNick = (newNickInput.value || '').trim();
        if (!newNick || newNick.length < 2) return showNotification("Nick za krótki.", 'error');
        if (!auth.currentUser) return showNotification("Zaloguj się.", 'error');
        try {
            await auth.currentUser.updateProfile({ displayName: newNick });
            const authStatusElLocal = document.getElementById('authStatus');
            if (authStatusElLocal) authStatusElLocal.innerHTML = `Zalogowano jako: <b>${newNick}</b>`;
            
            // Zaktualizuj nick w dokumentach spotów oraz w komentarzach autora
            const uid = auth.currentUser.uid;
            const snapshot = await spotsCollection.get();
            const updates = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                let changed = false;
                const payload = {};
                if (data.authorId === uid && data.authorName !== newNick) {
                    payload.authorName = newNick;
                    changed = true;
                }
                if (Array.isArray(data.comments) && data.comments.length > 0) {
                    const updatedComments = data.comments.map(c => {
                        if (c.authorId === uid && c.authorName !== newNick) {
                            return { ...c, authorName: newNick };
                        }
                        return c;
                    });
                    // Sprawdź czy nastąpiła zmiana
                    for (let i = 0; i < data.comments.length; i++) {
                        if (data.comments[i].authorId === uid && data.comments[i].authorName !== newNick) {
                            payload.comments = updatedComments;
                            changed = true;
                            break;
                        }
                    }
                }
                if (changed) {
                    updates.push(spotsCollection.doc(doc.id).update(payload));
                }
            });
            if (updates.length > 0) await Promise.all(updates);
            
            showNotification("Nick zaktualizowany w spotach i komentarzach.", 'success');
            renderSpots(getActiveFilters());
        } catch (err) {
            showNotification("Błąd zmiany nicku: " + err.message, 'error', 6000);
        }
    });
}
if (document.getElementById('changePasswordBtn')) {
    document.getElementById('changePasswordBtn').addEventListener('click', async () => {
        const newPass = (newPasswordInput.value || '').trim();
        if (!newPass || newPass.length < 6) return showNotification("Hasło min. 6 znaków.", 'error');
        if (!auth.currentUser) return showNotification("Zaloguj się.", 'error');
        try {
            await auth.currentUser.updatePassword(newPass);
            showNotification("Hasło zmienione.", 'success');
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
                showNotification("Zaloguj ponownie, aby zmienić hasło.", 'error', 6000);
            } else {
                showNotification("Błąd zmiany hasła: " + err.message, 'error', 6000);
            }
        }
    });
}


// --- LOGIKA AUTORYZACJI ---

const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginFormEl = document.getElementById('loginForm');
const registerFormEl = document.getElementById('registerForm');

window.handleLogin = async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showNotification("Zalogowano pomyślnie!", 'success');
        loginFormEl.style.display = 'none';
        showInstallPromptIfAvailable();
    } catch (error) {
        showNotification("Błąd logowania: " + error.message, 'error', 6000);
    }
};

window.handleRegister = async () => {
    const nick = document.getElementById('registerNick').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    if (!nick) return showNotification("Wpisz swój nick!", 'error');
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({
            displayName: nick
        });
        // Update auth status display immediately
        const authStatusEl = document.getElementById('authStatus');
        if (authStatusEl) {
            authStatusEl.innerHTML = `Zalogowano jako: <b>${nick}</b>`;
        }
        showNotification("Rejestracja pomyślna! Witaj " + nick, 'success');
        registerFormEl.style.display = 'none';
        showInstallPromptIfAvailable();
    } catch (error) {
        showNotification("Błąd rejestracji: " + error.message, 'error', 6000);
    }
};

showLoginBtn.addEventListener('click', () => {
    loginFormEl.style.display = 'block';
    registerFormEl.style.display = 'none';
});

showRegisterBtn.addEventListener('click', () => {
    registerFormEl.style.display = 'block';
    loginFormEl.style.display = 'none';
});

logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        showNotification("Wylogowano pomyślnie.", 'info');
    } catch (error) {
        console.error("Błąd wylogowania:", error);
    }
});

// --- MAPA I ZMIENNE ---
let spots = [];
let editingSpotId = null;
let markers = [];
let tempMarker = null;
let isPlacingSpot = false; 
let userMarker = null;
let clusterMarkers = [];
const CLUSTER_ZOOM_THRESHOLD = 11;
const CLUSTER_RADIUS_METERS = 5000;

// 1. Definicja warstw mapy (Wyglądów)
const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
});

const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3']
});

// 2. Inicjalizacja mapy (Domyślnie ustawiamy Google Streets)
const map = L.map('map', {
    center: [52.0693, 19.4803],
    zoom: 6,
    layers: [googleStreets], // To jest mapa startowa
    zoomControl: false // Wyłączamy domyślny zoom, żeby nie zasłaniał (opcjonalne)
});

// Dodajemy przyciski zoomu w lepszym miejscu (opcjonalne, jeśli chcesz standardowe to usuń tę linię i usuń zoomControl: false powyżej)
L.control.zoom({ position: 'bottomright' }).addTo(map);

// 3. Dodanie przełącznika warstw (LEWY DOLNY RÓG)
const baseMaps = {
    "Google Mapa": googleStreets,
    "Google Satelita": googleHybrid,
    "OpenStreetMap": openStreetMap
};

// Zmiana jest tutaj: dodajemy 'null' i konfigurację pozycji
L.control.layers(baseMaps, null, { position: 'bottomleft' }).addTo(map);

function resetMap() {
    map.flyTo([52.0693, 19.4803], 6, { duration: 1.5 });
    if (typeof isMobile === 'function' && isMobile()) {
         try { switchSidebarSection('map'); } catch(e) {}
    }
    if (activeCardId) {
        const prevCard = document.getElementById(`card-${activeCardId}`);
        if (prevCard) prevCard.classList.remove('highlight');
        activeCardId = null;
    }
}

function getSpotIconClass(tags) {
    if (!tags || tags.length === 0) return 'fa-skating';
    if (tags.includes('Schody')) return 'fa-stairs';
    if (tags.includes('Rurki')) return 'fa-grip-lines';
    if (tags.includes('Murki')) return 'fa-cubes';
    if (tags.includes('Bowl')) return 'fa-dot-circle';
    if (tags.includes('Bank')) return 'fa-chevron-up';
    if (tags.includes('Flat')) return 'fa-square';
    if (tags.includes('Inne')) return 'fa-map-pin';
    return 'fa-skating';
}

// Zwraca uproszczony typ spota na podstawie zaznaczonych tagów
function getSpotType(tags) {
    if (!tags || tags.length === 0) return 'inne';
    if (tags.includes('Schody')) return 'schody';
    if (tags.includes('Rurki')) return 'rura';
    if (tags.includes('Murki')) return 'murek';
    if (tags.includes('Bowl')) return 'bowl';
    if (tags.includes('Bank')) return 'bank';
    if (tags.includes('Flat')) return 'flat';
    return 'inne';
}

// Generuje minimalistyczne SVG ikony markera dla danego typu spota
function getSpotIconSVG(type) {
    switch (type) {
        case 'bank':
            return `<svg viewBox="0 0 30 30" aria-hidden="true">
                <polygon points="8,22 22,22 23,19" />
            </svg>`;
        case 'rura':
            return `<svg viewBox="0 0 30 30" aria-hidden="true">
                <line x1="7" y1="18" x2="23" y2="18" />
                <line x1="10" y1="18" x2="10" y2="16" />
                <line x1="20" y1="18" x2="20" y2="16" />
            </svg>`;
        case 'murek':
            return `<svg viewBox="0 0 30 30" aria-hidden="true">
                <rect x="6" y="14" width="18" height="6" rx="2" />
            </svg>`;
        case 'schody':
            return `<svg viewBox="0 0 30 30" aria-hidden="true">
                <polyline points="8,22 14,22 14,18 20,18 20,14 24,14" />
            </svg>`;
        case 'flat':
            return `<svg viewBox="0 0 30 30" aria-hidden="true">
                <line x1="6" y1="20" x2="24" y2="20" />
                <line x1="8" y1="22" x2="22" y2="22" />
            </svg>`;
        case 'bowl':
            return `<svg viewBox="0 0 30 30" aria-hidden="true">
                <path d="M6 18 Q15 13 24 18" />
            </svg>`;
        default:
            return `<svg viewBox="0 0 30 30" aria-hidden="true">
                <circle cx="15" cy="15" r="5" />
            </svg>`;
    }
}

// Tworzy ikonę Leaflet dla pojedynczego spota (kotwica w środku)
function createCustomMarkerIcon(spot) {
    const type = getSpotType(spot.tags);
    return L.divIcon({
        className: `custom-marker-icon marker-${type}`,
        html: getSpotIconSVG(type),
        iconSize: [34, 34],
        iconAnchor: [17, 17]
    });
}

// --- LOGIKA FORMULARZA ---
const spotNameEl = document.getElementById('spotName');
const spotDescEl = document.getElementById('spotDesc');
const spotBustEl = document.getElementById('spotBust');
const spotTags = document.querySelectorAll('.spot-tag');
const spotLightsEl = document.getElementById('spotLights');
const spotLatEl = document.getElementById('spotLat');
const spotLngEl = document.getElementById('spotLng');
const saveSpotBtn = document.getElementById('saveSpotBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editModeLabel = document.getElementById('editModeLabel');
const addSpotFab = document.getElementById('addSpotFab');
const spotFormEl = document.getElementById('spot-form'); 

// NOWE ELEMENTY FORMULARZA
const tagSchody = document.getElementById('tagSchody');
const stairsContainer = document.getElementById('stairsCountContainer');
const stairsRange = document.getElementById('stairsRange');
const stairsValue = document.getElementById('stairsValue');

const tagInne = document.getElementById('tagInne');
const otherContainer = document.getElementById('otherInputContainer');
const otherInputValue = document.getElementById('otherInputValue');

const galleryUploadEl = document.getElementById('galleryUpload');
const galleryPreviewContainer = document.getElementById('galleryPreviewContainer');

let currentEditGallery = []; // Tablica przechowująca aktualne URL-e w edycji

// Obsługa pokazywania/ukrywania suwaka schodów
tagSchody.addEventListener('change', () => {
    if (tagSchody.checked) {
        stairsContainer.style.display = 'block';
    } else {
        stairsContainer.style.display = 'none';
    }
});

stairsRange.addEventListener('input', () => {
    stairsValue.innerText = stairsRange.value;
});

// Obsługa pokazywania/ukrywania inputa "Inne"
tagInne.addEventListener('change', () => {
    if (tagInne.checked) {
        otherContainer.style.display = 'block';
    } else {
        otherContainer.style.display = 'none';
    }
});

// Renderuje podgląd galerii w formularzu (miniatury + przyciski usuń)
function updateGalleryVisuals() {
    galleryPreviewContainer.innerHTML = '';
    
    // 1. Render existing images (from server)
    currentEditGallery.forEach((url, index) => {
        const wrap = document.createElement('div');
        wrap.style.position = 'relative';
        wrap.style.display = 'inline-block';
        wrap.style.margin = '5px';
        
        const img = document.createElement('img');
        img.src = url;
        img.style.width = '60px';
        img.style.height = '60px';
        img.style.objectFit = 'cover';
        img.style.border = '1px solid var(--neon-blue)';
        img.style.borderRadius = '3px';
        
        const removeBtn = document.createElement('div');
        removeBtn.innerHTML = '&times;';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '-8px';
        removeBtn.style.right = '-8px';
        removeBtn.style.background = 'var(--neon-red)';
        removeBtn.style.color = 'white';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.width = '20px';
        removeBtn.style.height = '20px';
        removeBtn.style.fontSize = '14px';
        removeBtn.style.display = 'flex';
        removeBtn.style.justifyContent = 'center';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
        removeBtn.onclick = () => {
            currentEditGallery.splice(index, 1);
            updateGalleryVisuals();
        };
        
        wrap.appendChild(img);
        wrap.appendChild(removeBtn);
        galleryPreviewContainer.appendChild(wrap);
    });

    // 2. Render new files (preview)
    if (galleryUploadEl.files) {
        Array.from(galleryUploadEl.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(r) {
                const wrap = document.createElement('div');
                wrap.style.position = 'relative';
                wrap.style.display = 'inline-block';
                wrap.style.margin = '5px';

                const img = document.createElement('img');
                img.src = r.target.result;
                img.style.width = '60px';
                img.style.height = '60px';
                img.style.objectFit = 'cover';
                img.style.border = '2px dashed var(--neon-green)'; // Green dashed for new
                img.style.borderRadius = '3px';
                
                wrap.appendChild(img);
                galleryPreviewContainer.appendChild(wrap);
            }
            reader.readAsDataURL(file);
        });
    }
}

galleryUploadEl.addEventListener('change', (e) => {
    updateGalleryVisuals();
});


// Resetuje formularz dodawania/edycji spota oraz stany UI
function resetForm() {
    spotNameEl.value = '';
    spotDescEl.value = '';
    spotBustEl.value = 'safe';
    spotLightsEl.checked = false;
    spotLatEl.value = '';
    spotLngEl.value = '';
    editingSpotId = null;
    editModeLabel.style.display = 'none';
    saveSpotBtn.innerText = 'ZAPISZ NA MAPIE';
    cancelEditBtn.style.display = 'none';
    
    // Reset tagów i pól dodatkowych
    spotTags.forEach(cb => cb.checked = false); 
    stairsContainer.style.display = 'none';
    stairsRange.value = 8;
    stairsValue.innerText = '8';
    otherContainer.style.display = 'none';
    otherInputValue.value = '';
    
    // --- Reset galerii ---
    galleryUploadEl.value = '';
    galleryPreviewContainer.innerHTML = '';
    currentEditGallery = [];
    // -----------------------

    isPlacingSpot = false; 
    addSpotFab.innerHTML = '+';
    addSpotFab.classList.remove('form-active');
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
}

// Ustawia tymczasowy marker w miejscu kliknięcia na mapie (precyzyjna lokalizacja)
function placeTempMarker(lat, lng) {
    if (tempMarker) {
        map.removeLayer(tempMarker);
    }
    tempMarker = L.marker([lat, lng]).addTo(map);
    spotLatEl.value = lat;
    spotLngEl.value = lng;
}

function toggleForm(show, lat = null, lng = null) {
    if (show) {
        spotFormEl.style.display = 'block';
        addSpotFab.classList.add('form-active');
        addSpotFab.innerHTML = '&times;'; 

        if (lat && lng) {
            placeTempMarker(lat, lng);
        }
        if (isMobile()) switchSidebarSection('map');
    } else {
        spotFormEl.style.display = 'none';
        resetForm(); 
    }
}

addSpotFab.addEventListener('click', () => {
    // --- ZMIANA: Obsługa logowania ---
    if (!currentUser) {
        showNotification("Musisz się zalogować, aby dodać spot!", "error");
        return;
    }
    // --------------------------------

    if (spotFormEl.style.display === 'block') {
        toggleForm(false);
    } else if (isPlacingSpot) {
        resetForm(); 
        showNotification("Anulowano dodawanie spota.", 'info', 3000);
    } else {
        resetForm();
        isPlacingSpot = true;
        addSpotFab.innerHTML = '<i class="fas fa-crosshairs"></i>'; 
        addSpotFab.classList.add('form-active');
        showNotification("Kliknij na mapie", 'info', 3000);
        if (isMobile()) switchSidebarSection('map');
    }
});

cancelEditBtn.addEventListener('click', () => toggleForm(false)); 

map.on('click', function(e) {
    if (isPlacingSpot) {
        isPlacingSpot = false;
        toggleForm(true, e.latlng.lat, e.latlng.lng); 
    } else if (spotFormEl.style.display === 'block') {
        placeTempMarker(e.latlng.lat, e.latlng.lng);
    }
});

saveSpotBtn.addEventListener('click', async () => {
    if (!currentUser) {
        showNotification("Zaloguj się!", 'error');
        return;
    }
    if (!spotNameEl.value || !spotLatEl.value) {
        showNotification("Nazwa i mapa!", 'error');
        return;
    }
    
    let imageData = ''; 
    saveSpotBtn.innerText = editingSpotId ? "ZAPISYWANIE..." : "DODAWANIE...";

    try {
        // --- UPLOAD GALERII ImgBB ---
        let galleryUrls = [];
        const galleryFiles = galleryUploadEl.files;
        if (galleryFiles && galleryFiles.length > 0) {
            saveSpotBtn.innerText = "TWORZENIE SPOTU...";
            showNotification("Tworzenie spotu (daj chwilę)...", 'info', 4000);
            
            for (let i = 0; i < galleryFiles.length; i++) {
                try {
                    const url = await uploadToImgBB(galleryFiles[i]);
                    galleryUrls.push(url);
                } catch (err) {
                    console.error("Błąd uploadu zdjęcia:", err);
                }
            }
        }
        // -----------------------------
        
        const selectedTags = Array.from(spotTags)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        // Pobranie danych dodatkowych
        const stairsCount = selectedTags.includes('Schody') ? parseInt(stairsRange.value) : null;
        const otherDescription = selectedTags.includes('Inne') ? otherInputValue.value : null;

        const spotData = {
            name: spotNameEl.value,
            description: spotDescEl.value,
            lat: parseFloat(spotLatEl.value),
            lng: parseFloat(spotLngEl.value),
            bust: spotBustEl.value,
            tags: selectedTags,
            lights: spotLightsEl.checked,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email.split('@')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            // Dodanie nowych pól do bazy
            stairsCount: stairsCount,
            otherDescription: otherDescription,
        };

        // --- OBSŁUGA GALERII ---
        // Łączymy stare zdjęcia (które zostały w edycji) z nowymi
        spotData.galleryImages = [...currentEditGallery, ...galleryUrls];
        // -----------------------

        if (editingSpotId) {
            await spotsCollection.doc(editingSpotId).update(spotData);
            showNotification(`Spot "${spotData.name}" zaktualizowany!`, 'success');
        } else {
            await spotsCollection.add(spotData);
            showNotification(`Nowy spot "${spotData.name}" dodany!`, 'success');
        }

        toggleForm(false);

    } catch (error) {
        showNotification("Błąd zapisu spota: " + error.message, 'error', 6000);
        console.error("Błąd zapisu:", error);
        saveSpotBtn.innerText = editingSpotId ? "ZAPISZ ZMIANY" : "ZAPISZ NA MAPIE";
    }
});

// --- FUNKCJE DODATKOWE DLA KART ---
function createCommentSection(spotId, comments) {
    const section = document.createElement('div');
    section.className = 'comments-section';
    section.innerHTML = `<h4>Komentarze (${comments.length}):</h4>`;

    const commentsList = document.createElement('div');
    commentsList.id = `comments-list-${spotId}`;
    comments
        .sort((a, b) => {
            const timeA = a.timestamp && a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const timeB = b.timestamp && b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            return timeB - timeA;
        })
        .slice(0, 3)
        .forEach(c => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            const t = c.timestamp && c.timestamp.seconds ? new Date(c.timestamp.seconds * 1000) : new Date(c.timestamp);
            const dateStr = isNaN(t) ? '' : t.toLocaleDateString();
            const cid = c.id ? c.id : `${c.authorId || 'anon'}-${t.getTime()}`;
            commentEl.innerHTML = `<strong>${c.authorName}:</strong> ${c.text} <span style="font-size: 0.7rem; float: right; color: #888;">${dateStr}</span>`;
            if (currentUser && currentUser.uid === c.authorId) {
                const actions = document.createElement('div');
                actions.style.marginTop = '6px';
                actions.innerHTML = `
                    <button class="card-btn btn-red" onclick="deleteComment('${spotId}','${cid}')">USUŃ</button>
                `;
                commentEl.appendChild(actions);
            }
            commentsList.appendChild(commentEl);
        });
    section.appendChild(commentsList);

    if (currentUser) {
        const commentForm = document.createElement('div');
        commentForm.innerHTML = `
            <textarea id="comment-text-${spotId}" class="textarea-cyber comment-input" rows="2" placeholder="Dodaj komentarz..." style="margin-top: 10px; min-height: 60px;"></textarea>
            <button class="card-btn" style="width: 100%; margin-top: 8px;" onclick="addComment('${spotId}')">Wyślij Komentarz</button>
        `;
        section.appendChild(commentForm);
    } else {
        const loginBox = document.createElement('div');
        loginBox.className = 'login-required';
        loginBox.textContent = 'Musisz się zalogować!';
        section.appendChild(loginBox);
    }
    return section;
}

window.addComment = async (spotId) => {
    const commentTextarea = document.getElementById(`comment-text-${spotId}`);
    const text = commentTextarea.value.trim();

    if (!text) return showNotification("Wpisz treść komentarza.", 'error');

    try {
        const spotRef = spotsCollection.doc(spotId);
        const doc = await spotRef.get();
        if (!doc.exists) return showNotification("Błąd: Spot nie istnieje.", 'error');

        const currentSpot = doc.data();
        const newComment = {
            text: text,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email.split('@')[0],
            timestamp: new Date(),
            id: `${currentUser.uid}-${Date.now()}`
        };

        const updatedComments = [...(currentSpot.comments || []), newComment];
        
        await spotRef.update({ comments: updatedComments });

        commentTextarea.value = '';
        showNotification("Komentarz dodany!", 'success');
    } catch (error) {
        showNotification("Błąd dodawania komentarza: " + error.message, 'error', 6000);
        console.error("Błąd dodawania komentarza:", error);
    }
};

window.deleteComment = async (spotId, commentId) => {
    try {
        const spotRef = spotsCollection.doc(spotId);
        const doc = await spotRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        const filtered = (data.comments || []).filter(c => {
            const t = c.timestamp && c.timestamp.seconds ? c.timestamp.seconds * 1000 : new Date(c.timestamp).getTime();
            const cid = c.id ? c.id : `${c.authorId || 'anon'}-${t}`;
            return !(cid === commentId && c.authorId === currentUser.uid);
        });
        await spotRef.update({ comments: filtered });
        showNotification("Komentarz usunięty.", 'info');
        renderSpots(getActiveFilters());
    } catch (e) {
        showNotification("Błąd usuwania komentarza: " + e.message, 'error', 6000);
    }
};

let activeCardId = null;

// Podświetla kartę spota i przewija listę do tej karty
function highlightCard(spotId) {
    // Remove previous highlight
    if (activeCardId) {
        const prevCard = document.getElementById(`card-${activeCardId}`);
        if (prevCard) prevCard.classList.remove('highlight');
    }
    
    // Highlight new card
    if (activeCardId !== spotId) {
        const newCard = document.getElementById(`card-${spotId}`);
        if (newCard) {
            newCard.classList.add('highlight');
            // Instant scroll to the card (no animation)
            newCard.scrollIntoView({ 
                behavior: 'auto', 
                block: 'center',
                inline: 'nearest'
            });
            activeCardId = spotId;
        } else {
            // If card not found, try again after a short delay
            setTimeout(() => {
                const delayedCard = document.getElementById(`card-${spotId}`);
                if (delayedCard) {
                    delayedCard.classList.add('highlight');
                    delayedCard.scrollIntoView({ 
                        behavior: 'auto', 
                        block: 'center',
                        inline: 'nearest'
                    });
                    activeCardId = spotId;
                }
            }, 200);
        }
    } else {
        activeCardId = null;
    }
}

// Podświetla kartę spota bez przewijania listy
function highlightCardNoScroll(spotId) {
    if (activeCardId) {
        const prevCard = document.getElementById(`card-${activeCardId}`);
        if (prevCard) prevCard.classList.remove('highlight');
    }
    if (activeCardId !== spotId) {
        const newCard = document.getElementById(`card-${spotId}`);
        if (newCard) {
            newCard.classList.add('highlight');
        }
        activeCardId = spotId;
    } else {
        activeCardId = null;
    }
}
function createSpotCard(spot, index) {
    const card = document.createElement('div');
    card.className = 'spot-card';
    card.id = `card-${spot.id}`;
    card.setAttribute('data-hover', '');
    
    card.addEventListener('click', () => {
        if (isMobile() && mainSidebar.classList.contains('active')) {
        } else if (!isMobile()) {
            map.flyTo([spot.lat, spot.lng], 17, { duration: 0.8 });
        }
        highlightCard(spot.id);
    });

    const bustClass = spot.bust === 'safe' ? 'bust-safe' : (spot.bust === 'medium' ? 'bust-medium' : 'bust-high');
    const bustText = spot.bust === 'safe' ? 'Spoko' : (spot.bust === 'medium' ? 'Uwaga' : 'Ryzyko');
    
    // Generowanie tagów z dodatkowymi info
    const tagsHtml = (spot.tags || []).map(tag => {
        let tagLabel = tag;
        if (tag === 'Schody' && spot.stairsCount) {
            tagLabel += ` (${spot.stairsCount})`;
        }
        if (tag === 'Inne' && spot.otherDescription) {
            tagLabel += `: ${spot.otherDescription}`;
        }
        return `<span class="tag">${tagLabel}</span>`;
    }).join('');
    
    // --- GALERIA ZDJĘĆ (SLIDESHOW) ---
    let allImages = [];
    if (spot.imageData) allImages.push(spot.imageData);
    if (spot.galleryImages && spot.galleryImages.length > 0) {
        allImages = [...allImages, ...spot.galleryImages];
    }

    let galleryHtml = '';
    if (allImages.length > 0) {
        galleryHtml = '<div class="cyber-scroll" style="display: flex; gap: 10px; overflow-x: auto; margin-bottom: 15px; padding-bottom: 10px; scroll-snap-type: x mandatory;">';
        allImages.forEach((url, i) => {
            galleryHtml += `<div style="flex: 0 0 90%; scroll-snap-align: center; border-radius: 8px; overflow: hidden; border: 2px solid var(--neon-pink);">
                <img src="${url}" onclick="openLightboxSpot('${spot.id}', ${i})" style="width: 100%; height: 280px; object-fit: cover; cursor: pointer; display: block;">
            </div>`;
        });
        galleryHtml += '</div>';
    } else {
        // Placeholder jeśli brak zdjęć?
        galleryHtml = '<div style="font-size: 0.8rem; color: #666; font-style: italic; margin-bottom: 10px;">Brak zdjęć spotu.</div>';
    }
    // ---------------------

    card.innerHTML = `
        <h3 style="color: var(--neon-blue); margin-bottom: 5px;">${spot.name}</h3>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span class="${bustClass} bust-level">${bustText}</span>
            <span style="font-size: 0.8rem; color: var(--neon-pink); cursor: pointer;" onclick="filterByAuthor('${spot.authorId}', '${spot.authorName || 'Anonim'}')">Autor: ${spot.authorName || 'Anonim'}</span>
        </div>
        ${galleryHtml}
        <p style="font-size: 0.9rem; margin-bottom: 10px;">${spot.description}</p>
        <p style="font-size: 0.8rem; color: var(--neon-green);">${spot.lights ? '💡 SPOT OŚWIETLONY W NOCY' : '🌚 BRAK LAMP'}</p>
        <div class="tags-container">${tagsHtml}</div>
        <div class="card-actions">
            <button class="card-btn" onclick="locateSpotOnMap('${spot.lat}', '${spot.lng}', '${spot.id}')">LOKALIZUJ NA MAPIE</button>
            ${currentUser && currentUser.uid === spot.authorId ? `<button class="card-btn" onclick="openEditForm('${spot.id}')">EDYTUJ</button> <button class="card-btn btn-red" onclick="deleteSpot('${spot.id}')">USUŃ</button>` : ''}
        </div>
    `;

    card.appendChild(createCommentSection(spot.id, spot.comments || []));

    return card;
}

window.locateSpotOnMap = (lat, lng, spotId) => {
    map.flyTo([lat, lng], 17, { duration: 1.0 });
    if (isMobile()) switchSidebarSection('map');
    highlightCard(spotId);
};

window.openEditForm = (spotId) => {
    if (!currentUser) return showNotification("Musisz być zalogowany, aby edytować.", 'error');

    const spot = spots.find(s => s.id === spotId);
    if (!spot) return showNotification("Spot nie znaleziony.", 'error');
    if (spot.authorId !== currentUser.uid) return showNotification("Brak uprawnień do edycji.", 'error');

    editingSpotId = spotId;

    spotNameEl.value = spot.name;
    spotDescEl.value = spot.description;
    spotBustEl.value = spot.bust;
    spotLightsEl.checked = spot.lights || false;
    spotLatEl.value = spot.lat;
    spotLngEl.value = spot.lng;
    
    // Wczytanie galerii
    currentEditGallery = [];
    if (spot.imageData) {
        currentEditGallery.push(spot.imageData);
    }
    if (spot.galleryImages && spot.galleryImages.length > 0) {
        currentEditGallery = [...currentEditGallery, ...spot.galleryImages];
    }
    updateGalleryVisuals();
    // ------------------------------------

    spotTags.forEach(cb => {
        cb.checked = (spot.tags || []).includes(cb.value);
    });

    // Obsługa pól dodatkowych przy edycji
    if ((spot.tags || []).includes('Schody')) {
        stairsContainer.style.display = 'block';
        stairsRange.value = spot.stairsCount || 8;
        stairsValue.innerText = stairsRange.value;
    } else {
        stairsContainer.style.display = 'none';
    }

    if ((spot.tags || []).includes('Inne')) {
        otherContainer.style.display = 'block';
        otherInputValue.value = spot.otherDescription || '';
    } else {
        otherContainer.style.display = 'none';
        otherInputValue.value = '';
    }

    editModeLabel.style.display = 'block';
    saveSpotBtn.innerText = 'ZAPISZ ZMIANY';
    cancelEditBtn.style.display = 'inline-block';

    toggleForm(true, spot.lat, spot.lng);
    map.setView([spot.lat, spot.lng], 17);
}

// Filter spots by author
window.filterByAuthor = (authorId, authorName) => {
    // Scroll to top of the sidebar/content
    const spotsListContent = document.getElementById('spotsListContent');
    if (spotsListContent) spotsListContent.scrollTo({ top: 0, behavior: 'smooth' });
    const mainSidebar = document.getElementById('mainSidebar');
    if (mainSidebar) mainSidebar.scrollTo({ top: 0, behavior: 'smooth' });

    // Clear existing filters
    filterBustEl.value = 'all';
    filterTagEls.forEach(cb => cb.checked = false);
    
    // Filter spots by author
    const authorFilteredSpots = spots.filter(spot => spot.authorId === authorId);
    
    // Update spot count display
    document.getElementById('spotCount').textContent = authorFilteredSpots.length;
    
    // Clear and rebuild spot list
    const spotsListEl = document.getElementById('spotsList');
    spotsListEl.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--neon-pink); font-family: Orbitron;">Pokazuję tylko spoty użytkownika: <strong>' + authorName + '</strong></div>';
    
    // Add reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-neon btn-blue';
    resetBtn.style.marginBottom = '15px';
    resetBtn.style.width = '100%';
    resetBtn.textContent = 'Pokaż wszystkie spoty';
    resetBtn.onclick = () => {
        // Reset filters and show all spots
        filterBustEl.value = 'all';
        filterTagEls.forEach(cb => cb.checked = false);
        renderSpots(getActiveFilters());
    };
    spotsListEl.appendChild(resetBtn);
    
    // Add filtered spots
    authorFilteredSpots
        .sort((a, b) => {
            const timeA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const timeB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            return timeB - timeA;
        })
        .forEach((spot, index) => {
            spotsListEl.appendChild(createSpotCard(spot, index + 1));
        });
    
    // Clear markers and render only author's spots
    clearAllMarkers();
    renderMarkersOnly({ selectedBust: 'all', selectedTags: [] });
    
    showNotification(`Pokazuję ${authorFilteredSpots.length} spotów użytkownika ${authorName}`, 'info');
};

window.deleteSpot = async (spotId) => {
    const spot = spots.find(s => s.id === spotId);
    if (!spot || spot.authorId !== currentUser.uid) return showNotification("Brak uprawnień do usunięcia.", 'error');

    if (confirm(`Czy na pewno chcesz usunąć spot: "${spot.name}"?`)) {
        try {
            await spotsCollection.doc(spotId).delete();
            showNotification(`Spot "${spot.name}" usunięty.`, 'info');
        } catch (error) {
            showNotification("Błąd usuwania spota: " + error.message, 'error', 5000);
            console.error("Błąd usuwania:", error);
        }
    }
}

// --- LIGHTBOX ---
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
let currentLightboxImages = [];
let currentLightboxIndex = 0;

// Wyświetla obraz w lightboxie na podanym indeksie (zapętla na krańcach)
function showLightboxAtIndex(i) {
    if (!currentLightboxImages.length) return;
    currentLightboxIndex = ((i % currentLightboxImages.length) + currentLightboxImages.length) % currentLightboxImages.length;
    lightboxImg.src = currentLightboxImages[currentLightboxIndex];
    
    // Ukryj strzałki jeśli jest tylko jedno zdjęcie
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    if (prevBtn && nextBtn) {
        const isMultiple = currentLightboxImages.length > 1;
        prevBtn.style.display = isMultiple ? 'flex' : 'none';
        nextBtn.style.display = isMultiple ? 'flex' : 'none';
    }

    lightbox.style.display = 'flex';
    setTimeout(() => lightbox.style.opacity = 1, 10);
}

// Otwiera lightbox dla zdjęć danego spota i ustawia startowy indeks
window.openLightboxSpot = (spotId, index) => {
    const spot = spots.find(s => s.id === spotId);
    if (!spot) return;
    let imgs = [];
    if (spot.imageData) imgs.push(spot.imageData);
    if (spot.galleryImages && spot.galleryImages.length > 0) {
        imgs = [...imgs, ...spot.galleryImages];
    }
    if (!imgs.length) return;
    currentLightboxImages = imgs;
    showLightboxAtIndex(index || 0);
};

// Zamyka lightbox z delikatnym wygaszeniem
window.closeLightbox = () => {
    lightbox.style.opacity = 0;
    setTimeout(() => lightbox.style.display = 'none', 300);
};

// Przechodzi do następnego zdjęcia w lightboxie
window.nextLightboxImage = () => {
    if (!currentLightboxImages.length) return;
    showLightboxAtIndex(currentLightboxIndex + 1);
};
// Przechodzi do poprzedniego zdjęcia w lightboxie
window.prevLightboxImage = () => {
    if (!currentLightboxImages.length) return;
    showLightboxAtIndex(currentLightboxIndex - 1);
};

let touchStartX = null;
lightbox.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) touchStartX = e.touches[0].clientX;
});
lightbox.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) > 40) {
        if (dx < 0) nextLightboxImage();
        else prevLightboxImage();
    }
});

document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex') {
        if (e.key === 'ArrowRight') nextLightboxImage();
        else if (e.key === 'ArrowLeft') prevLightboxImage();
        else if (e.key === 'Escape') closeLightbox();
    }
});

// --- LOGIKA WYSZUKIWANIA I GEOLOKALIZACJI ---
const searchInput = document.getElementById('citySearchInput');
const searchBtn = document.getElementById('citySearchBtn');
const locateUserBtn = document.getElementById('locateUserBtn');

// Wyszukuje lokalizację i przenosi widok mapy do pierwszego wyniku
async function searchLocation() {
    const query = searchInput.value.trim();
    if (query.length < 3) return showNotification("Wpisz co najmniej 3 znaki.", 'info');

    searchBtn.innerText = "⏳";
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            map.flyTo([lat, lon], 18, { duration: 1.5 }); 
            showNotification(`Znaleziono: ${data[0].display_name.split(',')[0]}`, 'success');
            searchBtn.innerText = "SZUKAJ";
        } else {
            showNotification("Nie znaleziono takiego miejsca. Spróbuj inaczej.", 'error', 4000);
            searchBtn.innerText = "SZUKAJ";
        }
    } catch (error) {
        console.error(error);
        showNotification("Błąd połączenia z mapą.", 'error');
        searchBtn.innerText = "SZUKAJ";
    }
}

searchBtn.addEventListener('click', searchLocation);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchLocation();
});

locateUserBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.flyTo([lat, lng], 16, { duration: 1.5 });
                showNotification("Twoja lokalizacja została znaleziona.", 'success', 3000);
                const icon = L.divIcon({
                    className: 'user-location-marker',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });
                if (!userMarker) {
                    userMarker = L.marker([lat, lng], { icon }).addTo(map);
                } else {
                    userMarker.setLatLng([lat, lng]);
                }
            },
            (error) => {
                console.error(error);
                showNotification("Nie udało się pobrać lokalizacji. Upewnij się, że masz włączony GPS.", 'error', 5000);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        showNotification("Twoja przeglądarka nie wspiera geolokalizacji.", 'error');
    }
});

// Wykrywanie miasta po IP (bez zgód)
async function detectCityByIP() {
    try {
        // Pierwszy provider: ipinfo.io (bez klucza, ograniczenia rate)
        let city, loc;
        try {
            const res = await fetch('https://ipinfo.io/json', { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            city = data.city;
            loc = data.loc; // "lat,lng"
        } catch (e) {}
        
        // Fallback: ipapi.co jeśli ipinfo nie zwróci danych
        if (!loc) {
            const res2 = await fetch('https://ipapi.co/json/', { headers: { 'Accept': 'application/json' } });
            const data2 = await res2.json();
            city = city || data2.city;
            if (data2.latitude && data2.longitude) {
                loc = `${data2.latitude},${data2.longitude}`;
            }
        }
        
        if (loc) {
            const [lat, lng] = loc.split(',').map(Number);
            map.flyTo([lat, lng], 12, { duration: 1.2 });
            if (city) {
                searchInput.value = city;
                showNotification(`Wykryto miasto: ${city}`, 'info', 2500);
            }
        }
    } catch (err) {
        // Cicho ignorujemy, żeby nie przeszkadzać startowi aplikacji
        console.warn('IP geolocation failed', err);
    }
}

// --- LOGIKA FILTROWANIA ---
const filterBustEl = document.getElementById('filterBust');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const filterTagEls = document.querySelectorAll('.filter-tag');

function getActiveFilters() {
    const selectedBust = filterBustEl ? filterBustEl.value : 'all';
    const selectedTags = Array.from(filterTagEls)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    return { selectedBust, selectedTags };
}

function applyFilter() {
    renderSpots(getActiveFilters());
}

if (applyFilterBtn) applyFilterBtn.addEventListener('click', applyFilter);
if (filterBustEl) filterBustEl.addEventListener('change', applyFilter);
filterTagEls.forEach(el => el.addEventListener('change', applyFilter));

// --- GŁÓWNA FUNKCJA RENDERUJĄCA SPOTY I STOSUJĄCA FILTRY ---
function renderSpots(filters = { selectedBust: 'all', selectedTags: [] }) {
    const spotsListEl = document.getElementById('spotsList');
    spotsListEl.innerHTML = '';
    clearAllMarkers();
    let filteredSpots = spots;

    if (filters.selectedBust !== 'all') {
        filteredSpots = filteredSpots.filter(spot => spot.bust === filters.selectedBust);
    }

    if (filters.selectedTags.length > 0) {
        filteredSpots = filteredSpots.filter(spot => 
            filters.selectedTags.every(tag => (spot.tags || []).includes(tag))
        );
    }

    document.getElementById('spotCount').textContent = filteredSpots.length;

    filteredSpots
        .sort((a, b) => {
            const timeA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const timeB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            return timeB - timeA;
        }) 
        .forEach((spot, index) => {
            spotsListEl.appendChild(createSpotCard(spot, index + 1));
        });
    
    renderMarkersOnly(filters);
    
    if (activeCardId) {
        const activeCard = document.getElementById(`card-${activeCardId}`);
        if (activeCard) {
            activeCard.classList.add('highlight');
            activeCard.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        } else {
            activeCardId = null; 
        }
    }
    
    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }
}

// Usuwa wszystkie aktualne markery i klastry z mapy
function clearAllMarkers() {
    markers.forEach(m => map.removeLayer(m)); markers = [];
    clusterMarkers.forEach(m => map.removeLayer(m)); clusterMarkers = [];
}

// Oblicza odległość geo (metry) między dwoma punktami (Haversine)
function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Buduje klastry spotów w promieniu 5 km, uśredniając pozycję
function buildClusters(spotsArr) {
    const clusters = [];
    spotsArr.forEach(s => {
        let found = null;
        for (let c of clusters) {
            const dist = haversineMeters(s.lat, s.lng, c.lat, c.lng);
            if (dist <= CLUSTER_RADIUS_METERS) { found = c; break; }
        }
        if (found) {
            found.spots.push(s);
            const n = found.spots.length;
            found.lat = (found.lat * (n - 1) + s.lat) / n;
            found.lng = (found.lng * (n - 1) + s.lng) / n;
        } else {
            clusters.push({ lat: s.lat, lng: s.lng, spots: [s] });
        }
    });
    return clusters;
}

// Tworzy ikonę klastra (deskorolka + licznik) z wrapperem do animacji
function createClusterMarkerIcon(count) {
    return L.divIcon({
        className: 'cluster-marker',
        html: `
            <div class="cluster-content">
                <div class="count-badge">${count}</div>
                <svg viewBox="0 0 40 20" aria-hidden="true">
                    <rect x="6" y="8" width="28" height="4" rx="2"/>
                    <circle cx="12" cy="15" r="3"/>
                    <circle cx="28" cy="15" r="3"/>
                </svg>
            </div>
        `,
        iconSize: [42, 28],
        iconAnchor: [21, 14]
    });
}

// Filtruje spoty lokalnie według poziomu i tagów, sortuje nowsze wyżej
function filterSpotsLocal(filters) {
    let filteredSpots = spots.slice();
    if (filters.selectedBust !== 'all') {
        filteredSpots = filteredSpots.filter(spot => spot.bust === filters.selectedBust);
    }
    if (filters.selectedTags.length > 0) {
        filteredSpots = filteredSpots.filter(spot => 
            filters.selectedTags.every(tag => (spot.tags || []).includes(tag))
        );
    }
    filteredSpots = filteredSpots.sort((a, b) => {
        const timeA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeB - timeA;
    });
    return filteredSpots;
}

// Renderuje markery: przy małym zoomie klastry, przy dużym pojedyncze spoty
function renderMarkersOnly(filters = { selectedBust: 'all', selectedTags: [] }) {
    clearAllMarkers();
    const filteredSpots = filterSpotsLocal(filters);
    if (map.getZoom() < CLUSTER_ZOOM_THRESHOLD) {
        const clusters = buildClusters(filteredSpots);
        clusters.forEach(c => {
            const marker = L.marker([c.lat, c.lng], { icon: createClusterMarkerIcon(c.spots.length) }).addTo(map);
            marker.on('click', () => {
                map.setView([c.lat, c.lng], CLUSTER_ZOOM_THRESHOLD + 1);
            });
            // Removed GSAP animation for cluster markers
            clusterMarkers.push(marker);
        });
    } else {
        filteredSpots.forEach(spot => {
            const marker = L.marker([spot.lat, spot.lng], {
                icon: createCustomMarkerIcon(spot),
                title: spot.name
            }).addTo(map);
            marker.on('click', () => {
                map.setView([spot.lat, spot.lng], 17);
                switchSidebarSection('spotsList');
                // Ensure we highlight and scroll to the spot card
                setTimeout(() => {
                    highlightCard(spot.id);
                }, 300);
            });
            // Removed GSAP animation for spot markers
            markers.push(marker);
        });
    }
}

map.on('zoomend', () => renderMarkersOnly(getActiveFilters()));
map.on('moveend', () => renderMarkersOnly(getActiveFilters()));
// --- PRZEŁĄCZANIE SEKCEJI SIDEBAR NA MOBILE ---
const authContent = document.getElementById('authContent');
const spotsListContent = document.getElementById('spotsListContent');
const mainSidebar = document.getElementById('mainSidebar');
const mobileNav = document.getElementById('mobileNav');
const navKonto = document.getElementById('navKonto');
const navMapa = document.getElementById('navMapa');
const navSpoty = document.getElementById('navSpoty');
const navUstawienia = document.getElementById('navUstawienia');
const settingsContent = document.getElementById('settingsContent');
const settingsTilesDownload = document.querySelectorAll('.settings-tile-download');
const settingsTilesTheme = document.querySelectorAll('.settings-tile-theme');
const settingsDownloadPanels = document.querySelectorAll('.settings-download-panel');

// Zwraca true dla trybu mobilnego (tutaj wymuszony)
function isMobile() {
    return window.innerWidth <= 768 || true; // FORCE MOBILE STYLE
}

// Przełącza sekcje sidebaru (konto/spoty/mapa), ustawia klasę active
function switchSidebarSection(target) {
    if (isMobile()) {
        if (target === 'map') {
            mainSidebar.classList.remove('active');
        } else {
            mainSidebar.classList.add('active');
        }
    }

    // Hide all sections first
    authContent.classList.remove('active');
    spotsListContent.classList.remove('active');
    settingsContent.classList.remove('active');
    
    // Remove active class from all nav items
    document.querySelectorAll('.mobile-nav .nav-item').forEach(item => item.classList.remove('active'));

    if (target === 'auth') {
        authContent.classList.add('active');
        navKonto.classList.add('active');
    } else if (target === 'spotsList') {
        spotsListContent.classList.add('active');
        navSpoty.classList.add('active');
    } else if (target === 'map') {
        navMapa.classList.add('active');
    } else if (target === 'settings') {
        settingsContent.classList.add('active');
        if (navUstawienia) navUstawienia.classList.add('active');
    }
}

mobileNav.addEventListener('click', (e) => {
    const targetEl = e.target.closest('.nav-item');
    if (targetEl && targetEl.dataset.target) {
        switchSidebarSection(targetEl.dataset.target);
    }
});

const openSettingsBtn = document.getElementById('openSettingsBtn');
if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
        switchSidebarSection('settings');
    });
}
// Force mobile view check
if (isMobile()) {
    switchSidebarSection('map');
} else {
    switchSidebarSection('spotsList');
}

// --- LOGIKA AUTORYZACJI ---
const authStatusEl = document.getElementById('authStatus');

auth.onAuthStateChanged(async user => {
    currentUser = user;
    if (user) {
        authStatusEl.innerHTML = `Zalogowano jako: <b>${user.displayName || user.email}</b>`;
        showLoginBtn.style.display = 'none';
        showRegisterBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        // addSpotFab.style.display = 'flex'; // ZAWSZE WIDOCZNE
        if (accountSettingsEl) accountSettingsEl.style.display = 'block';
        showInstallPromptIfAvailable();
        const globalBox = document.getElementById('loginRequiredGlobal');
        if (globalBox) globalBox.style.display = 'none';
        const fabBox = document.getElementById('loginRequiredFab');
        if (fabBox) fabBox.style.display = 'none';
    } else {
        authStatusEl.innerHTML = 'Niezalogowany. Zaloguj się lub zarejestruj.';
        showLoginBtn.style.display = 'inline-block';
        showRegisterBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        // addSpotFab.style.display = 'none'; // ZAWSZE WIDOCZNE
        toggleForm(false);
        if (accountSettingsEl) accountSettingsEl.style.display = 'none';
        if (installSectionEl) installSectionEl.style.display = 'none';
        const globalBox = document.getElementById('loginRequiredGlobal');
        if (globalBox) globalBox.style.display = 'block';
        const fabBox = document.getElementById('loginRequiredFab');
        if (fabBox) fabBox.style.display = 'block';
    }
    // ZAWSZE POKAZUJ FAB, ale zablokuj działanie w listenerze
    addSpotFab.style.display = 'flex';
    
    loginFormEl.style.display = 'none';
    registerFormEl.style.display = 'none';
    renderSpots(getActiveFilters());
});

document.addEventListener('DOMContentLoaded', () => {
    detectCityByIP();
    runLoaderOnce();
    let initialLoad = true;
    spotsCollection.onSnapshot(snapshot => {
        const newSpots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        spots = newSpots;
        renderSpots(getActiveFilters()); 
        initialLoad = false;
    });
});

// Theme
function applyThemeFromStorage() {
    const pref = localStorage.getItem('skejty_theme') || 'dark';
    if (pref === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    settingsTilesTheme.forEach(tile => {
        const span = tile.querySelector('span');
        if (span) span.textContent = `Motyw: ${document.body.classList.contains('dark-mode') ? 'Ciemny' : 'Jasny'}`;
        const icon = tile.querySelector('i');
        if (icon) icon.className = document.body.classList.contains('dark-mode') ? 'fas fa-moon' : 'fas fa-sun';
    });
}
applyThemeFromStorage();
settingsTilesTheme.forEach(tile => {
    tile.addEventListener('click', () => {
        const dark = !document.body.classList.contains('dark-mode');
        if (dark) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        localStorage.setItem('skejty_theme', dark ? 'dark' : 'light');
        applyThemeFromStorage();
    });
});

// Settings: Downloads panel
settingsTilesDownload.forEach(tile => {
    tile.addEventListener('click', () => {
        const panel = tile.closest('.sidebar-section').querySelector('.settings-download-panel');
        if (panel) {
            const visible = panel.style.display !== 'none';
            panel.style.display = visible ? 'none' : 'block';
        }
    });
});

// --- USTAWIENIA: przyciski pobierania ---
const ANDROID_APK_URL = 'https://www.dropbox.com/scl/fi/e3jjh30zfssh1o35q3bp1/Skejty.apk?rlkey=nip6hpsvuat0z2rg9i50xxhw6&st=htsr6a3g&dl=1';
const IOS_PACKAGE_URL = 'https://www.dropbox.com/scl/fi/c4yz06w31m1yrpxt9annc/Skejty.gz?rlkey=rnuhscziti4knkl5tw93h3ebi&st=jpp4lwkz&dl=1';

document.querySelectorAll('.download-browser-btn').forEach(btn => {
    btn.addEventListener('click', () => triggerInstallOrGuide());
});
document.querySelectorAll('.download-android-btn').forEach(btn => {
    btn.addEventListener('click', () => { window.location.href = ANDROID_APK_URL; });
});
document.querySelectorAll('.download-ios-btn').forEach(btn => {
    btn.addEventListener('click', () => { window.location.href = IOS_PACKAGE_URL; });
});

// --- CUSTOM CURSOR ---
const customCursor = document.getElementById('cursor');
document.addEventListener('mousemove', (e) => {
    customCursor.style.left = e.clientX + 'px';
    customCursor.style.top = e.clientY + 'px';
});

document.querySelectorAll('[data-hover]').forEach(el => {
    el.addEventListener('mouseover', () => customCursor.classList.add('hovered'));
    el.addEventListener('mouseout', () => customCursor.classList.remove('hovered'));
});


