/* =========================================
   IKED CLIENT ENGINE vFINAL: DIAMOND EDITION 💎
   Architect: The World's Best Programmer
   Features:
   - NDJSON Streaming (Zero Latency).
   - Live MathJax & Markdown Rendering.
   - Robust Vision & Event Handling.
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
   1. محرك الاتصال "الفيراري" (Diamond Engine) 💎🏎️
   ========================================= */

async function fetchRealAI_Stream(userText, imageData = null) {
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

        // 3. الاتصال (مع طلب NDJSON)
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: fullPrompt,
                userProfile: AppState.user,
                image: imageData // إرسال الصورة إذا وجدت
            })
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        // 4. قراءة التدفق (NDJSON Stream Loop)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = ""; // مخزن مؤقت للأسطر المقطوعة
        let fullResponseText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // تقسيم البيانات إلى أسطر
            const lines = buffer.split("\n");
            
            // نحتفظ بآخر جزء لأنه قد يكون غير مكتمل ونعالجه في الدورة التالية
            buffer = lines.pop(); 

            for (const line of lines) {
                if (line.trim() === "") continue;

                try {
                    const event = JSON.parse(line);

                    // --- معالجة الأحداث (Event Handling) ---
                    
                    if (event.type === "text") {
                        // 1. حدث نصي
                        appendToBotBubble(botMessageID, event.content);
                        fullResponseText += event.content;
                    } 
                    else if (event.type === "visual") {
                        // 2. حدث مرئي (رسم)
                        renderVisualEvent(event, botMessageID);
                        // معالجة الـ XP إذا وجد
                        if (event.gamification && event.gamification.xp) {
                            addXP(event.gamification.xp);
                        }
                    }
                    else if (event.type === "error") {
                        // 3. حدث خطأ من السيرفر
                        appendToBotBubble(botMessageID, `<br><span style="color:red">⚠️ ${event.message}</span>`);
                    }

                } catch (e) {
                    console.error("JSON Parse Error (Line skipped):", e, line);
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

// دالة جديدة لمعالجة الرسم بناءً على النظام الجديد
function renderVisualEvent(event, msgId) {
    const container = document.getElementById(msgId);
    if (!container) return;

    if (event.data && event.data.type === 'SVG') {
        const visDiv = document.createElement('div');
        visDiv.className = 'visual-container fade-in';
        // إضافة الرسم
        visDiv.innerHTML = `
            ${event.data.code}
            <div class="visual-caption">🔍 توضيح هندسي</div>
        `;
        // إضافته في مكانه المخصص
        container.querySelector('.visual-wrapper').appendChild(visDiv);
    }
}

function appendToBotBubble(id, text) {
    const bubble = document.getElementById(id);
    if (!bubble) return;
    
    const contentArea = bubble.querySelector('.content-area');
    
    // معالجة أولية للنص (تحويل الأسطر الجديدة)
    let processedHTML = text.replace(/\n/g, '<br>');
    
    // دعم Markdown بسيط (Bold)
    processedHTML = processedHTML.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // الإضافة للشاشة
    contentArea.insertAdjacentHTML('beforeend', processedHTML);
    
    // 🔥 Trigger MathJax (Live Rendering)
    if (window.MathJax) {
        window.MathJax.typesetPromise([contentArea]).catch(err => {}); // Silent catch
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

        // الرد (بدون صورة هنا)
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
    
    // معالجة الرسائل القديمة (Markdown بسيط)
    let content = html.replace(/\n/g, '<br>');
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    div.innerHTML = content;

    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    scrollToBottom();
    
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
                
                // 🔥 إرسال الصورة للسيرفر للتحليل (التحديث المهم)
                setTimeout(() => { 
                    fetchRealAI_Stream("قم بتحليل هذه الصورة وحل التمرين الموجود فيها:", imgData); 
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
