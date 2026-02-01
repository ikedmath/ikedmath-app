/* =======================================================
   IKED DIAGNOSTIC TOOL 🕵️‍♂️
   Task: List ALL available models for your API Key directly in Chat.
   ======================================================= */

export const config = {
    maxDuration: 60,
};

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

export default async function handler(req, res) {
    // 1. إعدادات الاتصال (CORS & Headers)
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // 2. التحقق من الساروت
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        res.write(JSON.stringify({ type: "error", message: "MISSING_API_KEY: تأكد أنك سميتيه GOOGLE_API_KEY" }) + "\n");
        res.end();
        return;
    }

    try {
        // 3. رسالة البداية
        res.write(JSON.stringify({ type: "text", content: "🔍 جاري فحص الموديلات المتاحة لحسابك...\n\n" }) + "\n");

        // 4. الاتصال المباشر بجوجل (بدون وساطة المكتبة)
        // نسولو جوجل: "شنو عندك؟"
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`Google Refused: ${errData.error.message}`);
        }

        const data = await response.json();

        // 5. تصفية الموديلات (نخليو غير اللي كيديرو Chat)
        const validModels = data.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => `🔹 **${m.name.replace('models/', '')}**`)
            .join('\n');

        // 6. كتابة النتيجة فـ الشات
        if (validModels.length > 0) {
            const finalMessage = `✅ **الموديلات الشغالة 100% بحسابك:**\n\n${validModels}\n\n⚠️ اختر واحداً من هذه القائمة فقط للكود القادم.`;
            res.write(JSON.stringify({ type: "text", content: finalMessage }) + "\n");
        } else {
            res.write(JSON.stringify({ type: "text", content: "🚫 حسابك لا يملك أي موديل متاح حالياً (غريب!)." }) + "\n");
        }

        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("Diagnostic Error:", error);
        res.write(JSON.stringify({ type: "error", message: `فشل الفحص: ${error.message}` }) + "\n");
        res.end();
    }
}
