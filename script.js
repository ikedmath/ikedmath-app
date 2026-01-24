/* =========================================
   IKED CLIENT ENGINE v7.0 (Streaming & Visuals) 🚀
   Architect: The World's Best Programmer
   Features:
   - Real-Time Streaming Reader
   - Hybrid Protocol Parsing (Metadata ||| Text)
   - Dynamic SVG Rendering
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

    // Splash Screen Logic
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
   1. محرك الاتصال الذكي (Streaming Engine) 🌊
   ========================================= */

async function fetchRealAI_Stream(userText) {
    try {
        // 1. تحضير الذاكرة (Context)
        const sessions = getSessions();
        const currentSession = sessions.find(s => s.id === AppState.currentSessionId);
        let contextHistory = "";
        
        // نأخذ آخر 4 رسائل فقط لتخفيف الحمل
        if (currentSession && currentSession.messages.length > 0) {
            contextHistory = currentSession.messages.slice(-4).map(msg => 
                `${msg.sender === 'user' ? 'Student' : 'Tutor'}: ${msg.raw_content || '...'}`
            ).join('\n');
        }

        const fullPrompt = `[PREVIOUS CONTEXT]:\n${contextHistory}\n\n[CURRENT QUESTION]: ${userText}`;

        // 2. فتح قناة الاتصال
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: fullPrompt,
                userProfile: AppState.user 
            })
        });

        if (!response.ok) throw new Error('Network error');

        // 3. قراءة التدفق (The Reader)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let isMetadataParsed = false;
        let fullResponseText = ""; // لتخزين الجواب كامل من أجل التاريخ
        
        // إنشاء فقاعة الجواب فارغة
        const botMessageID = `msg-${Date.now()}`;
        createEmptyBotBubble(botMessageID);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // أ. محاولة العثور على الفاصل (Metadata Divider)
            if (!isMetadataParsed && buffer.includes("|||STREAM_DIVIDER|||")) {
                const parts = buffer.split("|||STREAM_DIVIDER|||");
                
                // معالجة الجزء الأول (JSON Metadata)
                try {
                    // تنظيف النص من أي فراغات زائدة
                    const cleanJson = parts[0].trim();
                    if(cleanJson) {
                        const metadata = JSON.parse(cleanJson);
                        handleMetadata(metadata, botMessageID); // رسم وتفعيل XP
                    }
                } catch (e) { 
                    console.error("Meta parse error (continuing...)", e); 
                }

                isMetadataParsed = true;
                buffer = parts[1] || ""; // ما تبقى هو بداية النص
            }

            // ب. كتابة النص المتدفق (Streaming Text)
            if (isMetadataParsed) {
                // نكتب فقط إذا كان هناك نص جديد
                if (buffer.length > 0) {
                    appendToBotBubble(botMessageID, buffer);
                    fullResponseText += buffer;
                    buffer = ""; // تفريغ البافر
                }
            }
        }

        // 4. حفظ الجواب النهائي في التاريخ
        saveMessageToSession(fullResponseText, 'bot');
        
        // إزالة مؤشر الكتابة (Cursor)
        document.getElementById(botMessageID).classList.remove('streaming-active');

    } catch (error) {
        console.error("Stream Error:", error);
        document.querySelector('.streaming-active')?.classList.remove('streaming-active');
        addBubbleToUI("⚠️ انقطع الاتصال بالخادم. حاول مرة أخرى.", 'bot');
    }
}

/* =========================================
   2. دوال المعالجة البصرية (Visual Helpers) 🎨
   ========================================= */

function createEmptyBotBubble(id) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message bot-message streaming-active iked-card'; // إضافة كلاس البطاقة
    // هيكل داخلي: مكان للرسم (فوق) ومكان للنص (تحت)
    div.innerHTML = `
        <div class="visual-wrapper"></div>
        <div class="analogy-wrapper"></div>
        <div class="content-area explanation-section"></div>
    `;
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function handleMetadata(meta, msgId) {
    const container = document.getElementById(msgId);
    
    // A. معالجة SVG
    if (meta.visuals && meta.visuals.code && meta.visuals.type !== 'NONE') {
        const visDiv = document.createElement('div');
        visDiv.className = 'visual-container fade-in';
        visDiv.innerHTML = `
            ${meta.visuals.code}
            <div class="visual-caption">🔍 توضيح هندسي</div>
        `;
        container.querySelector('.visual-wrapper').appendChild(visDiv);
    }

    // B. معالجة التشبيه (Analogy)
    if (meta.analogy) {
        const analogyDiv = document.createElement('div');
        analogyDiv.className = 'analogy-box';
        analogyDiv.innerHTML = `<strong>💡 فكرة:</strong> ${meta.analogy}`;
        container.querySelector('.analogy-wrapper').appendChild(analogyDiv);
    }

    // C. معالجة XP وشارات
    if (meta.gamification) {
        if (meta.gamification.xp) addXP(meta.gamification.xp);
        if (meta.gamification.badge) showBadgeNotification(meta.gamification.badge);
    }
}

function appendToBotBubble(id, text) {
    const contentArea = document.getElementById(id).querySelector('.content-area');
    
    // تحويل الأسطر الجديدة لـ BR للحفاظ على التنسيق
    // ملاحظة: Markdown كامل يحتاج مكتبة مثل marked.js، هنا نستخدم تنسيق بسيط للسرعة
    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\n/g, '<br>');

    // نضيف النص الجديد (append)
    // نستخدم insertAdjacentHTML لعدم إعادة رسم النص القديم (أداء أفضل)
    contentArea.insertAdjacentHTML('beforeend', formattedText);
    
    // سكرول للأسفل
    const chatBox = document.getElementById('chat-messages');
    chatBox.scrollTop = chatBox.scrollHeight;

    // تفعيل MathJax (كل فترة أو في النهاية)
    if (window.MathJax && text.includes('$')) {
        // ننتظر قليلاً حتى لا نثقل المتصفح أثناء الكتابة السريعة
        // (يمكن تحسين هذا بتفعيل MathJax فقط عند انتهاء الستريم)
        // window.MathJax.typesetPromise([contentArea]).catch(()=>{});
    }
}

function showBadgeNotification(badgeName) {
    const toast = document.createElement('div');
    toast.className = 'badge-toast';
    toast.innerHTML = `🏆 مبروك! ربحتي وسام: <strong>${badgeName}</strong>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/* =========================================
   3. إعدادات الدردشة (Updated setupChat) 🛠️
   ========================================= */

function setupChat() {
    const sendBtn = document.querySelector('.dock-send-btn');
    const input = document.getElementById('chat-input-field');
    const micBtn = document.querySelectorAll('.dock-action-btn')[1];
    if(micBtn) micBtn.onclick = triggerMic;

    const sendMsg = async () => {
        const txt = input.value.trim();
        if(!txt) return;
        
        // عرض رسالة المستخدم فوراً
        addBubbleToUI(txt, 'user');
        saveMessageToSession(txt, 'user');
        input.value = '';
        
        // استدعاء دالة الستريم الجديدة (بدون انتظار showTyping القديمة)
        await fetchRealAI_Stream(txt);
    };

    if(sendBtn) sendBtn.onclick = sendMsg;
    if(input) input.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMsg(); });
}

/* =========================================
   4. الوظائف المساعدة والقديمة (Helpers) 🧩
   (تم الاحتفاظ بها لضمان عمل باقي التطبيق)
   ========================================= */

function addBubbleToUI(html, sender) {
    // هذه الدالة تستعمل لرسائل المستخدم والتاريخ القديم
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    // إذا كان البوت، نضيف كلاس الكارد للتنسيق
    if (sender === 'bot') div.classList.add('iked-card', 'explanation-section');
    div.innerHTML = html;
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (window.MathJax) window.MathJax.typesetPromise([div]).catch(()=>{});
}

// ... (باقي الدوال: setupInputs, setupVoiceRecognition, History, Auth... بقيت كما هي)
// (قم بنسخها من الكود السابق إذا لم تكن موجودة، أو اتركها كما كانت في ملفك)

/* --- Rest of the Standard Functions (Copy-Paste form previous version) --- */
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
                setTimeout(() => { addBubbleToUI("وصلاتني التصويرة! (جاري التحليل...)", 'bot'); }, 1000);
            } else if (type === 'profile') {
                if(AppState.user) { AppState.user.avatar = imgData; localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user)); updateDashboardUI(); }
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
        AppState.recognition.onstart = function() { const micBtn = document.querySelectorAll('.dock-action-btn')[1]; if(micBtn) micBtn.style.color = '#ef4444'; document.getElementById('chat-input-field').placeholder = "سمعك..."; };
        AppState.recognition.onresult = function(event) { const transcript = event.results[0][0].transcript; if(transcript.trim().length > 0) { document.getElementById('chat-input-field').value = transcript; document.querySelector('.dock-send-btn').click(); } };
        AppState.recognition.onend = function() { const micBtn = document.querySelectorAll('.dock-action-btn')[1]; if(micBtn) micBtn.style.color = ''; document.getElementById('chat-input-field').placeholder = "كتب سؤالك..."; };
    }
}
function triggerMic() { if (AppState.recognition) { try { AppState.recognition.start(); } catch(e) { AppState.recognition.stop(); } } else { alert("المتصفح لا يدعم الصوت"); } }
function getSessions() { const s = localStorage.getItem('IKED_SESSIONS'); return s ? JSON.parse(s) : []; }
function saveSessions(s) { localStorage.setItem('IKED_SESSIONS', JSON.stringify(s)); }
function startNewChatSession() { const sessions = getSessions(); const newSession = { id: Date.now(), title: `محادثة ${sessions.length + 1}`, date: new Date().toLocaleDateString('ar-MA'), messages: [] }; sessions.unshift(newSession); saveSessions(sessions); loadChatSession(newSession.id); }
function loadChatSession(id) { AppState.currentSessionId = id; const session = getSessions().find(s => s.id === id); if (!session) return; document.getElementById('chat-messages').innerHTML = ''; document.querySelector('.header-title h4').innerText = session.title; if (session.messages.length === 0) addBubbleToUI("مرحباً! 🚀<br>أنا معاك، فاش نقدر نعاونك؟", 'bot'); else session.messages.forEach(msg => addBubbleToUI(msg.content, msg.sender)); }
function saveMessageToSession(content, sender) { if (!AppState.currentSessionId) startNewChatSession(); const sessions = getSessions(); const idx = sessions.findIndex(s => s.id === AppState.currentSessionId); if (idx !== -1) { sessions[idx].messages.push({ content, raw_content: content, sender, timestamp: Date.now() }); saveSessions(sessions); } }
function renderChatHistory() { const listContainer = document.getElementById('chat-history-list'); listContainer.innerHTML = ''; const sessions = getSessions(); if (sessions.length === 0) { listContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">لا توجد محادثات</div>'; return; } sessions.forEach(session => { const div = document.createElement('div'); div.className = `history-item ${session.id === AppState.currentSessionId ? 'active' : ''}`; div.innerHTML = `<div class="h-content" onclick="loadSessionWrapper(${session.id})"><div class="h-title">${session.title}</div><div class="h-date">${session.date}</div></div><div class="h-actions"><i class="fas fa-pen edit-icon" onclick="renameSession(event, ${session.id})" style="margin-left:5px;"></i><i class="fas fa-trash edit-icon" onclick="deleteSession(event, ${session.id})" style="color:#ef4444;"></i></div>`; listContainer.appendChild(div); }); }
function deleteSession(e, sessionId) { e.stopPropagation(); if(confirm("واش بصح باغي تمسح هاد المحادثة؟")) { let sessions = getSessions(); sessions = sessions.filter(s => s.id !== sessionId); saveSessions(sessions); renderChatHistory(); if(AppState.currentSessionId === sessionId) startNewChatSession(); } }
function renameSession(e, sessionId) { e.stopPropagation(); const newName = prompt("الاسم الجديد:"); if (newName && newName.trim() !== "") { const sessions = getSessions(); const session = sessions.find(s => s.id === sessionId); if (session) { session.title = newName; saveSessions(sessions); renderChatHistory(); if(AppState.currentSessionId === sessionId) document.querySelector('.header-title h4').innerText = newName; } } }
function loadSessionWrapper(id) { loadChatSession(id); toggleChatDrawer(); }
function addXP(amount) { if(!AppState.user) return; AppState.user.xp = (AppState.user.xp || 0) + amount; localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user)); const el = document.getElementById('rb-count'); if(el) el.innerText = AppState.user.xp; }
function toggleChatDrawer() { const drawer = document.getElementById('chat-drawer'); const overlay = document.getElementById('chat-drawer-overlay'); drawer.classList.toggle('open'); overlay.classList.toggle('visible'); if (drawer.classList.contains('open')) renderChatHistory(); }
function loadUserData() { const data = localStorage.getItem('IKED_USER_DATA'); if (data) { AppState.user = JSON.parse(data); AppState.isLoggedIn = true; } }
function updateDashboardUI() { if (!AppState.user) return; document.getElementById('user-name-display').innerText = AppState.user.name; const avatarEl = document.getElementById('user-avatar'); if (AppState.user.avatar) { avatarEl.innerText = ''; avatarEl.style.backgroundImage = `url(${AppState.user.avatar})`; avatarEl.style.backgroundSize = 'cover'; avatarEl.style.backgroundPosition = 'center'; } else { avatarEl.innerText = AppState.user.name.charAt(0).toUpperCase(); avatarEl.style.backgroundImage = 'none'; } document.getElementById('user-goal-display').innerText = AppState.user.goal || 'التميز'; document.getElementById('rb-count').innerText = AppState.user.xp || 0; }
function completeLogin() { const name = document.getElementById('input-name').value; const stream = document.getElementById('input-stream').value; const goal = document.getElementById('input-goal').value; if (!name) return; AppState.user = { name, stream, goal, xp: 0 }; localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user)); updateDashboardUI(); document.getElementById('auth-screen').classList.add('hidden'); document.getElementById('app-screen').classList.remove('hidden'); }
function setStream(val) { document.getElementById('input-stream').value = val; }
function navTo(id) { document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden')); document.getElementById('view-'+id).classList.remove('hidden'); if (id === 'chat' && !AppState.currentSessionId) startNewChatSession(); }
function logoutUser() { if(confirm("واش باغي تخرج من الحساب؟")) { localStorage.removeItem('IKED_USER_DATA'); location.reload(); } }
