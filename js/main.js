const firebaseConfig = {
    apiKey: "AIzaSyDF2-I1PtvHF5jjjYi_ad4ZiBOY2ALklZQ",
    authDomain: "hackathon-app-bdd9f.firebaseapp.com",
    projectId: "hackathon-app-bdd9f",
    storageBucket: "hackathon-app-bdd9f.firebasestorage.app",
    messagingSenderId: "2417665603",
    appId: "1:2417665603:web:5b8226605d7e181afc96f6",
    measurementId: "G-MMVXC7C3XG"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];

function readStoredSessions() {
    try {
        const stored = JSON.parse(localStorage.getItem('azamat_sessions') || '[]');
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        console.error('Не удалось загрузить локальную историю:', error);
        return [];
    }
}

let sessions = readStoredSessions();
let currentSessionId = null;
let currentLang = 'kk';
let API_KEY = (localStorage.getItem('azamat_google_api_key') || '').trim(); // Google Gemini API ключ
let ELEVENLABS_KEY = (localStorage.getItem('azamat_elevenlabs_api_key') || '').trim();
let accessToken = null;
let isLoading = false;
let isAuthProcessing = false;
const DEFAULT_VOLUME = 0.3;
let currentMode = localStorage.getItem('azamat_mode') || 'chat';
let isGuest = localStorage.getItem('azamat_is_guest') === 'true';
let selectedImage = null; // base64 Data URL сурет үшін

const langData = {
    kk: {
        title: "Қалай көмектесе аламын?",
        placeholder: "Сұрақ жазыңыз...",
        newChat: "Жаңа сұхбат",
        system: `Сен — Азаматсың. Сен Қазақстанның жетілдірілген ұлттық жасанды интеллект модельсің.

🔒 ТІЛДІК ҚАҒИДАЛАР (ҚАТАҢ):
- Жауапты ТОЛЫҒЫМЕН қазақ тілінде бер.
- Сөздердің ішінде ағылшын әріптері, латын символдары МҮЛДЕМ болмауы тиіс.
- 🚫 ҚЫТАЙ, ЖАПОН, КОРЕЙ иероглифтеріне ҚАТАҢ ТЫЙЫМ САЛЫНАДЫ: 宝, 法, 的, 是, 我, 你, 他, 她, 们, 不, 了, 在, 有, 这, 那, 什, 么, 说, 好, 大, 小, 人, 中, 国, 日, 本, 学, 生, 老, 师, 书, 电, 脑, 手, 机, 游, 戏, 玩, 家  ЖӘНЕ БАСҚА CJK (Unified Ideographs) Unicode диапазонындағы КЕЗ КЕЛГЕН символдар: U+4E00–U+9FFF, U+3040–U+30FF, U+AC00–U+D7AF.
- Егер сөзді қазақша жазу қиын болса, орысша кириллмен жаз, ағылшынша емес.
- Код пен формулалардан басқа барлық мәтін таза қазақ тілінде болуы керек.
- Техникалық терминдерді қазақша бер, мүмкін болмаса орысша кириллмен бер.

Сен ақылды, білімді және байсалды жасанды интеллектсің. Өзіңді сенімді аға, сыпайы маман және жақсы дос ретінде ұстайсың: жылы шырайлы, салмақты әрі мәдениетті.

Сенің болмысың:
Жоғары деңгейлі сарапшылық пен табиғи сөйлесудің алтын көпірі. 
🚫 Арзан көше сленгінен, әсірелеуден және панибраттықтан аулақ бол («базар жоқ», «братан» деген артық сөздерді орынсыз қолданба). Сыпайы, мазмұнды және тартымды сөйле.

Қарым-қатынас стилі:
- Маңызды тапсырмаларға (код, аналитика, оқу, ғылым, жұмыс) келгенде — нақты, терең әрі сапалы жауап бер.
- Суреттерді, есептерді және кодтарды талдағанда — барлық мәліметті ретімен, құрылымды түрде түсіндір.
- Қазақстанның мәдениетін, тарихын және дәстүрін терең білесің.

Басты мақсатың:
Қолданушының сұрағына барынша нақты, сапалы әрі мәдениетті түрде көмектесу. Артық сөзсіз, мағыналы жауап бер.

Математика шығарғанда МІНДЕТТІ ТҮРДЕ осылай жаз:

**Әдіс:** [әдіс атауы]

**1-қадам:** [не істейміз]
$$формула$$

**2-қадам:** [не істейміз]
$$формула$$

**Жауап:**
$$нәтиже$$

Барлық формулалар LaTeX-те. Әр қадам жаңа жолда. Достың сияқты қысқа, қарапайым жауап бер. Артық сөз айтпа. Сәлем десе — қысқа сәлем қайтар. Математика сұралса ғана LaTeX қолдан.

⛔ ЕҢ БАСТЫ ЕРЕЖЕ: Ешқашан қытай, жапон, корей иероглифтерін (宝, 法, 的, 是, 我, 你, 他  және т.б.) қолданба. Ешқашан ағылшын әріптерін қазақ сөздерінің ішінде араластырма. Бұл — ең маңызды талап.`,
        switchNotice: "Пайдаланушы қазақ тіліне ауысты.",
        systemDocument: `Сен — академиялық құжат генераторысың. МІНДЕТТІ ЕРЕЖЕЛЕР:

🔒 ТІЛ: Жауап ТОЛЫҒЫМЕН қазақ тілінде. Ағылшын әріптері, қытай иероглифтері, латын символдары МҮЛДЕМ болмауы тиіс.

1. ҚАТАҢ ТЫЙЫМ: "Міне реферат", "Сәлем", "Рақмет", "Тағы не керек" деген сөздер ЖОҚ.
2. Жауап ТІКЕЛЕЙ мазмұннан басталады — тақырып, кіріспе, негізгі бөлім.
3. Қолдан: # Басты тақырып, ## Бөлімдер, **жуан мәтін**, кестелер.
4. Академиялық стиль — ресми, нақты, құрылымды.
5. Егер таблица керек болса — Markdown кестесін қолдан.

МЫСАЛ (ДҰРЫС):
# Қазақстан Республикасы

## Кіріспе
Қазақстан — Орталық Азиядағы...

## 1. География
**Аумақ:** 2.7 млн км²
...`,
        voiceLang: 'kk-KZ'
    },
    ru: {
        title: "Чем помочь?",
        placeholder: "Задайте вопрос...",
        newChat: "Новый чат",
        system: `Ты — Азамат, современный, высокообразованный и эрудированный искусственный интеллект из Казахстана.

🔒 ЯЗЫКОВЫЕ ПРАВИЛА (СТРОГО):
- Пиши СТРОГО на русском языке.
- Грамотная, чистая и богатая русская речь без орфографических и стилистических ошибок.
- 🚫 КАТЕГОРИЧЕСКИЙ ЗАПРЕТ на китайские, японские, корейские иероглифы: 宝, 法, 的, 是, 我, 你, 他, 她, 们, 不, 了, 在, 有, 这, 那, 什, 么, 说, 好, 大, 小, 人, 中, 国, 日, 本, 学, 生, 老, 师, 书, 电, 脑, 手, 机, 游, 戏, 玩, 家 И ЛЮБЫЕ ДРУГИЕ символы CJK Unicode диапазонов: U+4E00–U+9FFF, U+3040–U+30FF, U+AC00–U+D7AF.
- Никаких английских букв или случайных символов в ответе (кроме формул, кода и оригинальных названий).

🎭 ХАРАКТЕР И ТОН ОБЩЕНИЯ:
- Твой стиль — интеллигентный, спокойный, доброжелательный и глубоко разбирающийся в теме эксперт.
- ⛔ СТРОГИЙ ЗАПРЕТ на карикатурность, наигранность и уличный жаргон: НИКОГДА не используй слова вроде «братан», «пацаны», «навалять», «базар жок», «лютая тема», «зачетная» и тому подобный стереотипный гоп-сленг. Не переигрывай!
- Можно тепло поздороваться («Салам!» или «Привет!») и по-человечески сказать пару теплых фраз («Раскладываю всё по полочкам»), но далее излагай мысли солидно, тактично и уважительно.
- Всегда отвечай структурированно, содержательно и с интересными подробностями (используй аккуратные разделы: «Кто перед нами:», «Что происходит:», «Детали:», «Вывод:»).
- Если анализируешь картинку, кадр, код, ошибку или текст — давай глубокий, точный и интересный разбор, как первоклассный аналитик.

При решении математики ОБЯЗАТЕЛЬНО пиши так:

**Метод:** [название метода]

**Шаг 1:** [что делаем]
$$формула$$

**Шаг 2:** [что делаем]
$$формула$$

**Ответ:**
$$итог$$

Все формулы только в LaTeX. Каждый шаг на новой строке. Никаких bullet points со звёздочками.

⛔ ГЛАВНОЕ ПРАВИЛО: Никогда не используй китайские, японские, корейские иероглифы. Ответ должен быть грамотным, уважительным, без уличного сленга и переигрывания.`,
        systemDocument: `Ты — генератор академических документов. СТРОГИЕ ПРАВИЛА:

🔒 ЯЗЫК: Ответ СТРОГО на русском языке. Никаких китайских иероглифов, английских букв или случайных символов.

1. ЗАПРЕЩЕНО писать: "Конечно", "Вот реферат", "Надеюсь поможет", "Что ещё?".
2. Ответ начинается СРАЗУ с контента — заголовок, введение, основная часть.
3. Используй: # Главный заголовок, ## Подзаголовки, **жирный текст**, таблицы.
4. Академический стиль — формально, структурно, без "воды".
5. Если нужна таблица — используй Markdown таблицу.

ПРИМЕР (ПРАВИЛЬНО):
# Республика Казахстан

## Введение
Казахстан — крупнейшее государство Центральной Азии...

## 1. География и природные ресурсы
**Площадь:** 2,7 млн км²

| Отрасль | Роль |
|---------|------|
| Энергетика | Нефть, газ, уран |
| Металлургия | Медь, цинк |
...`,
        voiceLang: 'ru-RU'
    }
};

// ===== AUTH =====
auth.onAuthStateChanged(async (u) => {
    if (localStorage.getItem('azamat_is_guest') === 'true') {
        initGuestMode();
        return;
    }
    if (u && !isAuthProcessing) {
        isAuthProcessing = true;
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('user-name').innerText = u.displayName;
        document.getElementById('user-avatar').src = u.photoURL;

        try {
            await syncChatsWithDB();
        } catch (err) {
            console.error("Не удалось загрузить историю из Firestore:", err);
            sessions = [];
            renderSidebar();
        } finally {
            isAuthProcessing = false;
        }
    } else if (!u) {
        if (localStorage.getItem('azamat_is_guest') === 'true') {
            initGuestMode();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            accessToken = null;
        }
    }
});

function initGuestMode() {
    isGuest = true;
    localStorage.setItem('azamat_is_guest', 'true');
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.classList.add('hidden');
    const userName = document.getElementById('user-name');
    if (userName) userName.innerText = currentLang === 'kk' ? 'Қонақ' : 'Гость';
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) userAvatar.src = 'https://ui-avatars.com/api/?name=Guest&background=00ff88&color=000';
    loadFromLocal();
}

function loginAsGuest() {
    initGuestMode();
}

function loadFromLocal() {
    sessions = readStoredSessions();
    renderSidebar();
    if (sessions.length > 0 && !currentSessionId) {
        loadSession(sessions[0].id);
    }
}

async function syncChatsWithDB() {
    try {
        const user = auth.currentUser;
        if (!user) return loadFromLocal();

        const snapshot = await db.collection('users').doc(user.uid)
            .collection('chats')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        if (!snapshot.empty) {
            sessions = snapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title || 'Сұхбат',
                history: []
            }));
            renderSidebar();
            if (!currentSessionId) loadSession(sessions[0].id);
        } else {
            sessions = [];
            currentSessionId = null;
            renderSidebar();
        }
    } catch (e) {
        console.error("Sync error:", e);
        sessions = [];
        currentSessionId = null;
        renderSidebar();
    }
}

function renderSidebar() {
    const list = document.getElementById('chat-sessions-list');
    if (!list) return;
    list.innerHTML = sessions.map(s => `
    <div class="chat-item ${s.id === currentSessionId ? 'active' : ''} px-4 py-3 rounded-xl cursor-pointer text-xs mb-1 group relative">
        <div onclick="loadSession('${s.id}')" class="flex items-center">
            <i class="far fa-comment-dots mr-2 ${s.id === currentSessionId ? 'accent-green' : 'text-gray-500'}"></i>
            <span class="truncate flex-1">${s.title}</span>
        </div>
        <button onclick="deleteChat('${s.id}', event)" class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg">
            <i class="fas fa-trash text-xs"></i>
        </button>
    </div>`).join('');
}

async function deleteChat(chatId, event) {
    event.stopPropagation();
    const confirmMsg = currentLang === 'kk' ? 'Сұхбатты өшіруді растайсыз ба?' : 'Точно хотите удалить чат?';
    if (!confirm(confirmMsg)) return;

    if (!chatId.startsWith('temp-') && auth.currentUser) {
        try {
            await db.collection('users').doc(auth.currentUser.uid)
                .collection('chats').doc(chatId).delete();
        } catch (e) { console.error('Ошибка удаления:', e); }
    }

    sessions = sessions.filter(s => s.id !== chatId);
    localStorage.setItem('azamat_sessions', JSON.stringify(sessions));

    if (currentSessionId === chatId) {
        if (sessions.length > 0) loadSession(sessions[0].id);
        else createNewChat();
    }
    renderSidebar();
}

async function loadSession(id) {
    currentSessionId = id;
    const container = document.getElementById('messages-container');
    const welcome = document.getElementById('welcome-screen');
    container.innerHTML = '';

    let s = sessions.find(x => x.id === id);
    if (!s) return;

    if (!id.startsWith('temp-') && auth.currentUser) {
        try {
            const snapshot = await db.collection('users').doc(auth.currentUser.uid)
                .collection('chats').doc(id)
                .collection('messages')
                .orderBy('createdAt')
                .get();

            s.history = snapshot.docs.map(doc => ({
                role: doc.data().role,
                content: doc.data().content
            }));
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    }

    if (s.history && s.history.length > 0) {
        welcome.classList.add('hidden');
        container.classList.remove('hidden');
        s.history.forEach(m => appendMsg(m.role, m.content, m.image));
    } else {
        welcome.classList.remove('hidden');
        container.classList.add('hidden');
    }
    renderSidebar();
}

// ===== IMAGE HANDLING =====
function triggerImageUpload() {
    const input = document.getElementById('image-file-input');
    if (input) input.click();
    const popup = document.getElementById('tools-popup');
    if (popup) popup.classList.remove('show');
}

function handleImageSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    processImageFile(file);
    event.target.value = '';
}

function processImageFile(file) {
    if (!file.type.startsWith('image/')) {
        alert(currentLang === 'kk' ? 'Тек сурет файлдарын таңдаңыз (PNG, JPG, WebP)' : 'Пожалуйста, выберите файл изображения (PNG, JPG, WebP)');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        compressImage(e.target.result, 1280, 0.85, (compressedDataUrl) => {
            selectedImage = compressedDataUrl;
            showImagePreview(compressedDataUrl, file.name);
        });
    };
    reader.readAsDataURL(file);
}

function compressImage(dataUrl, maxDimension, quality, callback) {
    const img = new Image();
    img.onload = function () {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
            } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
            }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const format = dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        callback(canvas.toDataURL(format, quality));
    };
    img.onerror = function () {
        callback(dataUrl);
    };
    img.src = dataUrl;
}

function showImagePreview(dataUrl, name) {
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');
    const previewName = document.getElementById('image-preview-name');
    if (previewContainer && previewImg) {
        previewImg.src = dataUrl;
        if (previewName) previewName.innerText = name || (currentLang === 'kk' ? 'Сурет таңдалды' : 'Изображение выбрано');
        previewContainer.classList.remove('hidden');
    }
}

function clearSelectedImage() {
    selectedImage = null;
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) {
        previewContainer.classList.add('hidden');
    }
}

function openImageModal(src) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image');
    if (modal && modalImg) {
        modalImg.src = src;
        modal.classList.remove('hidden');
    }
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Paste support (Ctrl+V) for screenshots and copied images
window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) processImageFile(blob);
            break;
        }
    }
});

// Drag & drop support
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
            processImageFile(file);
        }
    }
});

// ===== MESSAGES =====
async function handleSend() {
    const input = document.getElementById('user-input');
    let text = input.value.trim();
    const currentImg = selectedImage;

    if (!text && !currentImg) return;

    if (!API_KEY) {
        alert(currentLang === 'kk' ? '⚠️ Алдымен жоғарғы оң жақтағы өріске Google Gemini API кілтін жазып, OK басыңыз!' : '⚠️ Пожалуйста, введите Google Gemini API ключ в поле сверху и нажмите OK!');
        document.getElementById('key-input')?.focus();
        return;
    }

    if (isLoading) return;

    if (!text && currentImg) {
        text = currentLang === 'kk'
            ? 'Суретті талдау'
            : 'Анализ изображения';
    }

    let s = sessions.find(x => x.id === currentSessionId);
    if (!s) { createNewChat(); s = sessions[0]; }

    if (s.history.length === 0 || s.title === 'Жаңа сұхбат' || s.title === 'Новый чат') {
        s.title = (text.length > 25 ? text.substring(0, 25) + '...' : text) || (currentLang === 'kk' ? 'Суретпен сұрақ' : 'Вопрос с фото');
    }

    appendMsg('user', text, currentImg);
    s.history.push({ role: 'user', content: text, image: currentImg || null });
    localStorage.setItem('azamat_sessions', JSON.stringify(sessions));
    input.value = '';
    clearSelectedImage();
    isLoading = true;

    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('messages-container').classList.remove('hidden');

    const tid = appendThinking();
    try {
        const lowerText = text.toLowerCase();
        const weatherCities = ['актау', 'актобе', 'алматы', 'астана', 'нурсултан', 'атырау', 'караганды', 'шымкент', 'павлодар', 'семей', 'тараз', 'костанай', 'кызылорда', 'уральск', 'петропавловск'];
        const isWeatherQuery = !currentImg && (lowerText.includes('погод') || lowerText.includes('ауа рай')) &&
            weatherCities.some(city => lowerText.includes(city));

        if (isWeatherQuery) {
            const foundCity = weatherCities.find(city => lowerText.includes(city));
            const weatherData = await getWeather(foundCity);
            removeThinking(tid);
            appendMsg('ai', weatherData);
            s.history.push({ role: 'assistant', content: weatherData });
            localStorage.setItem('azamat_sessions', JSON.stringify(sessions));
            isLoading = false;
            renderSidebar();
            return;
        }

        // Multimodal API payload (handles text and inline image base64)
        const contents = [
            {
                role: 'user',
                parts: [{ text: langData[currentLang].system }]
            }
        ];

        s.history.forEach(m => {
            const role = (m.role === 'assistant' || m.role === 'ai') ? 'model' : 'user';
            const parts = [];

            if (m.image) {
                const match = m.image.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    parts.push({
                        inlineData: {
                            mimeType: match[1],
                            data: match[2]
                        }
                    });
                }
            }

            if (m.content) {
                parts.push({ text: m.content });
            }

            if (parts.length > 0) {
                contents.push({ role, parts });
            }
        });

        let aiReply = null;
        let lastError = null;

        for (const modelName of FALLBACK_MODELS) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-goog-api-key': API_KEY
                    },
                    body: JSON.stringify({ contents }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                let d;
                try {
                    d = await r.json();
                } catch (parseError) {
                    throw new Error('Сервис вернул некорректный ответ');
                }

                if (!r.ok || d.error) {
                    const apiError = d.error || {};
                    const msg = apiError.message || `HTTP ${r.status}`;
                    if (r.status === 400 || r.status === 401 || r.status === 403) {
                        throw new Error(currentLang === 'kk'
                            ? 'Google Gemini API кілті жарамсыз немесе өшірілген. Кілтті тексеріп, қайта сақтаңыз.'
                            : 'Ключ Google Gemini API недействителен или отключён. Проверьте ключ и сохраните его заново.');
                    }
                    if (apiError.code === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate') || apiError.code === 404) {
                        console.warn(`Модель ${modelName} вернула лимит (429/quota), пробуем следующую модель...`);
                        lastError = msg;
                        continue;
                    }
                    throw new Error(msg || 'Ошибка API');
                }

                if (d.candidates && d.candidates.length > 0 && d.candidates[0].content?.parts?.[0]?.text) {
                    aiReply = d.candidates[0].content.parts[0].text;
                    break;
                }
            } catch (err) {
                lastError = err.name === 'AbortError'
                    ? (currentLang === 'kk' ? 'Сервер жауабы тым ұзақ күтті.' : 'Сервер слишком долго не отвечает.')
                    : (err.message || 'Ошибка соединения с сервисом Gemini');
            }
        }

        if (!aiReply) {
            throw new Error(lastError || 'Не удалось получить ответ от моделей Gemini');
        }

        removeThinking(tid);
        appendMsg('ai', aiReply);
        s.history.push({ role: 'assistant', content: aiReply });
        localStorage.setItem('azamat_sessions', JSON.stringify(sessions));

        if (auth.currentUser) {
            await saveToDatabase(s.title, text, aiReply);
        }
        renderSidebar();
    } catch (e) {
        console.error(e);
        removeThinking(tid);
        let displayError = e.message || (currentLang === 'kk'
            ? 'Жауап алу кезінде қате орын алды.'
            : 'При получении ответа произошла ошибка.');
        const retryMatch = displayError.match(/retry in ([\d\.]+)s/i);
        if (retryMatch) {
            const secs = Math.ceil(parseFloat(retryMatch[1]));
            displayError = currentLang === 'kk'
                ? `⏳ Сұраныс лимиті асты. Өтінеміз, ${secs} секунд күтіп, қайта жіберіңіз.`
                : `⏳ Слишком много запросов за короткое время. Пожалуйста, подождите ${secs} сек. и отправьте снова.`;
        }
        appendMsg('ai', `❌ Ошибка: ${displayError}`);
    } finally {
        isLoading = false;
    }
}

async function saveToDatabase(title, userText, aiText) {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const s = sessions.find(x => x.id === currentSessionId);
        if (!s) return null;

        if (currentSessionId.startsWith('temp-')) {
            const chatRef = await db.collection('users').doc(user.uid)
                .collection('chats').add({
                    title: title,
                    language: currentLang,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            s.id = chatRef.id;
            currentSessionId = chatRef.id;
            localStorage.setItem('azamat_sessions', JSON.stringify(sessions));
        }

        const chatRef = db.collection('users').doc(user.uid)
            .collection('chats').doc(currentSessionId);

        await chatRef.collection('messages').add({
            role: 'user', content: userText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await chatRef.collection('messages').add({
            role: 'assistant', content: aiText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return currentSessionId;
    } catch (e) {
        console.error("Firestore Error:", e);
        const message = currentLang === 'kk'
            ? 'Чатты сақтау мүмкін болмады. Firebase Firestore ережелерін тексеріңіз.'
            : 'Не удалось сохранить чат. Проверьте правила Firebase Firestore.';
        alert(message);
        return null;
    }
}

function appendMsg(role, text, image = null) {
    const c = document.getElementById('messages-container');
    const d = document.createElement('div');
    d.className = role === 'user' ? 'flex justify-end chat-msg w-full' : 'flex justify-start chat-msg w-full';

    let imageHtml = '';
    if (image) {
        imageHtml = `<div class="mb-2">
            <img src="${image}" alt="Attached image" class="max-w-xs sm:max-w-sm max-h-60 rounded-xl object-contain border border-zinc-700 cursor-pointer hover:opacity-90 transition shadow-lg" onclick="openImageModal('${image}')" />
        </div>`;
    }

    const formattedText = role === 'user'
        ? (text ? text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') : '')
        : formatMarkdown(text);

    d.innerHTML = role === 'user'
        ? `<div class="bg-zinc-800 p-4 rounded-2xl max-w-md border border-zinc-700 text-sm">${imageHtml}<div>${formattedText}</div></div>`
        : `<div class="flex gap-3 max-w-2xl"><div class="azamat-logo shrink-0 mt-1"></div><div class="bg-zinc-900 p-4 rounded-2xl text-sm leading-relaxed">${formattedText}</div></div>`;
    c.appendChild(d);

    if (role === 'assistant' || role === 'ai') {
        lastMessage = text;
        setTimeout(() => {
            if (window.MathJax) MathJax.typesetPromise([d]);
        }, 100);
    }

    document.getElementById('chat-window').scrollTo({ top: 999999, behavior: 'smooth' });
}

function formatMarkdown(text) {
    const mathBlocks = [];

    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match) => {
        mathBlocks.push(match);
        return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
    });

    text = text.replace(/\$([^\$\n]+?)\$/g, (match) => {
        mathBlocks.push(match);
        return `%%MATH_BLOCK_${mathBlocks.length - 1}%%`;
    });

    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        const randomId = 'code-' + Math.random().toString(36).substr(2, 9);
        return `<div class="code-block-wrapper my-3">
<div class="code-header bg-zinc-800 border border-zinc-700 rounded-t-lg px-3 py-2 flex justify-between items-center">
<span class="text-xs text-gray-400 font-mono">${lang || 'code'}</span>
<button onclick="copyCode('${randomId}', event)" class="copy-btn text-xs bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded text-gray-300">
<i class="fas fa-copy mr-1"></i> Копировать
</button>
</div>
<pre id="${randomId}" class="bg-zinc-900 border-x border-b border-zinc-700 rounded-b-lg p-4 overflow-x-auto"><code class="text-green-400 text-sm font-mono whitespace-pre">${code}</code></pre>
</div>`;
    });

    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em class="italic text-gray-300">$1</em>');
    text = text.replace(/`([^`]+?)`/g, '<code class="bg-zinc-800 text-green-400 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
    text = text.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-white mt-4 mb-2">$1</h2>');
    text = text.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-200 mt-3 mb-1">$1</h3>');
    text = text.replace(/^- (.+)$/gm, '<li class="ml-4 my-1 text-gray-200">• $1</li>');
    text = text.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 my-1 text-gray-200">$1</li>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-green-400 underline hover:text-green-300">$1 <i class="fas fa-external-link-alt text-xs"></i></a>');
    text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" class="text-green-400 underline hover:text-green-300 break-all">$1</a>');
    text = text.replace(/\n/g, '<br>');

    text = text.replace(/%%MATH_BLOCK_(\d+)%%/g, (match, idx) => {
        return mathBlocks[parseInt(idx)];
    });

    return text;
}

function createNewChat() {
    const id = "temp-" + Date.now();
    sessions.unshift({ id, title: langData[currentLang].newChat, history: [] });
    localStorage.setItem('azamat_sessions', JSON.stringify(sessions));
    currentSessionId = id;
    loadSession(id);
}

function appendThinking() {
    const id = 'th' + Date.now();
    const d = document.createElement('div');
    d.id = id; d.className = 'flex justify-start w-full';
    d.innerHTML = '<div class="bg-zinc-900 p-4 rounded-2xl ml-11 flex gap-1.5"><span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></span><span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style="animation-delay:0.2s"></span><span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style="animation-delay:0.4s"></span></div>';
    document.getElementById('messages-container').appendChild(d);
    return id;
}

function copyCode(elementId, event) {
    const codeElement = document.getElementById(elementId);
    const code = codeElement.innerText;
    navigator.clipboard.writeText(code).then(() => {
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check mr-1"></i> Скопировано!';
        btn.classList.add('bg-green-600');
        setTimeout(() => { btn.innerHTML = originalText; btn.classList.remove('bg-green-600'); }, 2000);
    }).catch(err => console.error('Ошибка копирования:', err));
}

function removeThinking(id) { document.getElementById(id)?.remove(); }
function loginWithGoogle() {
    if (window.location.protocol === 'file:') {
        alert(currentLang === 'kk'
            ? 'Google арқылы кіру үшін Azamat.html файлын http://localhost арқылы ашыңыз. Қазір файл тікелей ашылған.'
            : 'Для входа через Google откройте Azamat через http://localhost. Сейчас файл открыт напрямую через file://.');
        return;
    }
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(error => {
        console.error('Ошибка входа через Google:', error);
        const details = error.code || error.message || 'неизвестная ошибка';
        alert(currentLang === 'kk'
            ? `Google арқылы кіру мүмкін болмады (${details}). Firebase баптауларын тексеріңіз.`
            : `Не удалось войти через Google (${details}). Проверьте настройки Firebase.`);
    });
}
function logout() {
    localStorage.removeItem('azamat_is_guest');
    const savedApiKey = localStorage.getItem('azamat_google_api_key');
    try { auth.signOut(); } catch (e) { }
    localStorage.clear();
    if (savedApiKey) localStorage.setItem('azamat_google_api_key', savedApiKey);
    location.reload();
}
function saveApiKey() {
    const keyInput = document.getElementById('key-input');
    API_KEY = keyInput.value.trim();
    if (!API_KEY) {
        localStorage.removeItem('azamat_google_api_key');
        alert(currentLang === 'kk' ? 'API кілті бос болмауы керек.' : 'API-ключ не может быть пустым.');
        return;
    }
    localStorage.setItem('azamat_google_api_key', API_KEY);
    alert(currentLang === 'kk' ? '✅ Google API кілті сақталды!' : '✅ Ключ Google API сохранён!');
}
function saveApiKeys() {
    const googleInput = document.getElementById('key-input');
    const elevenLabsInput = document.getElementById('elevenlabs-key-input');
    const googleKey = googleInput.value.trim();
    const elevenLabsKey = elevenLabsInput.value.trim();

    if (!googleKey || !elevenLabsKey) {
        alert(currentLang === 'kk'
            ? 'Gemini және ElevenLabs кілттерін енгізіңіз.'
            : 'Введите ключи Gemini и ElevenLabs.');
        return;
    }

    API_KEY = googleKey;
    ELEVENLABS_KEY = elevenLabsKey;
    localStorage.setItem('azamat_google_api_key', API_KEY);
    localStorage.setItem('azamat_elevenlabs_api_key', ELEVENLABS_KEY);
    document.getElementById('api-keys-panel')?.classList.add('saved');
}
function showApiKeysPanel() {
    const panel = document.getElementById('api-keys-panel');
    if (!panel) return;
    panel.classList.remove('saved');
    document.getElementById('elevenlabs-key-input')?.focus();
}
function toggleToolsPopup() { document.getElementById('tools-popup').classList.toggle('show'); }
function toggleSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem(
        'azamat_sidebar_collapsed',
        document.body.classList.contains('sidebar-collapsed') ? 'true' : 'false'
    );
}

document.getElementById('user-input').addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });

async function switchLang(l) {
    if (l === currentLang) return;
    currentLang = l;
    document.getElementById('btn-kk').className = l === 'kk' ? 'accent-green border-b-2 border-green-500' : 'text-gray-500';
    document.getElementById('btn-ru').className = l === 'ru' ? 'accent-green border-b-2 border-green-500' : 'text-gray-500';
    document.getElementById('main-title').innerText = langData[l].title;
    document.getElementById('user-input').placeholder = langData[l].placeholder;
    document.getElementById('btn-new-chat').innerText = langData[l].newChat;

    const n = document.createElement('div');
    n.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-black px-6 py-3 rounded-2xl font-bold z-50';
    n.style.animation = 'fadeInOut 2s ease-in-out';
    n.innerText = l === 'kk' ? '✓ Қазақ тілі' : '✓ Русский язык';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);

    const s = sessions.find(x => x.id === currentSessionId);
    if (s) {
        s.history = s.history.filter(m => m.role !== 'system');
    }
}

function switchMode(mode) {
    currentMode = mode;
    localStorage.setItem('azamat_mode', mode);

    document.getElementById('btn-mode-chat').className = mode === 'chat'
        ? 'text-xs accent-green border-b-2 border-green-500'
        : 'text-xs text-gray-500';
    document.getElementById('btn-mode-doc').className = mode === 'document'
        ? 'text-xs accent-green border-b-2 border-green-500'
        : 'text-xs text-gray-500';

    const modeText = mode === 'chat'
        ? '💬 Режим общения'
        : '📄 Режим документа';
    const n = document.createElement('div');
    n.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-black px-6 py-3 rounded-2xl font-bold z-50';
    n.style.animation = 'fadeInOut 2s ease-in-out';
    n.innerText = modeText;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

// ===== VOICE =====
let recognition = null;
let isVoiceRecording = false;
let voiceRecognitionState = 'idle';
let lastMessage = '';

function setVoiceRecordingState(isRecording) {
    isVoiceRecording = isRecording;
    const button = document.getElementById('voice-btn');
    const icon = button?.querySelector('i');
    const visualizer = document.getElementById('voice-visualizer');
    if (!button || !icon || !visualizer) return;
    button.classList.toggle('bg-green-500', isRecording);
    button.classList.toggle('border-green-400', isRecording);
    icon.className = isRecording ? 'fas fa-stop text-white' : 'fas fa-microphone text-green-400';
    button.title = isRecording ? 'Остановить запись' : 'Начать запись';
    button.setAttribute('aria-label', button.title);
    visualizer.classList.toggle('active', isRecording);
}

function startVoiceInput() {
    if (!recognition) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            alert(currentLang === 'kk'
                ? 'Бұл браузер дауысты тануды қолдамайды.'
                : 'Этот браузер не поддерживает распознавание речи.');
            return;
        }
        recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => {
            voiceRecognitionState = 'recording';
            setVoiceRecordingState(true);
            document.getElementById('main-logo')?.classList.add('listening');
        };
        recognition.onend = () => {
            voiceRecognitionState = 'idle';
            setVoiceRecordingState(false);
            document.getElementById('main-logo')?.classList.remove('listening');
        };
        recognition.onresult = (e) => {
            const input = document.getElementById('user-input');
            let transcript = '';
            for (let index = 0; index < e.results.length; index += 1) {
                transcript += e.results[index][0].transcript;
            }
            input.value = transcript.trim();
            input.dispatchEvent(new Event('input'));
        };
        recognition.onerror = (e) => {
            console.error('Ошибка распознавания:', e.error);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                alert(currentLang === 'kk'
                    ? 'Микрофонға рұқсат беріңіз.'
                    : 'Разрешите доступ к микрофону в браузере.');
            }
            voiceRecognitionState = 'idle';
            setVoiceRecordingState(false);
        };
    }
    if (voiceRecognitionState !== 'idle') {
        voiceRecognitionState = 'stopping';
        recognition.stop();
        return;
    }
    recognition.lang = langData[currentLang].voiceLang;
    voiceRecognitionState = 'starting';
    try {
        recognition.start();
    } catch (error) {
        if (error.name === 'InvalidStateError') {
            voiceRecognitionState = 'recording';
            setVoiceRecordingState(true);
            return;
        }
        voiceRecognitionState = 'idle';
        console.error('Не удалось запустить распознавание:', error);
    }
}

const VOICE_ID = 'q0ORSR7zoA0g6nLuDk1j';
let currentAudio = null;
let speechRequestController = null;

function setSpeechButtonState(isPlaying) {
    const button = document.getElementById('speech-control-btn');
    const icon = document.getElementById('speech-control-icon');
    if (!button || !icon) return;
    icon.className = isPlaying ? 'fas fa-pause text-gray-300' : 'fas fa-volume-up text-gray-400';
    button.title = isPlaying ? 'Пауза озвучки' : 'Озвучить последний ответ';
    button.setAttribute('aria-label', button.title);
}

function prepareSpeechText(text) {
    return text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*_#`]/g, '')
        .replace(/\n{2,}/g, '\n')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

async function playAudioResponse(response) {
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);
    currentAudio.volume = DEFAULT_VOLUME;
    currentAudio.onended = () => {
        document.getElementById('main-logo')?.classList.remove('speaking');
        setSpeechButtonState(false);
        currentAudio = null;
        URL.revokeObjectURL(audioUrl);
    };
    setSpeechButtonState(true);
    await currentAudio.play();
}

function toggleSpeechPlayback() {
    if (speechRequestController && !currentAudio) {
        speechRequestController.abort();
        speechRequestController = null;
        document.getElementById('main-logo')?.classList.remove('speaking');
        setSpeechButtonState(false);
        return;
    }
    if (!currentAudio) {
        speakLast();
        return;
    }
    if (currentAudio.paused) {
        currentAudio.play();
        setSpeechButtonState(true);
    } else {
        currentAudio.pause();
        setSpeechButtonState(false);
    }
}

async function speakLast() {
    if (!lastMessage) return;
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    speechRequestController?.abort();
    speechRequestController = new AbortController();
    document.getElementById('main-logo')?.classList.add('speaking');

    try {
        if (!ELEVENLABS_KEY) {
            throw new Error('ElevenLabs key is not configured');
        }
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_KEY
            },
            body: JSON.stringify({
                text: prepareSpeechText(lastMessage),
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.45,
                    similarity_boost: 0.8,
                    style: 0.25,
                    use_speaker_boost: true,
                    speed: 1.12
                }
            }),
            signal: speechRequestController.signal
        });
        if (!response.ok) {
            console.error('ElevenLabs ошибка:', response.status);
            let errorDetails = '';
            try {
                const errorBody = await response.json();
                errorDetails = errorBody.detail?.message || errorBody.detail?.status || '';
            } catch (parseError) {
                console.warn('Не удалось прочитать ответ ElevenLabs:', parseError);
            }
            if (response.status === 401) {
                showApiKeysPanel();
                alert(currentLang === 'kk'
                    ? `ElevenLabs авторизация қатесі: ${errorDetails || 'кілт қабылданбады'}. Кілтті қайта енгізіңіз.`
                    : `ElevenLabs не принял ключ: ${errorDetails || 'ключ отклонён'}. Проверьте ключ и разрешения.`);
            } else {
                alert(currentLang === 'kk'
                    ? `ElevenLabs қатесі (${response.status}): ${errorDetails || 'сервис жауап бермеді'}`
                    : `Ошибка ElevenLabs (${response.status}): ${errorDetails || 'сервис не принял запрос'}`);
            }
            return;
        }
        await playAudioResponse(response);
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Ошибка озвучки ElevenLabs:', error);
        alert(currentLang === 'kk'
            ? 'ElevenLabs сервисіне қосылу мүмкін болмады.'
            : 'Не удалось подключиться к ElevenLabs.');
    } finally {
        speechRequestController = null;
        document.getElementById('main-logo')?.classList.remove('speaking');
    }
}


// ===== WEATHER =====
const CITY_COORDS = {
    'актау': { lat: 43.6515, lon: 51.1973, name: 'Актау' },
    'актобе': { lat: 50.2797, lon: 57.2073, name: 'Актобе' },
    'алматы': { lat: 43.2220, lon: 76.8512, name: 'Алматы' },
    'астана': { lat: 51.1801, lon: 71.4460, name: 'Астана' },
    'нурсултан': { lat: 51.1801, lon: 71.4460, name: 'Астана' },
    'атырау': { lat: 47.1167, lon: 51.8833, name: 'Атырау' },
    'караганды': { lat: 49.8047, lon: 73.1094, name: 'Қарағанды' },
    'шымкент': { lat: 42.3000, lon: 69.6000, name: 'Шымкент' },
    'павлодар': { lat: 52.2873, lon: 76.9674, name: 'Павлодар' },
    'семей': { lat: 50.4111, lon: 80.2275, name: 'Семей' },
    'тараз': { lat: 42.9000, lon: 71.3667, name: 'Тараз' },
    'костанай': { lat: 53.2144, lon: 63.6249, name: 'Қостанай' },
    'кызылорда': { lat: 44.8479, lon: 65.5093, name: 'Қызылорда' },
    'уральск': { lat: 51.2333, lon: 51.3667, name: 'Орал' },
    'петропавловск': { lat: 54.8750, lon: 69.1639, name: 'Петропавл' }
};

const WMO_CODES = {
    0: 'ясно', 1: 'преимущественно ясно', 2: 'переменная облачность',
    3: 'пасмурно', 45: 'туман', 48: 'изморозь',
    51: 'лёгкая морось', 53: 'морось', 55: 'сильная морось',
    61: 'небольшой дождь', 63: 'дождь', 65: 'сильный дождь',
    71: 'небольшой снег', 73: 'снег', 75: 'сильный снег',
    80: 'ливень', 81: 'ливни', 82: 'сильный ливень',
    95: 'гроза', 96: 'гроза с градом', 99: 'сильная гроза с градом'
};

async function getWeather(cityKey) {
    try {
        const city = CITY_COORDS[cityKey.toLowerCase()];
        if (!city) return currentLang === 'kk' ? '❌ Қала табылмады' : '❌ Город не найден';

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,surface_pressure&wind_speed_unit=kmh&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();
        const c = data.current;

        const temp = Math.round(c.temperature_2m);
        const feelsLike = Math.round(c.apparent_temperature);
        const description = WMO_CODES[c.weather_code] || 'переменная облачность';
        const humidity = c.relative_humidity_2m;
        const windSpeed = Math.round(c.wind_speed_10m);
        const pressure = Math.round(c.surface_pressure);

        const now = new Date();
        const localTime = now.toLocaleString('ru-RU', {
            timeZone: 'Asia/Aqtau',
            hour: '2-digit', minute: '2-digit',
            day: 'numeric', month: 'long', weekday: 'long'
        });

        return currentLang === 'kk'
            ? `**${city.name} қаласындағы ауа райы**\n📅 ${localTime}\n\n🌡️ **Температура:** ${temp}°C (сезіледі ${feelsLike}°C)\n☁️ **Жағдай:** ${description}\n💧 **Ылғалдылық:** ${humidity}%\n💨 **Жел:** ${windSpeed} км/сағ\n🔽 **Қысым:** ${pressure} гПа`
            : `**Погода в городе ${city.name}**\n📅 ${localTime}\n\n🌡️ **Температура:** ${temp}°C (ощущается ${feelsLike}°C)\n☁️ **Состояние:** ${description}\n💧 **Влажность:** ${humidity}%\n💨 **Ветер:** ${windSpeed} км/ч\n🔽 **Давление:** ${pressure} гПа`;

    } catch (error) {
        console.error('Погода ошибка:', error);
        return currentLang === 'kk' ? '❌ Ауа райын алу қатесі' : '❌ Ошибка получения погоды';
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    const keyInput = document.getElementById('key-input');
    if (keyInput && API_KEY) {
        keyInput.value = API_KEY;
    }
    const elevenLabsInput = document.getElementById('elevenlabs-key-input');
    if (elevenLabsInput && ELEVENLABS_KEY) {
        elevenLabsInput.value = ELEVENLABS_KEY;
    }
    if (API_KEY && ELEVENLABS_KEY) {
        document.getElementById('api-keys-panel')?.classList.add('saved');
    }
    if (localStorage.getItem('azamat_sidebar_collapsed') === 'true') {
        document.body.classList.add('sidebar-collapsed');
    }
    if (localStorage.getItem('azamat_is_guest') === 'true') {
        initGuestMode();
    }
});
