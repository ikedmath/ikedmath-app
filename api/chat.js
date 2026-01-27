/* =======================================================
   IKED ENGINE: MODEL INSPECTOR 🕵️‍♂️
   Purpose: Fetch the OFFICIAL list of available models via Raw API
   ======================================================= */

export default async function handler(req, res) {
    // إعدادات الهيدر
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ API Key Missing!`);
        res.end(); return;
    }

    try {
        // 🔥 هنا القالب: كنسولو جوجل ديريكت بلا SDK
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        let report = "**📋 لائحة الموديلات المتاحة ليك (Official List):**\n\n";
        
        // تصفية الموديلات باش يبقاو غير دياول الشات (generateContent)
        const chatModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));

        chatModels.forEach(m => {
            // كنعلمو على الموديلات القوية والجديدة
            let icon = "🔹";
            if (m.name.includes("1.5")) icon = "🚀";
            if (m.name.includes("2.0")) icon = "💎";
            if (m.name.includes("flash")) icon = "⚡";

            report += `${icon} **${m.name.replace("models/", "")}**\n`;
        });

        report += "\n\n**👉 دابا انسخ هاد اللائحة وصيفطها ليا باش نعطيك الكود اللي كيخدم 100%.**";

        res.write(`{"visuals":null}|||STREAM_DIVIDER|||${report}`);
        res.end();

    } catch (error) {
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||🛑 فشل الاتصال بجوجل: ${error.message}`);
        res.end();
    }
}
