/* =======================================================
   IKED MODEL AUDITOR 2026 🕵️‍♂️
   Goal: Find the "High-Throughput" (Unlimited) model.
   Target Keyword: "Lite" or "Flash"
   ======================================================= */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

        // 1. جلب القائمة الكاملة من المصدر
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (!data.models) throw new Error("Google ما عطانا حتى موديل!");

        // 2. تحليل الذكاء الاصطناعي للموديلات (تصنيف حسب "الصبر")
        const allModels = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
        
        // البحث عن "الوحش" (Lite)
        const workhorseModels = allModels.filter(m => m.name.toLowerCase().includes("lite"));
        // البحث عن "السريع" (Flash)
        const speedModels = allModels.filter(m => m.name.toLowerCase().includes("flash") && !m.name.toLowerCase().includes("lite"));
        // البحث عن "العبقري" (Pro)
        const smartModels = allModels.filter(m => m.name.toLowerCase().includes("pro") && !m.name.toLowerCase().includes("vision"));

        let report = "📊 **تقرير IKED للموديلات المتوفرة (2026):**\n\n";

        // 🟢 الفئة 1: الموديلات اللي "ما كتوقفش" (High Quota)
        report += "🚜 **موديلات الخدمة الشاقة (ينصح بها لعدم التوقف):**\n";
        if (workhorseModels.length > 0) {
            workhorseModels.forEach(m => report += `✅ \`${m.name}\` (هذا هو اللي خاصك!)\n`);
        } else {
            report += "⚠️ لم أجد موديل 'Lite' (غريب!).\n";
        }

        // 🟡 الفئة 2: موديلات سريعة ومتوازنة
        report += "\n⚡ **موديلات سريعة (Flash):**\n";
        speedModels.slice(0, 3).forEach(m => report += `🔹 \`${m.name}\`\n`);

        // 🔴 الفئة 3: موديلات ذكية جداً (لكن الكوطا قليلة)
        report += "\n🧠 **موديلات عبقرية (Pro - كوطا محدودة):**\n";
        smartModels.slice(0, 3).forEach(m => report += `🔸 \`${m.name}\`\n`);

        report += "\n💡 **نصيحتي ليك:** باش التطبيق يخدم 24/24 بلا ما يوقف، اختار أول واحد فاللائحة الخضراء (اللي فيه Lite).";

        return res.status(200).json({ result: report });

    } catch (error) {
        return res.status(500).json({ result: `❌ خطأ: ${error.message}` });
    }
}
