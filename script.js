/* =========================================
   IKED CORE ENGINE v10.0 (Real AI Connected)
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
   1. الاتصال بـ API الحقيقي (The Real Brain) 🧠
   ========================================= */

async function fetchRealAI(userText) {
    try {
        // الاتصال بـ Vercel Serverless Function
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // نرسل السؤال للسيرفر
            body: JSON.stringify({ prompt: userText }) 
        });

        if (!response.ok) throw new Error('Network error');

        const data = await response.json();
        // نفترض أن السيرفر يرد بـ { result: "..." } أو { text: "..." }
        return data.result || data.text || data.reply || "عذراً، لم أستطع الاتصال بالخادم.";

    } catch (error) {
        console.error("AI Error:", error);
        return "⚠️ حدث خطأ في الاتصال بالذكاء الاصطناعي. تأكد من إعدادات API.";
    }
}

/* =========================================
   2. الشات (محدث ليدعم async/await)
   ========================================= */

function setupChat() {
    const sendBtn = document.querySelector('.dock-send-btn');
    const input = document.getElementById('chat-input-field');
    const micBtn = document.querySelectorAll('.dock-action-btn')[1];

    if(micBtn) micBtn.onclick = triggerMic;

    // دالة الإرسال أصبحت async لانتظار السيرفر
    const sendMsg = async () => {
        const txt = input.value.trim();
        if(!txt) return;
        
        // 1. عرض رسالة المستخدم
        addBubbleToUI(txt, 'user');
        saveMessageToSession(txt, 'user');
        input.value = '';
        addXP(5);

        // 2. إظهار "جاري الكتابة..."
        showTyping();

        // 3. الاتصال بالسيرفر الحقيقي
        const aiReply = await fetchRealAI(txt);

        // 4. إخفاء المؤشر وعرض الجواب الحقيقي
        hideTyping();
        addBubbleToUI(aiReply, 'bot');
        saveMessageToSession(aiReply, 'bot');
    };

    if(sendBtn) sendBtn.onclick = sendMsg;
    if(input) input.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMsg(); });
}

/* =========================================
   3. باقي الوظائف (كما هي - لم تتغير)
   ========================================= */

// ... (Functions: setupInputs, handleImageUpload, setupVoiceRecognition, triggerMic)
// انسخ نفس دوال setupInputs و setupVoiceRecognition من الكود السابق (v9.0) هنا 
// لكي لا يطول الكود، سأضع لك الدوال الأساسية فقط.

function setupInputs() {
    const cameraInput = document.getElementById('camera-input');
    if(cameraInput) cameraInput.addEventListener('change', function(){ handleImageUpload(this, 'chat'); });

    let profileInput = document.getElementById('profile-upload-input');
    if (!profileInput) {
        profileInput = document.createElement('input'); profileInput.type = 'file'; profileInput.accept = 'image/*'; profileInput.style.display = 'none'; profileInput.id = 'profile-upload-input';
        document.body.appendChild(profileInput);
    }
    profileInput.addEventListener('change', function(){ handleImageUpload(this, 'profile'); });

    const avatarCircle = document.getElementById('user-avatar');
    if(avatarCircle) avatarCircle.onclick = (e) => { e.stopPropagation(); profileInput.click(); };

    const userDetails = document.querySelector('.user-details');
    if(userDetails) userDetails.onclick = (e) => { e.stopPropagation(); logoutUser(); };
}

function handleImageUpload(inputElement, type) {
    if (inputElement.files && inputElement.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgData = e.target.result;
            if (type === 'chat') {
                const imgHTML = `<img src="${imgData}" style="max-width:100%; border-radius:10px;">`;
                addBubbleToUI(imgHTML, 'user');
                saveMessageToSession(imgHTML, 'user');
                // هنا يمكن إرسال الصورة للـ API مستقبلاً
                setTimeout(() => {
                    addBubbleToUI("وصلت الصورة! (ميزة تحليل الصور قيد التطوير في API)", 'bot');
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
            document.querySelectorAll('.dock-action-btn')[1].style.color = '#ef4444';
        };
        AppState.recognition.onresult = function(event) {
            const t = event.results[0][0].transcript;
            if(t.trim().length > 0) {
                document.getElementById('chat-input-field').value = t;
                document.querySelector('.dock-send-btn').click();
            }
        };
        AppState.recognition.onend = function() {
            document.querySelectorAll('.dock-action-btn')[1].style.color = '';
        };
    }
}
function triggerMic() { if(AppState.recognition) try{AppState.recognition.start()}catch(e){AppState.recognition.stop()} else alert("No Voice Support"); }

/* --- Session Management --- */
function renderChatHistory() {
    const list = document.getElementById('chat-history-list'); list.innerHTML = ''; 
    const sessions = getSessions();
    if (sessions.length === 0) { list.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">لا توجد محادثات</div>'; return; }
    sessions.forEach(s => {
        const div = document.createElement('div');
        div.className = `history-item ${s.id === AppState.currentSessionId ? 'active' : ''}`;
        div.innerHTML = `
            <div class="h-content" onclick="loadSessionWrapper(${s.id})"><div class="h-title">${s.title}</div><div class="h-date">${s.date}</div></div>
            <div class="h-actions">
                <i class="fas fa-pen edit-icon" onclick="renameSession(event, ${s.id})"></i>
                <i class="fas fa-trash edit-icon" onclick="deleteSession(event, ${s.id})" style="color:#ef4444; margin-right:5px"></i>
            </div>`;
        list.appendChild(div);
    });
}
function deleteSession(e, id) { e.stopPropagation(); if(confirm("حذف؟")) { let s = getSessions().filter(x=>x.id!==id); saveSessions(s); renderChatHistory(); if(AppState.currentSessionId===id) startNewChatSession(); } }
function renameSession(e, id) { e.stopPropagation(); const n = prompt("الاسم الجديد:"); if(n){ const s = getSessions(); const target = s.find(x=>x.id===id); if(target){ target.title=n; saveSessions(s); renderChatHistory(); if(AppState.currentSessionId===id) document.querySelector('.header-title h4').innerText=n; } } }
function loadSessionWrapper(id) { loadChatSession(id); toggleChatDrawer(); }

/* --- Core --- */
function getSessions() { const s = localStorage.getItem('IKED_SESSIONS'); return s ? JSON.parse(s) : []; }
function saveSessions(s) { localStorage.setItem('IKED_SESSIONS', JSON.stringify(s)); }
function startNewChatSession() {
    const s = getSessions();
    const newS = { id: Date.now(), title: `محادثة ${s.length + 1}`, date: new Date().toLocaleDateString('ar-MA'), messages: [] };
    s.unshift(newS); saveSessions(s); loadChatSession(newS.id);
}
function loadChatSession(id) {
    AppState.currentSessionId = id; const s = getSessions().find(x => x.id === id); if(!s) return;
    document.getElementById('chat-messages').innerHTML = ''; document.querySelector('.header-title h4').innerText = s.title;
    if(s.messages.length===0) addBubbleToUI("مرحباً! أنا جاهز للتحليل الحقيقي. 🧠", 'bot');
    else s.messages.forEach(m => addBubbleToUI(m.content, m.sender));
}
function saveMessageToSession(content, sender) {
    if(!AppState.currentSessionId) startNewChatSession();
    const s = getSessions(); const idx = s.findIndex(x=>x.id===AppState.currentSessionId);
    if(idx!==-1){ s[idx].messages.push({content, sender, timestamp:Date.now()}); saveSessions(s); }
}

/* --- UI Helpers --- */
function addBubbleToUI(html, sender) {
    const div = document.createElement('div'); div.className = `message ${sender==='user'?'user-message':'bot-message'}`; div.innerHTML = html;
    const c = document.getElementById('chat-messages'); c.appendChild(div); c.scrollTop = c.scrollHeight;
    if(window.MathJax) window.MathJax.typesetPromise([div]).catch(()=>{});
}
function showTyping() { const d=document.createElement('div'); d.id='typing-indicator'; d.className='message bot-message'; d.innerHTML='<i class="fas fa-ellipsis-h fa-beat"></i>'; document.getElementById('chat-messages').appendChild(d); document.getElementById('chat-messages').scrollTop=document.getElementById('chat-messages').scrollHeight; }
function hideTyping() { const el=document.getElementById('typing-indicator'); if(el) el.remove(); }
function addXP(n) { if(!AppState.user)return; AppState.user.xp=(AppState.user.xp||0)+n; localStorage.setItem('IKED_USER_DATA',JSON.stringify(AppState.user)); const el=document.getElementById('rb-count'); if(el)el.innerText=AppState.user.xp; }
function toggleChatDrawer() { const d=document.getElementById('chat-drawer'); d.classList.toggle('open'); document.getElementById('chat-drawer-overlay').classList.toggle('visible'); if(d.classList.contains('open')) renderChatHistory(); }
function loadUserData() { const d=localStorage.getItem('IKED_USER_DATA'); if(d){ AppState.user=JSON.parse(d); AppState.isLoggedIn=true; } }
function updateDashboardUI() {
    if(!AppState.user)return; document.getElementById('user-name-display').innerText=AppState.user.name;
    const av=document.getElementById('user-avatar');
    if(AppState.user.avatar){ av.innerText=''; av.style.backgroundImage=`url(${AppState.user.avatar})`; av.style.backgroundSize='cover'; av.style.backgroundPosition='center'; }
    else{ av.innerText=AppState.user.name.charAt(0).toUpperCase(); av.style.backgroundImage='none'; }
    document.getElementById('user-goal-display').innerText=AppState.user.goal||'التميز'; document.getElementById('rb-count').innerText=AppState.user.xp||0;
}
function completeLogin() {
    const n=document.getElementById('input-name').value; const s=document.getElementById('input-stream').value; const g=document.getElementById('input-goal').value;
    if(!n)return; AppState.user={name:n, stream:s, goal:g, xp:0}; localStorage.setItem('IKED_USER_DATA',JSON.stringify(AppState.user));
    updateDashboardUI(); document.getElementById('auth-screen').classList.add('hidden'); document.getElementById('app-screen').classList.remove('hidden');
}
function setStream(v) { document.getElementById('input-stream').value=v; }
function navTo(id) {
    document.querySelectorAll('.view-section').forEach(s=>s.classList.add('hidden')); document.getElementById('view-'+id).classList.remove('hidden');
    if(id==='chat' && !AppState.currentSessionId) startNewChatSession();
}
function logoutUser() { if(confirm("خروج؟")) { localStorage.removeItem('IKED_USER_DATA'); location.reload(); } }
function triggerCamera() { document.getElementById('camera-input').click(); }
