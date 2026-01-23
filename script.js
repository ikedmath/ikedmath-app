/* =========================================
   IKED CLIENT ENGINE v2.0 (JSON & Visuals Support) 🚀
   ========================================= */

const AppState = { 
    user: null, 
    isLoggedIn: false,
    currentSessionId: null,
    recognition: null 
};

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    setupInputs();
    setupChat();
    setupVoiceRecognition();
    renderChatHistory();

    // شاشة البداية
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
        if (AppState.isLoggedIn) {
            document.getElementById('app-screen').classList.remove('hidden');
            updateDashboardUI();
        } else {
            document.getElementById('auth-screen').classList.remove('hidden');
        }
    }, 2000);
});

/* =========================================
   1. الاتصال الذكي (JSON & Context) 🧠
   ========================================= */

async function fetchRealAI(userText) {
    try {
        // 1. جلب الذاكرة
        const sessions = getSessions();
        const currentSession = sessions.find(s => s.id === AppState.currentSessionId);
        let contextHistory = "";

        if (currentSession && currentSession.messages.length > 0) {
            const lastMessages = currentSession.messages.slice(-6); // تقليل العدد للتركيز
            contextHistory = lastMessages.map(msg => 
                `${msg.sender === 'user' ? 'التلميذ' : 'IKED'}: ${msg.raw_content || msg.content}` 
            ).join('\n');
        }

        // 2. إعداد الطلب (إرسال البروفايل ليتمكن IKED من التكيف)
        // نرسل userProfile باش IKED يعرف واش نتا Beginner ولا Advanced
        const payload = { 
            prompt: `[HISTORY]:\n${contextHistory}\n\n[USER]: ${userText}`,
            userProfile: AppState.user 
        };

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) 
        });

        if (!response.ok) throw new Error('Network error');
        
        // 3. استقبال الباقة الكاملة (JSON)
        const data = await response.json();
        return data; // نرجع الداتا كاملة (result + analytics)

    } catch (error) {
        console.error("AI Error:", error);
        // Fallback في حالة الخطأ
        return { 
            result: { 
                educational_content: { explanation: "⚠️ كاين مشكل فالاتصال بالسيرفر. عاود حاول." } 
            } 
        };
    }
}

/* =========================================
   2. معالج الرسائل الذكي (The Rendering Logic) 🎨
   هنا السحر: تحويل JSON إلى HTML جميل
   ========================================= */

function processIKEDResponse(data) {
    // 1. التحقق: هل هو JSON الجديد أم نص قديم؟
    let content, meta, updates;
    
    if (data.result && data.result.educational_content) {
        content = data.result.educational_content;
        meta = data.result.meta || {};
        updates = data.result.student_update || {};
    } else {
        // Fallback للنظام القديم
        return { html: data.result || data, raw: data.result || data };
    }

    // 2. معالجة التحديثات (Gamification)
    if (updates.xp_gained) addXP(updates.xp_gained);
    if (updates.new_badge) showBadgeNotification(updates.new_badge);

    // 3. بناء HTML للرسالة
    let htmlBuilder = `<div class="iked-card">`;

    // A. الرسم البياني (SVG)
    if (content.visuals && content.visuals.code && content.visuals.type !== 'NONE') {
        htmlBuilder += `
            <div class="visual-container fade-in">
                ${content.visuals.code}
                <div class="visual-caption">🔍 رسم توضيحي: ${meta.topic || 'شرح بصري'}</div>
            </div>
        `;
    }

    // B. الشرح الأساسي (LaTeX Support)
    htmlBuilder += `
        <div class="explanation-section">
            ${content.explanation}
        </div>
    `;

    // C. التشبيه (Analogy) - بلون مختلف
    if (content.analogy) {
        htmlBuilder += `
            <div class="analogy-box">
                <strong>💡 بالدارجة:</strong> ${content.analogy}
            </div>
        `;
    }

    // D. سؤال التفاعل
    if (content.feedback_question) {
        htmlBuilder += `
            <div class="feedback-question">
                <strong>👉 دابا جاوبني:</strong> ${content.feedback_question}
            </div>
        `;
    }

    htmlBuilder += `</div>`; // End Card

    return { html: htmlBuilder, raw: content.explanation }; // نرجع HTML للعرض، و raw للحفظ
}

function showBadgeNotification(badgeName) {
    // نوتيفيكاسيون بسيطة (مؤقتة)
    const toast = document.createElement('div');
    toast.className = 'badge-toast';
    toast.innerHTML = `🏆 مبروك! ربحتي وسام: <strong>${badgeName}</strong>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/* =========================================
   3. إعدادات الدردشة (محدثة)
   ========================================= */

function setupChat() {
    const sendBtn = document.querySelector('.dock-send-btn');
    const input = document.getElementById('chat-input-field');
    const micBtn = document.querySelectorAll('.dock-action-btn')[1];
    if(micBtn) micBtn.onclick = triggerMic;

    const sendMsg = async () => {
        const txt = input.value.trim();
        if(!txt) return;
        
        // عرض رسالة المستخدم
        addBubbleToUI(txt, 'user');
        saveMessageToSession(txt, 'user');
        input.value = '';
        
        showTyping();

        // الاتصال بـ IKED
        const responseData = await fetchRealAI(txt);
        
        hideTyping();

        // معالجة الجواب وعرضه
        const processed = processIKEDResponse(responseData);
        addBubbleToUI(processed.html, 'bot');
        saveMessageToSession(processed.raw, 'bot'); // نحفظ النص الخام فقط في التاريخ لتوفير المساحة
    };

    if(sendBtn) sendBtn.onclick = sendMsg;
    if(input) input.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMsg(); });
}

/* =========================================
   4. باقي الوظائف (Inputs, Auth, History...)
   (بقيت كما هي مع تحسينات طفيفة)
   ========================================= */

function setupInputs() {
    const cameraInput = document.getElementById('camera-input');
    if(cameraInput) cameraInput.addEventListener('change', function() { handleImageUpload(this, 'chat'); });

    let profileInput = document.getElementById('profile-upload-input');
    if (!profileInput) {
        profileInput = document.createElement('input');
        profileInput.type = 'file'; profileInput.accept = 'image/*'; profileInput.style.display = 'none'; profileInput.id = 'profile-upload-input';
        document.body.appendChild(profileInput);
    }
    profileInput.addEventListener('change', function() { handleImageUpload(this, 'profile'); });

    const avatarCircle = document.getElementById('user-avatar');
    if(avatarCircle) avatarCircle.onclick = (e) => { e.stopPropagation(); profileInput.click(); };

    const userDetails = document.querySelector('.user-details');
    if(userDetails) userDetails.onclick = (e) => { e.stopPropagation(); logoutUser(); };

    const streamOptions = document.querySelectorAll('.stream-option');
    streamOptions.forEach(option => {
        option.addEventListener('click', function() {
            streamOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            const val = this.querySelector('.stream-code').innerText;
            setStream(val);
        });
    });
}

function handleImageUpload(inputElement, type) {
    if (inputElement.files && inputElement.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgData = e.target.result;
            if (type === 'chat') {
                const imgHTML = `<img src="${imgData}" style="max-width:100%; border-radius:10px;">`;
                addBubbleToUI(imgHTML, 'user');
                saveMessageToSession('Sent an image', 'user');
                setTimeout(() => {
                    addBubbleToUI("وصلاتني التصويرة! 📐 (IKED Vision خدام عليها)", 'bot');
                }, 1000);
            } else if (type === 'profile') {
                if(AppState.user) {
                    AppState.user.avatar = imgData;
                    localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user));
                    updateDashboardUI();
                }
            }
        }
        reader.readAsDataURL(inputElement.files[0]);
    }
}

function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        AppState.recognition = new SpeechRecognition();
        AppState.recognition.lang = 'ar-MA';
        AppState.recognition.continuous = false;
        AppState.recognition.interimResults = false;

        AppState.recognition.onstart = function() {
            const micBtn = document.querySelectorAll('.dock-action-btn')[1];
            if(micBtn) micBtn.style.color = '#ef4444'; 
            document.getElementById('chat-input-field').placeholder = "سمعك...";
        };

        AppState.recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            if(transcript.trim().length > 0) {
                document.getElementById('chat-input-field').value = transcript;
                document.querySelector('.dock-send-btn').click();
            }
        };

        AppState.recognition.onend = function() {
            const micBtn = document.querySelectorAll('.dock-action-btn')[1];
            if(micBtn) micBtn.style.color = ''; 
            document.getElementById('chat-input-field').placeholder = "كتب سؤالك...";
        };
    }
}
function triggerMic() { if (AppState.recognition) { try { AppState.recognition.start(); } catch(e) { AppState.recognition.stop(); } } else { alert("المتصفح لا يدعم الصوت"); } }

/* --- History Management --- */
function getSessions() { const s = localStorage.getItem('IKED_SESSIONS'); return s ? JSON.parse(s) : []; }
function saveSessions(s) { localStorage.setItem('IKED_SESSIONS', JSON.stringify(s)); }

function startNewChatSession() {
    const sessions = getSessions();
    const newSession = { id: Date.now(), title: `محادثة ${sessions.length + 1}`, date: new Date().toLocaleDateString('ar-MA'), messages: [] };
    sessions.unshift(newSession); saveSessions(sessions);
    loadChatSession(newSession.id);
}

function loadChatSession(id) {
    AppState.currentSessionId = id;
    const session = getSessions().find(s => s.id === id);
    if (!session) return;
    document.getElementById('chat-messages').innerHTML = '';
    document.querySelector('.header-title h4').innerText = session.title;
    if (session.messages.length === 0) addBubbleToUI("مرحباً! 🚀<br>أنا معاك، فاش نقدر نعاونك؟", 'bot');
    else session.messages.forEach(msg => addBubbleToUI(msg.content, msg.sender)); // هنا قد تحتاج لتحسين إذا أردت عرض الـ HTML المحفوظ
}

function saveMessageToSession(content, sender) {
    if (!AppState.currentSessionId) startNewChatSession();
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === AppState.currentSessionId);
    if (idx !== -1) {
        sessions[idx].messages.push({ content, raw_content: content, sender, timestamp: Date.now() });
        saveSessions(sessions);
    }
}

function renderChatHistory() {
    const listContainer = document.getElementById('chat-history-list');
    listContainer.innerHTML = ''; 
    const sessions = getSessions();
    if (sessions.length === 0) { listContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">لا توجد محادثات</div>'; return; }
    
    sessions.forEach(session => {
        const div = document.createElement('div');
        div.className = `history-item ${session.id === AppState.currentSessionId ? 'active' : ''}`;
        div.innerHTML = `
            <div class="h-content" onclick="loadSessionWrapper(${session.id})">
                <div class="h-title">${session.title}</div>
                <div class="h-date">${session.date}</div>
            </div>
            <div class="h-actions">
                <i class="fas fa-pen edit-icon" onclick="renameSession(event, ${session.id})" style="margin-left:5px;"></i>
                <i class="fas fa-trash edit-icon" onclick="deleteSession(event, ${session.id})" style="color:#ef4444;"></i>
            </div>
        `;
        listContainer.appendChild(div);
    });
}
function deleteSession(e, sessionId) { e.stopPropagation(); if(confirm("واش بصح باغي تمسح هاد المحادثة؟")) { let sessions = getSessions(); sessions = sessions.filter(s => s.id !== sessionId); saveSessions(sessions); renderChatHistory(); if(AppState.currentSessionId === sessionId) startNewChatSession(); } }
function renameSession(e, sessionId) { e.stopPropagation(); const newName = prompt("الاسم الجديد:"); if (newName && newName.trim() !== "") { const sessions = getSessions(); const session = sessions.find(s => s.id === sessionId); if (session) { session.title = newName; saveSessions(sessions); renderChatHistory(); if(AppState.currentSessionId === sessionId) document.querySelector('.header-title h4').innerText = newName; } } }
function loadSessionWrapper(id) { loadChatSession(id); toggleChatDrawer(); }

/* --- UI Helpers --- */
function addBubbleToUI(html, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    div.innerHTML = html;
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    // تفعيل MathJax للمعادلات
    if (window.MathJax) window.MathJax.typesetPromise([div]).catch(()=>{});
}

function showTyping() {
    const div = document.createElement('div'); div.id = 'typing-indicator'; div.className = 'message bot-message';
    div.innerHTML = '<i class="fas fa-ellipsis-h fa-beat"></i>';
    document.getElementById('chat-messages').appendChild(div);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
}
function hideTyping() { const el = document.getElementById('typing-indicator'); if(el) el.remove(); }

function addXP(amount) {
    if(!AppState.user) return;
    AppState.user.xp = (AppState.user.xp || 0) + amount;
    localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user));
    const el = document.getElementById('rb-count');
    if(el) el.innerText = AppState.user.xp;
}

function toggleChatDrawer() {
    const drawer = document.getElementById('chat-drawer');
    const overlay = document.getElementById('chat-drawer-overlay');
    drawer.classList.toggle('open');
    overlay.classList.toggle('visible');
    if (drawer.classList.contains('open')) renderChatHistory();
}

function loadUserData() { const data = localStorage.getItem('IKED_USER_DATA'); if (data) { AppState.user = JSON.parse(data); AppState.isLoggedIn = true; } }
function updateDashboardUI() {
    if (!AppState.user) return;
    document.getElementById('user-name-display').innerText = AppState.user.name;
    const avatarEl = document.getElementById('user-avatar');
    if (AppState.user.avatar) { avatarEl.innerText = ''; avatarEl.style.backgroundImage = `url(${AppState.user.avatar})`; avatarEl.style.backgroundSize = 'cover'; avatarEl.style.backgroundPosition = 'center'; } else { avatarEl.innerText = AppState.user.name.charAt(0).toUpperCase(); avatarEl.style.backgroundImage = 'none'; }
    document.getElementById('user-goal-display').innerText = AppState.user.goal || 'التميز';
    document.getElementById('rb-count').innerText = AppState.user.xp || 0;
}
function completeLogin() {
    const name = document.getElementById('input-name').value; const stream = document.getElementById('input-stream').value; const goal = document.getElementById('input-goal').value;
    if (!name) return;
    AppState.user = { name, stream, goal, xp: 0 };
    localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user));
    updateDashboardUI();
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
}
function setStream(val) { document.getElementById('input-stream').value = val; }
function navTo(id) { document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden')); document.getElementById('view-'+id).classList.remove('hidden'); if (id === 'chat' && !AppState.currentSessionId) startNewChatSession(); }
function logoutUser() { if(confirm("واش باغي تخرج من الحساب؟")) { localStorage.removeItem('IKED_USER_DATA'); location.reload(); } }
