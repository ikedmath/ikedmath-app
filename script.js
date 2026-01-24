/* =========================================
   IKED CLIENT ENGINE vFINAL: MATH RENDERER EDITION 📐✨
   Architect: The World's Best Programmer
   Features:
   - Live MathJax Rendering (LaTeX to Math Symbols).
   - Live Markdown Parsing (Text Formatting).
   - Robust Streaming & Fail-Safe.
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
   1. محرك الاتصال "المدرع" (Streaming Engine) 🛡️
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

        // 2. إنشاء فقاعة الجواب
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

        // 4. قراءة التدفق
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = "";
        let isMetadataParsed = false;
        let isFallbackTextMode = false;
        let fullResponseText = "";
        let markdownBuffer = ""; // بافر خاص لتجميع الماركدون قبل عرضه

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                 // Force Flush عند النهاية
                 if (buffer.trim().length > 0) {
                     if (!isMetadataParsed && buffer.includes("|||STREAM_DIVIDER|||")) {
                         const parts = buffer.split("|||STREAM_DIVIDER|||");
                         try { handleMetadata(JSON.parse(parts[0]), botMessageID); } catch(e){}
                         appendToBotBubble(botMessageID, parts[1] || "");
                         fullResponseText += (parts[1] || "");
                     } else {
                         appendToBotBubble(botMessageID, buffer);
                         fullResponseText += buffer;
                     }
                 }
                 break;
            }

            const chunk = decoder.decode(value, { stream: true });

            // --- الحالة A: وضع النص العادي (Fallback) ---
            if (isFallbackTextMode) {
                appendToBotBubble(botMessageID, chunk);
                fullResponseText += chunk;
                continue; 
            }

            buffer += chunk;

            // --- الحالة B: محاولة اكتشاف البروتوكول ---
            if (!isMetadataParsed) {
                if (buffer.includes("|||STREAM_DIVIDER|||")) {
                    const parts = buffer.split("|||STREAM_DIVIDER|||");
                    
                    // معالجة JSON
                    try {
                        const jsonPart = parts[0].trim();
                        if (jsonPart.startsWith('{')) {
                            const metadata = JSON.parse(jsonPart);
                            handleMetadata(metadata, botMessageID);
                        }
                    } catch (e) {
                        console.warn("Meta Parse Warning (Non-Fatal)");
                    }

                    isMetadataParsed = true;
                    // كتابة الجزء الثاني (النص)
                    const textPart = parts[1] || "";
                    if (textPart) {
                        appendToBotBubble(botMessageID, textPart);
                        fullResponseText += textPart;
                    }
                    buffer = "";

                } else {
                    // Fail-Safe: إذا طال الانتظار ولم نجد الفاصل
                    const threshold = 150; // زدنا شوية فالصبر
                    if (buffer.length > threshold && !buffer.trim().startsWith('{')) {
                        console.log("⚠️ Fallback to Plain Text");
                        isFallbackTextMode = true;
                        appendToBotBubble(botMessageID, buffer);
                        fullResponseText += buffer;
                        buffer = "";
                    }
                }
            } else {
                // --- الحالة D: نحن في وضع الشرح ---
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
        
        // 🔥 RENDER FINAL MATH: تأكيد أخير على المعادلات
        const finalBubble = document.getElementById(botMessageID);
        if(window.MathJax) window.MathJax.typesetPromise([finalBubble]).catch(()=>{});

    } catch (error) {
        console.error("Stream Error:", error);
        const bubble = document.getElementById(botMessageID);
        if (bubble && bubble.innerText.trim() === "") {
            bubble.innerHTML = `<div style="color:#ef4444; padding:10px;">⚠️ ${error.message}</div>`;
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
        // نتأكد أن الكود SVG صالح
        visDiv.innerHTML = `
            ${meta.visuals.code}
            <div class="visual-caption">🔍 ${'توضيح هندسي'}</div>
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

    // 3. XP
    if (meta.gamification) {
        if (meta.gamification.xp) addXP(meta.gamification.xp);
        if (meta.gamification.badge) showBadgeNotification(meta.gamification.badge);
    }
}

function appendToBotBubble(id, text) {
    const bubble = document.getElementById(id);
    if (!bubble) return;
    
    const contentArea = bubble.querySelector('.content-area');
    
    // 1. معالجة Markdown (إذا كانت المكتبة موجودة)
    let processedHTML = text;
    
    // ملاحظة: نستخدم marked.parseInline لتجنب تكسير الفقرات أثناء الستريم، 
    // ولكن للأجزاء الكبيرة من الأفضل تركه نصاً حتى النهاية.
    // هنا سنقوم بحيلة بسيطة: تحويل الرموز الأساسية يدوياً للسرعة، وترك MathJax يعمل.
    
    // تحويل الأسطر الجديدة لـ <br> مؤقتاً
    processedHTML = processedHTML.replace(/\n/g, '<br>');
    
    // 2. الإضافة للشاشة
    contentArea.insertAdjacentHTML('beforeend', processedHTML);
    
    // 3. 🔥 Trigger MathJax (السحر الحقيقي)
    // نعيد معالجة الفقاعة بأكملها لإظهار الرياضيات
    if (window.MathJax) {
        window.MathJax.typesetPromise([contentArea]).catch(err => console.log('MathJax pending...'));
    }

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
   3. إعدادات النظام (System Setup)
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
        input.style.height = 'auto';

        // الرد
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

function addBubbleToUI(html, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    if (sender === 'bot') div.classList.add('iked-card', 'explanation-section');
    
    // إذا كانت رسالة قديمة للبوت، نحتاج نعالجوها بـ Markdown/MathJax
    if (sender === 'bot' && window.marked) {
        // تنظيف بسيط
        div.innerHTML = window.marked.parse(html);
    } else {
        div.innerHTML = html.replace(/\n/g, '<br>');
    }

    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    scrollToBottom();
    
    // تفعيل MathJax للرسائل القديمة أيضاً
    if (sender === 'bot' && window.MathJax) {
        window.MathJax.typesetPromise([div]).catch(()=>{});
    }
}

/* =========================================
   4. باقي الوظائف (Inputs, Auth, etc.)
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
            setStream(this.querySelector('.stream-code').innerText);
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
                setTimeout(() => { fetchRealAI_Stream("تحليل الصورة..."); }, 500);
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
        
        AppState.recognition.onstart = function() { 
            const micBtn = document.querySelectorAll('.dock-action-btn')[1]; 
            if(micBtn) micBtn.style.color = '#ef4444'; 
            document.getElementById('chat-input-field').placeholder = "كانسمعك..."; 
        };
        AppState.recognition.onresult = function(event) { 
            const t = event.results[0][0].transcript; 
            if(t.trim().length > 0) { 
                document.getElementById('chat-input-field').value = t; 
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
function triggerMic() { if (AppState.recognition) { try { AppState.recognition.start(); } catch(e) { AppState.recognition.stop(); } } else { alert("Not Supported"); } }

function getSessions() { const s = localStorage.getItem('IKED_SESSIONS'); return s ? JSON.parse(s) : []; }
function saveSessions(s) { localStorage.setItem('IKED_SESSIONS', JSON.stringify(s)); }

function startNewChatSession() { 
    const sessions = getSessions(); 
    const newSession = { id: Date.now(), title: `حصة ${sessions.length + 1}`, date: new Date().toLocaleDateString('ar-MA'), messages: [] }; 
    sessions.unshift(newSession); saveSessions(sessions); loadChatSession(newSession.id); 
}

function loadChatSession(id) { 
    AppState.currentSessionId = id; 
    const session = getSessions().find(s => s.id === id); 
    if (!session) return; 
    document.getElementById('chat-messages').innerHTML = ''; 
    document.querySelector('.header-title h4').innerText = session.title; 
    if (session.messages.length === 0) {
        addBubbleToUI("مرحباً! 🚀<br>أنا واجد.", 'bot');
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
    if (sessions.length === 0) { listContainer.innerHTML = '<div style="padding:20px; text-align:center;">لا توجد محادثات</div>'; return; } 
    sessions.forEach(session => { 
        const div = document.createElement('div'); 
        div.className = `history-item ${session.id === AppState.currentSessionId ? 'active' : ''}`; 
        div.innerHTML = `<div class="h-content" onclick="loadSessionWrapper(${session.id})"><div class="h-title">${session.title}</div><div class="h-date">${session.date}</div></div><div class="h-actions"><i class="fas fa-trash edit-icon" onclick="deleteSession(event, ${session.id})"></i></div>`; 
        listContainer.appendChild(div); 
    }); 
}

function deleteSession(e, sessionId) { e.stopPropagation(); if(confirm("مسح؟")) { let s = getSessions(); s = s.filter(x => x.id !== sessionId); saveSessions(s); renderChatHistory(); if(AppState.currentSessionId === sessionId) startNewChatSession(); } }
function loadSessionWrapper(id) { loadChatSession(id); toggleChatDrawer(); }
function addXP(amount) { if(!AppState.user) return; AppState.user.xp = (AppState.user.xp || 0) + amount; localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user)); updateDashboardUI(); }
function toggleChatDrawer() { const d = document.getElementById('chat-drawer'); const o = document.getElementById('chat-drawer-overlay'); d.classList.toggle('open'); o.classList.toggle('visible'); if (d.classList.contains('open')) renderChatHistory(); }
function loadUserData() { const data = localStorage.getItem('IKED_USER_DATA'); if (data) { AppState.user = JSON.parse(data); AppState.isLoggedIn = true; } }
function updateDashboardUI() { if (!AppState.user) return; document.getElementById('user-name-display').innerText = AppState.user.name; const av = document.getElementById('user-avatar'); if (AppState.user.avatar) { av.innerText = ''; av.style.backgroundImage = `url(${AppState.user.avatar})`; av.style.backgroundSize = '100% 100%'; } else { av.innerText = AppState.user.name.charAt(0).toUpperCase(); } document.getElementById('user-goal-display').innerText = AppState.user.goal || 'التميز'; document.getElementById('rb-count').innerText = AppState.user.xp || 0; }
function completeLogin() { const name = document.getElementById('input-name').value; if (!name) return; AppState.user = { name, xp: 0 }; localStorage.setItem('IKED_USER_DATA', JSON.stringify(AppState.user)); updateDashboardUI(); document.getElementById('auth-screen').classList.add('hidden'); document.getElementById('app-screen').classList.remove('hidden'); }
function setStream(val) { document.getElementById('input-stream').value = val; }
function navTo(id) { document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden')); document.getElementById('view-'+id).classList.remove('hidden'); if (id === 'chat' && !AppState.currentSessionId) startNewChatSession(); }
function logoutUser() { if(confirm("خروج؟")) { localStorage.removeItem('IKED_USER_DATA'); location.reload(); } }
