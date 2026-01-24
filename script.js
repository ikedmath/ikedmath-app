/* =========================================
   IKED CLIENT ENGINE v8.0 (Robust Streaming & Fail-Safe) 🛡️
   Architect: The World's Best Programmer
   Features:
   - "Smart Fallback": Detects if response is JSON or Plain Text automatically.
   - Fixes "Empty Bubble" issue permanently.
   - Handles partial streams gracefully.
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
   1. محرك الاتصال "المدرع" (Robust Streaming Engine) 🛡️
   ========================================= */

async function fetchRealAI_Stream(userText) {
    let botMessageID = `msg-${Date.now()}`;
    let isStreamActive = false;

    try {
        // 1. تحضير السياق
        const sessions = getSessions();
        const currentSession = sessions.find(s => s.id === AppState.currentSessionId);
        let contextHistory = "";
        
        if (currentSession && currentSession.messages.length > 0) {
            contextHistory = currentSession.messages.slice(-4).map(msg => 
                `${msg.sender === 'user' ? 'Student' : 'Tutor'}: ${msg.raw_content || '...'}`
            ).join('\n');
        }

        const fullPrompt = `[HISTORY]:\n${contextHistory}\n\n[USER]: ${userText}`;

        // 2. إنشاء فقاعة الجواب (فارغة في البداية)
        createEmptyBotBubble(botMessageID);
        isStreamActive = true;

        // 3. الاتصال
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: fullPrompt,
                userProfile: AppState.user 
            })
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        // 4. قراءة التدفق (The Logic Core)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = "";
        let isMetadataParsed = false;       // هل تم استخراج JSON؟
        let isFallbackTextMode = false;     // هل فشل البروتوكول وتحولنا لنص عادي؟
        let fullResponseText = "";          // لتخزين النص النهائي

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // --- الحالة A: وضع النص العادي (Fallback) ---
            // إذا قررنا سابقاً أن الجواب نص عادي، نكتب فوراً
            if (isFallbackTextMode) {
                appendToBotBubble(botMessageID, chunk);
                fullResponseText += chunk;
                continue; 
            }

            buffer += chunk;

            // --- الحالة B: محاولة اكتشاف البروتوكول ---
            if (!isMetadataParsed) {
                // هل وجدنا الفاصل السري؟
                if (buffer.includes("|||STREAM_DIVIDER|||")) {
                    const parts = buffer.split("|||STREAM_DIVIDER|||");
                    
                    // محاولة قراءة JSON (الجزء الأول)
                    try {
                        const jsonPart = parts[0].trim();
                        if (jsonPart.startsWith('{')) {
                            const metadata = JSON.parse(jsonPart);
                            handleMetadata(metadata, botMessageID); // تفعيل الرسوميات
                        }
                    } catch (e) {
                        console.warn("JSON Parse Warning:", e);
                        // إذا فشل الـ JSON، لا نتوقف، نكمل كأنه نص
                    }

                    isMetadataParsed = true;
                    // كتابة الجزء الثاني (النص) فوراً
                    const textPart = parts[1] || "";
                    if (textPart) {
                        appendToBotBubble(botMessageID, textPart);
                        fullResponseText += textPart;
                    }
                    buffer = ""; // تفريغ البافر

                } else {
                    // --- الحالة C: قرار المصير (Fail-Safe) ---
                    // إذا امتلأ البافر ولم نجد الفاصل، أو إذا لم يبدأ بـ "{"
                    // هذا يعني أن الموديل أجاب بنص عادي ولم يحترم البروتوكول
                    // الحل: نعتبر كل شيء نصاً ونعرضه فوراً (لحل مشكلة المربع الفارغ)
                    
                    const threshold = 50; // عدد الأحرف للانتظار
                    if (buffer.length > threshold && !buffer.trim().startsWith('{')) {
                        console.log("⚠️ Switching to Fallback Mode (Plain Text)");
                        isFallbackTextMode = true;
                        appendToBotBubble(botMessageID, buffer); // اطبع ما في البافر
                        fullResponseText += buffer;
                        buffer = "";
                    }
                }
            } else {
                // --- الحالة D: نحن في وضع البروتوكول، والنص يتدفق ---
                // buffer هنا يحتوي فقط على الـ chunks الجديدة للنص
                if (buffer.length > 0) {
                    appendToBotBubble(botMessageID, buffer);
                    fullResponseText += buffer;
                    buffer = "";
                }
            }
        }

        // 5. إنهاء وحفظ
        saveMessageToSession(fullResponseText, 'bot');
        document.getElementById(botMessageID).classList.remove('streaming-active');

    } catch (error) {
        console.error("Critical Stream Error:", error);
        // إذا وقع خطأ والفقاعة فارغة، نكتب رسالة خطأ
        const bubble = document.getElementById(botMessageID);
        if (bubble && bubble.innerText.trim() === "") {
            bubble.innerHTML = `<div style="color:#ef4444; padding:10px;">⚠️ ${error.message || "عذرًا، حدث خطأ في الاتصال."}</div>`;
        }
        if (isStreamActive) document.getElementById(botMessageID)?.classList.remove('streaming-active');
    }
}

/* =========================================
   2. دوال العرض البصري (Visual Helpers) 🎨
   ========================================= */

function createEmptyBotBubble(id) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message bot-message streaming-active iked-card';
    // تقسيم داخلي منظم
    div.innerHTML = `
        <div class="visual-wrapper"></div>
        <div class="analogy-wrapper"></div>
        <div class="content-area explanation-section" dir="auto"></div>
    `;
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    scrollToBottom();
}

function handleMetadata(meta, msgId) {
    const container = document.getElementById(msgId);
    if (!container) return;

    // 1. SVG
    if (meta.visuals && meta.visuals.code && meta.visuals.type === 'SVG') {
        const visDiv = document.createElement('div');
        visDiv.className = 'visual-container fade-in';
        visDiv.innerHTML = `
            ${meta.visuals.code}
            <div class="visual-caption">🔍 ${meta.meta?.topic || 'توضيح هندسي'}</div>
        `;
        container.querySelector('.visual-wrapper').appendChild(visDiv);
    }

    // 2. Analogy
    if (meta.analogy) {
        const analogyDiv = document.createElement('div');
        analogyDiv.className = 'analogy-box';
        analogyDiv.innerHTML = `<strong>💡 فكرة:</strong> ${meta.analogy}`;
        container.querySelector('.analogy-wrapper').appendChild(analogyDiv);
    }

    // 3. XP & Badges
    if (meta.gamification) {
        if (meta.gamification.xp) addXP(meta.gamification.xp);
        if (meta.gamification.badge) showBadgeNotification(meta.gamification.badge);
    }
}

function appendToBotBubble(id, text) {
    const bubble = document.getElementById(id);
    if (!bubble) return;
    
    const contentArea = bubble.querySelector('.content-area');
    
    // تنسيق بسيط للنص المتدفق
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (.*?)\n/g, '<h4>$1</h4>')
        .replace(/\n/g, '<br>');

    contentArea.insertAdjacentHTML('beforeend', formatted);
    scrollToBottom();
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    container.scrollTop = container.scrollHeight;
}

function showBadgeNotification(badgeName) {
    const toast = document.createElement('div');
    toast.className = 'badge-toast';
    toast.innerHTML = `<span style="font-size:20px">🏅</span> <div>مبروك! وسام جديد:<br><strong>${badgeName}</strong></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

/* =========================================
   3. إعدادات النظام (System Setup) 🛠️
   ========================================= */

function setupChat() {
    const sendBtn = document.querySelector('.dock-send-btn');
    const input = document.getElementById('chat-input-field');
    const micBtn = document.querySelectorAll('.dock-action-btn')[1]; // Assuming 2nd btn is mic
    
    if(micBtn) micBtn.onclick = triggerMic;

    const sendMsg = async () => {
        const txt = input.value.trim();
        if(!txt) return;
        
        // UI فورية
        addBubbleToUI(txt, 'user');
        saveMessageToSession(txt, 'user');
        input.value = '';
        input.style.height = 'auto'; // Reset height if textarea

        // استدعاء الذكاء الاصطناعي
        await fetchRealAI_Stream(txt);
    };

    if(sendBtn) sendBtn.onclick = sendMsg;
    if(input) input.addEventListener('keypress', (e) => { 
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            sendMsg(); 
        }
    });
}

// Helper: إضافة فقاعة عادية (للمستخدم أو للتاريخ القديم)
function addBubbleToUI(html, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    if (sender === 'bot') div.classList.add('iked-card', 'explanation-section');
    div.innerHTML = html;
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    scrollToBottom();
}

/* =========================================
   4. باقي الوظائف (Authentication, History, Voice) 🧩
   ========================================= */

function setupInputs() {
    // Camera
    const cameraInput = document.getElementById('camera-input');
    if(cameraInput) cameraInput.addEventListener('change', function() { handleImageUpload(this, 'chat'); });
    
    // Profile Upload
    let profileInput = document.getElementById('profile-upload-input');
    if (!profileInput) {
        profileInput = document.createElement('input');
        profileInput.type = 'file'; profileInput.accept = 'image/*'; profileInput.style.display = 'none'; profileInput.id = 'profile-upload-input';
        document.body.appendChild(profileInput);
    }
    profileInput.addEventListener('change', function() { handleImageUpload(this, 'profile'); });
    
    // Avatar Click
    const avatarCircle = document.getElementById('user-avatar');
    if(avatarCircle) avatarCircle.onclick = (e) => { e.stopPropagation(); profileInput.click(); };
    
    // Logout
    const userDetails = document.querySelector('.user-details');
    if(userDetails) userDetails.onclick = (e) => { e.stopPropagation(); logoutUser(); };

    // Stream Selection
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
                // محاكاة رد سريع للصورة
                setTimeout(() => { 
                    fetchRealAI_Stream("حلل لي هذه الصورة (محاكاة)"); 
                }, 500);
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

// Voice Recognition
function setupVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        AppState.recognition = new SpeechRecognition();
        AppState.recognition.lang = 'ar-MA'; // الدارجة المغربية
        AppState.recognition.continuous = false;
        
        AppState.recognition.onstart = function() { 
            const micBtn = document.querySelectorAll('.dock-action-btn')[1]; 
            if(micBtn) micBtn.style.color = '#ef4444'; 
            document.getElementById('chat-input-field').placeholder = "كانسمعك..."; 
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
function triggerMic() { 
    if (AppState.recognition) { 
        try { AppState.recognition.start(); } catch(e) { AppState.recognition.stop(); } 
    } else { alert("المتصفح لا يدعم الصوت"); } 
}

// Session Management
function getSessions() { const s = localStorage.getItem('IKED_SESSIONS'); return s ? JSON.parse(s) : []; }
function saveSessions(s) { localStorage.setItem('IKED_SESSIONS', JSON.stringify(s)); }

function startNewChatSession() { 
    const sessions = getSessions(); 
    const newSession = { 
        id: Date.now(), 
        title: `حصة ${sessions.length + 1}`, 
        date: new Date().toLocaleDateString('ar-MA'), 
        messages: [] 
    }; 
    sessions.unshift(newSession); 
    saveSessions(sessions); 
    loadChatSession(newSession.id); 
}

function loadChatSession(id) { 
    AppState.currentSessionId = id; 
    const session = getSessions().find(s => s.id === id); 
    if (!session) return; 
    
    document.getElementById('chat-messages').innerHTML = ''; 
    document.querySelector('.header-title h4').innerText = session.title; 
    
    if (session.messages.length === 0) {
        addBubbleToUI("مرحباً! 🚀<br>أنا واجد. شنو باغي تراجع اليوم؟", 'bot');
    } else {
        session.messages.forEach(msg => addBubbleToUI(msg.content, msg.sender)); 
    }
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
    
    if (sessions.length === 0) { 
        listContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">لا توجد محادثات</div>'; return; 
    } 
    
    sessions.forEach(session => { 
        const div = document.createElement('div'); 
        div.className = `history-item ${session.id === AppState.currentSessionId ? 'active' : ''}`; 
        div.innerHTML = `
            <div class="h-content" onclick="loadSessionWrapper(${session.id})">
                <div class="h-title">${session.title}</div>
                <div class="h-date">${session.date}</div>
            </div>
            <div class="h-actions">
                <i class="fas fa-trash edit-icon" onclick="deleteSession(event, ${session.id})" style="color:#ef4444;"></i>
            </div>
        `; 
        listContainer.appendChild(div); 
    }); 
}

function deleteSession(e, sessionId) { 
    e.stopPropagation(); 
    if(confirm("مسح هاد المحادثة؟")) { 
        let sessions = getSessions(); 
        sessions = sessions.filter(s => s.id !== sessionId); 
        saveSessions(sessions); 
        renderChatHistory(); 
        if(AppState.currentSessionId === sessionId) startNewChatSession(); 
    } 
}
function loadSessionWrapper(id) { loadChatSession(id); toggleChatDrawer(); }

// User Data & Auth
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
    if(drawer && overlay) {
        drawer.classList.toggle('open'); 
        overlay.classList.toggle('visible'); 
        if (drawer.classList.contains('open')) renderChatHistory(); 
    }
}

function loadUserData() { 
    const data = localStorage.getItem('IKED_USER_DATA'); 
    if (data) { 
        AppState.user = JSON.parse(data); 
        AppState.isLoggedIn = true; 
    } 
}

function updateDashboardUI() { 
    if (!AppState.user) return; 
    
    // تحديث الاسم
    const nameEl = document.getElementById('user-name-display');
    if(nameEl) nameEl.innerText = AppState.user.name;
    
    // تحديث الصورة
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
        if (AppState.user.avatar) { 
            avatarEl.innerText = ''; 
            avatarEl.style.backgroundImage = `url(${AppState.user.avatar})`; 
            avatarEl.style.backgroundSize = 'cover'; 
            avatarEl.style.backgroundPosition = 'center'; 
        } else { 
            avatarEl.innerText = AppState.user.name.charAt(0).toUpperCase(); 
            avatarEl.style.backgroundImage = 'none'; 
        }
    }
    
    // تحديث الهدف و XP
    const goalEl = document.getElementById('user-goal-display');
    if(goalEl) goalEl.innerText = AppState.user.goal || 'التميز';
    const xpEl = document.getElementById('rb-count');
    if(xpEl) xpEl.innerText = AppState.user.xp || 0;
}

function completeLogin() { 
    const name = document.getElementById('input-name').value; 
    const stream = document.getElementById('input-stream').value; 
    const goal = document.getElementById('input-goal').value; 
    
    if (!name) { alert("كتب سميتك بعدا!"); return; }
    
    AppState.user = { name, stream, goal, xp: 0 }; 
    localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user)); 
    
    updateDashboardUI(); 
    document.getElementById('auth-screen').classList.add('hidden'); 
    document.getElementById('app-screen').classList.remove('hidden'); 
}

function setStream(val) { document.getElementById('input-stream').value = val; }
function navTo(id) { 
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden')); 
    const view = document.getElementById('view-'+id);
    if(view) view.classList.remove('hidden'); 
    
    if (id === 'chat' && !AppState.currentSessionId) startNewChatSession(); 
}
function logoutUser() { 
    if(confirm("واش باغي تخرج؟")) { 
        localStorage.removeItem('IKED_USER_DATA'); 
        location.reload(); 
    } 
}
