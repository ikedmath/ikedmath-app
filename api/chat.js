/* =======================================================
   IKED ENGINE: SPECIFIC MODEL DIAGNOSTIC 🔬
   Target: Testing User's Preferred Model List
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

// تعريف أداة وهمية للتجربة (باش نتأكدوا أن Tools خدامين)
const testTool = {
    functionDeclarations: [{
        name: "test_tool",
        description: "Test function.",
        parameters: { type: "OBJECT", properties: { val: { type: "STRING" } } }
    }]
};

export default async function handler(req, res) {
    // إعدادات الهيدر
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ **Fatal Error:** API Key is missing!`);
        res.end(); return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 🔥 هادي هي اللائحة اللي فالكود ديالك بالضبط. غانتيسطيوها وحدة بوحدة.
    const modelsToTest = [
        "gemini-2.5-flash",                    // الهدف رقم 1
        "gemini-2.0-flash",                    // الهدف رقم 2
        "gemini-2.0-flash-lite-preview-02-05", // الهدف رقم 3
        "gemini-flash-lite-latest"             // الاحتياطي
    ];

    let report = "**📊 تقرير فحص الموديلات (X-Ray Report):**\n\n";
    let workingModels = [];

    try {
        for (const modelName of modelsToTest) {
            report += `🔹 **${modelName}**: `;
            
            try {
                // إعداد الموديل بنفس إعدادات "الفيراري"
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [testTool], 
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } }
                }, { apiVersion: 'v1beta' }); // ضروري v1beta

                // إرسال طلب بسيط
                const result = await model.generateContent("Call test_tool function now.");
                const response = await result.response;

                // التحقق من الاستجابة
                if (response && response.functionCalls()) {
                    report += "✅ **ناضي (Working with Tools)**\n";
                    workingModels.push(modelName);
                } else {
                    report += "⚠️ **خدام ولكن بدون Tools (Text Only)**\n";
                }

            } catch (error) {
                // تحليل الخطأ بدقة
                if (error.message.includes("404")) {
                    report += "❌ **غير موجود (404)** - الاسم غالط أو غير متاح لحسابك.\n";
                } else if (error.message.includes("429")) {
                    report += "🛑 **عامر (Quota Exceeded)** - تسنى شوية.\n";
                } else if (error.message.includes("503") || error.message.includes("Overloaded")) {
                    report += "💤 **السيرفر عيان (Overloaded)**.\n";
                } else {
                    report += `⛔ **Error:** ${error.message.substring(0, 40)}...\n`;
                }
            }
        }

        // الخلاصة
        let conclusion = "";
        if (workingModels.length > 0) {
            conclusion = `\n🎉 **النتيجة:** كاين ${workingModels.length} موديلات خدامين مزيان. \nأحسن واحد هو: **${workingModels[0]}**`;
        } else {
            conclusion = "\n💀 **النتيجة:** حتى موديل ما خدام! المشكل فـ API Key أو الأسماء كاملة غالطة.";
        }

        res.write(`{"visuals":null}|||STREAM_DIVIDER|||${report}${conclusion}`);
        res.end();

    } catch (e) {
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||🔥 خطأ فالسكربت: ${e.message}`);
        res.end();
    }
}
