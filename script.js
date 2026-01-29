/* =========================================
   IKED CLIENT ENGINE vFINAL: HYBRID DIAMOND 💎
   Architect: The World's Best Programmer
   Features:
   - Hybrid Logic: Backend interprets -> Frontend Renders 🏎️
   - High Performance Canvas Math Engine 💪
   - Live MathJax & Markdown Rendering
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
        const splash = document.getElementById('splash-screen');
        if(splash) splash.classList.add('hidden');
        
        if (AppState.isLoggedIn) {
            document.getElementById('app-screen').classList.remove('hidden');
            updateDashboardUI();
        } else {
            document.getElementById('auth-screen').classList.remove('hidden');
        }
    }, 2000);
});

/* =========================================
   1. محرك الاتصال "الفيراري" (Stream Engine) 💎🏎️
   ========================================= */

async function fetchRealAI_Stream(userText, imageData = null) {
    let botMessageID = `msg-${Date.now()}`;
    
    try {
        // 1. تحضير السياق (Context)
        const sessions = getSessions();
        const currentSession = sessions.find(s => s.id === AppState.currentSessionId);
        let contextHistory = "";
        
        if (currentSession && currentSession.messages.length > 0) {
            contextHistory = currentSession.messages.slice(-4).map(msg => 
                `${msg.sender === 'user' ? 'Student' : 'Tutor'}: ${msg.raw_content || '...'}`
            ).join('\n');
        }

        const fullPrompt = `[HISTORY]:\n${contextHistory}\n\n[USER]: ${userText}`;

        // 2. إنشاء فقاعة الجواب فارغة
        createEmptyBotBubble(botMessageID);

        // 3. الاتصال بالسيرفر
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: fullPrompt,
                userProfile: AppState.user,
                image: imageData
            })
        });

        if (!response.ok) throw new Error(`Server Error: ${response.status}`);

        // 4. قراءة التدفق (NDJSON Stream Loop)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = ""; 
        let fullResponseText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split("\n");
            buffer = lines.pop(); 

            for (const line of lines) {
                if (line.trim() === "") continue;

                try {
                    const event = JSON.parse(line);

                    // --- معالجة الأحداث (Event Handling) ---
                    
                    // A. حدث نصي عادي
                    if (event.type === "text") {
                        appendToBotBubble(botMessageID, event.content);
                        fullResponseText += event.content;
                    } 
                    // B. 🔥 حدث أمر (رسم هندسي) - الجديد
                    else if (event.type === "command" && event.cmd === "PLOT") {
                        // تشغيل محرك الرسم القوي
                        executeMathPlot(event.data);
                        
                        // إضافة نقاط الخبرة
                        if (event.gamification && event.gamification.xp) {
                            addXP(event.gamification.xp);
                        }
                    }
                    // C. حدث خطأ
                    else if (event.type === "error") {
                        appendToBotBubble(botMessageID, `<br><span style="color:#ef4444">⚠️ ${event.message}</span>`);
                    }

                } catch (e) {
                    console.warn("JSON Parse Error (skipping line):", line);
                }
            }
        }

        saveMessageToSession(fullResponseText, 'bot');
        const finalBubble = document.getElementById(botMessageID);
        if(finalBubble) finalBubble.classList.remove('streaming-active');
        
        if(window.MathJax && finalBubble) {
            window.MathJax.typesetPromise([finalBubble]).catch(()=>{});
        }

    } catch (error) {
        console.error("Stream Error:", error);
        const bubble = document.getElementById(botMessageID);
        if (bubble) {
            if (bubble.innerText.trim() === "") {
                bubble.innerHTML = `<div style="color:#ef4444; padding:10px;">⚠️ تعذر الاتصال: ${error.message}</div>`;
            }
            bubble.classList.remove('streaming-active');
        }
    }
}

/* =========================================
   2. IKED MATH RENDERER (The Muscle) 💪
   - High Performance Canvas
   - Adaptive Sampling
   - Proper Coordinate System
   ========================================= */

function executeMathPlot(data) {
    const messageId = `plot-${Date.now()}`;
    // ننشئ Canvas خاص بالرسم
    createCanvasBubble(messageId);
    
    // نعطي مهلة صغيرة للتأكد من أن العنصر تم إنشاؤه في DOM
    setTimeout(() => {
        const canvas = document.getElementById(messageId);
        if(!canvas) return;
        
        const ctx = canvas.getContext('2d');
        // دعم الشاشات عالية الدقة (Retina Support)
        const displayWidth = canvas.parentElement.offsetWidth;
        const width = canvas.width = displayWidth * 2; 
        const height = canvas.height = 300 * 2; 
        
        canvas.style.width = '100%'; 
        canvas.style.height = '300px';
        ctx.scale(2, 2); 

        const activeWidth = width / 2;
        const activeHeight = 300;

        // 1. Math State
        const expression = data.expression;
        const xRange = [data.xMin || -10, data.xMax || 10];
        // حساب مجال Y مبدئياً (يمكن جعله ديناميكياً لاحقاً)
        const yRange = [-10, 10]; 

        // 2. Coordinate Mapper (The Translator)
        // تحويل X من الرياضيات إلى بيكسلات الشاشة
        const mapX = (x) => ((x - xRange[0]) / (xRange[1] - xRange[0])) * activeWidth;
        
        // 🔥 تحويل Y من الرياضيات إلى الشاشة (هنا نقلب المحور Y)
        // لأن في Canvas الـ (0,0) هي الزاوية العليا اليسرى
        const mapY = (y) => activeHeight - (((y - yRange[0]) / (yRange[1] - yRange[0])) * activeHeight);

        // 3. رسم الخلفية والمحاور والشبكة
        drawGrid(ctx, activeWidth, activeHeight, mapX, mapY, xRange, yRange);

        // 4. حلقة الرسم (Sampling Loop) بقوة 2000 نقطة
        ctx.beginPath();
        ctx.strokeStyle = "#3b82f6"; // لون أزرق IKED المميز
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";

        const steps = 2000; // دقة عالية جداً للمنحنيات
        let firstPoint = true;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const xMath = xRange[0] + t * (xRange[1] - xRange[0]);
            
            try {
                // تقييم الدالة بأمان (Basic JS Evaluation)
                // تحويل صيغة بايثون إلى جافاسكريبت بسيطة (مثل ^ إلى **)
                const evalStr = expression.replace(/\^/g, '**').replace(/x/g, `(${xMath})`);
                
                // تنبيه: eval خطيرة، لكن في هذا السياق المتحكم فيه مقبولة للنسخة الأولى
                // للمحترفين: استخدم مكتبة Math.js مستقبلاً
                const yMath = eval(evalStr); 

                if (isFinite(yMath)) {
                    const px = mapX(xMath);
                    const py = mapY(yMath);
                    
                    // قطع الخط إذا خرج عن حدود الرسم (Clipping Logic بسيط)
                    if (py < -50 || py > activeHeight + 50) {
                         firstPoint = true;
                    } else {
                        if (firstPoint) { ctx.moveTo(px, py); firstPoint = false; }
                        else { ctx.lineTo(px, py); }
                    }
                } else {
                    firstPoint = true; // قطع الخط عند القيم غير المعرفة
                }
            } catch (e) { 
                // تجاهل الأخطاء الحسابية (مثل القسمة على صفر)
            }
        }
        ctx.stroke();

    }, 100);
}

function createCanvasBubble(id) {
    const div = document.createElement('div');
    div.className = 'message bot-message iked-card';
    // هيكل الرسم
    div.innerHTML = `
        <div style="position: relative; width: 100%;">
            <canvas id="${id}" style="border-radius: 8px; cursor: crosshair;"></canvas>
        </div>
        <div class="visual-caption">📉 تمثيل بياني دقيق</div>
    `;
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    scrollToBottom();
}

function drawGrid(ctx, w, h, mapX, mapY, xR, yR) {
    // خلفية داكنة احترافية
    ctx.fillStyle = "#0f172a"; 
    ctx.fillRect(0, 0, w, h);
    
    ctx.lineWidth = 0.5;

    // رسم الشبكة الثانوية (Grid Lines)
    ctx.strokeStyle = "#1e293b"; 
    ctx.beginPath();
    
    // خطوط عمودية تقريبية
    for (let x = Math.ceil(xR[0]); x <= Math.floor(xR[1]); x++) {
        const px = mapX(x);
        ctx.moveTo(px, 0); ctx.lineTo(px, h);
    }
    // خطوط أفقية تقريبية
    for (let y = Math.ceil(yR[0]); y <= Math.floor(yR[1]); y++) {
        const py = mapY(y);
        ctx.moveTo(0, py); ctx.lineTo(w, py);
    }
    ctx.stroke();

    // رسم المحاور الرئيسية (Axes)
    ctx.strokeStyle = "#94a3b8"; // لون فاتح للمحاور
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const zeroX = mapX(0);
    const zeroY = mapY(0);

    // محور الأفاصيل (X Axis)
    if (zeroY >= 0 && zeroY <= h) {
        ctx.moveTo(0, zeroY); ctx.lineTo(w, zeroY);
    }
    // محور الأراتيب (Y Axis)
    if (zeroX >= 0 && zeroX <= w) {
        ctx.moveTo(zeroX, 0); ctx.lineTo(zeroX, h);
    }
    ctx.stroke();
}

/* =========================================
   3. دوال العرض البصري (Visual Helpers) 🎨
   ========================================= */

function createEmptyBotBubble(id) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message bot-message streaming-active iked-card';
    div.innerHTML = `
        <div class="visual-wrapper"></div>
        <div class="content-area explanation-section" dir="auto"></div>
    `;
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    scrollToBottom();
}

function appendToBotBubble(id, text) {
    const bubble = document.getElementById(id);
    if (!bubble) return;
    
    const contentArea = bubble.querySelector('.content-area');
    
    // تنسيق النص
    let processedHTML = text.replace(/\n/g, '<br>');
    processedHTML = processedHTML.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    contentArea.insertAdjacentHTML('beforeend', processedHTML);
    
    // Live Rendering MathJax
    if (window.MathJax) {
        window.MathJax.typesetPromise([contentArea]).catch(err => {}); 
    }

    scrollToBottom();
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if(container) container.scrollTop = container.scrollHeight;
}

/* =========================================
   4. إعدادات النظام (System Setup)
   ========================================= */

function setupChat() {
    const sendBtn = document.querySelector('.dock-send-btn');
    const input = document.getElementById('chat-input-field');
    const micBtn = document.querySelectorAll('.dock-action-btn')[1];
    
    if(micBtn) micBtn.onclick = triggerMic;

    const sendMsg = async () => {
        const txt = input.value.trim();
        if(!txt) return;
        
        addBubbleToUI(txt, 'user');
        saveMessageToSession(txt, 'user');
        input.value = '';
        input.style.height = 'auto';

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
   5. باقي الوظائف (Inputs, Auth, etc.)
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
                
                setTimeout(() => { 
                    fetchRealAI_Stream("عافاك أستاذ، شوف هاد الصورة وشرح ليا شنو فيها وحل التمرين:", imgData); 
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
        AppState.recognition.lang = 'ar-MA'; // الدارجة المغربية
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

// Helper Functions
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
