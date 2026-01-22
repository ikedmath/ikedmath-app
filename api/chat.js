/* =======================================================
   IKED DIAGNOSTIC TOOL
   مهمته فقط جلب قائمة الموديلات المتاحة لحسابك
   ======================================================= */

export default async function handler(req, res) {
    // إعدادات CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // 1. جلب الساروت الآمن من Vercel
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ result: "❌ Error: API Key is missing in Vercel!" });
        }

        // 2. سؤال Google عن الموديلات المتوفرة (GET Request)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ result: `❌ Google Error: ${data.error.message}` });
        }

        // 3. تصفية الموديلات التي تصلح للشات فقط
        const chatModels = data.models
            .filter(model => model.supportedGenerationMethods.includes("generateContent"))
            .map(model => `🔹 ${model.name} (${model.version})`)
            .join('\n');

        // 4. إرسال القائمة كنتيجة للشات
        return res.status(200).json({ 
            result: `✅ تم الاتصال بنجاح!\nإليك الموديلات المتاحة لك:\n\n${chatModels}\n\nاختر واحداً وأخبرني به.` 
        });

    } catch (error) {
        return res.status(500).json({ result: `Error: ${error.message}` });
    }
}
