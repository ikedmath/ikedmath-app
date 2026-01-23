/* =======================================================
   IKED AUDITOR 2026 ⚖️
   Mission: Ask Google AI to pick the BEST Math model
   Criteria: High IQ + High Quota (Unlimited Free Tier)
   ======================================================= */

export default async function handler(req, res) {
    // إعدادات الحماية
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

        // 1. جلب قائمة الموديلات المتوفرة حالياً
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listResponse.json();

        if (!listData.models) throw new Error("Google did not return any models.");

        // نأخذ فقط الموديلات الصالحة للشات
        const availableModels = listData.models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name)
            .join(", ");

        // 2. صياغة السؤال للفحص (نسأل الموديل "Pro" ليحكم على القائمة)
        // نستخدم 'gemini-pro' لأنه الأقدر على التحليل المنطقي للاختيار
        const judgeModel = "gemini-1.5-pro"; 
        
        const auditPrompt = `
        ACT AS A SENIOR GOOGLE AI ENGINEER.
        
        Here is the list of available models for this user:
        [${availableModels}]

        The user is a "2nd Bac Mathematical Sciences" student (High Math Level).
        They need a model that satisfies TWO strict conditions simultaneously:
        1. **High Intelligence:** Must be excellent at explaining complex math, reasoning, and step-by-step logic (not dumb/boring).
        2. **High Free Quota:** The user wants to study ALL DAY without hitting "429 Resource Exhausted" errors.

        ANALYSIS REQUIRED:
        - "Pro" models are smart but have low limits (50/day).
        - "Lite" models have high limits but might be too simple.
        - "Flash" models are the balance.

        TASK:
        From the list above, select the SINGLE BEST model name that offers the highest intelligence possible while maintaining a high enough daily quota (1000+ requests) to not stop working.
        
        OUTPUT FORMAT:
        Just write the Model Name inside brackets, like this: [models/name-of-model], followed by a short explanation in Darija regarding why you chose it.
        `;

        // 3. إرسال طلب التحكيم
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${judgeModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: auditPrompt }] }] })
        });

        const data = await response.json();
        const recommendation = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return res.status(200).json({ result: `🤖 **تقرير الخبير (Google AI):**\n\n${recommendation}` });

    } catch (error) {
        // في حالة فشل المحكم، نستخدم خطة الطوارئ
        return res.status(200).json({ 
            result: `⚠️ تعذر استشارة الخبير مباشرة (${error.message}).\n\nلكن بناءً على خبرتي: الموديل **gemini-1.5-flash** هو الوحيد الذي يجمع بين الذكاء والكوطا الكبيرة.` 
        });
    }
}
