/* =======================================================
   IKED ENGINE: DIAGNOSTIC MODE 🕵️‍♂️
   Purpose: Reveal the TRUE error message directly in Chat
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. تعريف الأداة للتجربة
const testTool = {
    functionDeclarations: [{
        name: "test_tool",
        description: "A test tool to check if function calling works.",
        parameters: { type: "OBJECT", properties: { test_val: { type: "STRING" } } }
    }]
};

export default async function handler(req, res) {
    // إعدادات الهيدر
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const apiKey = process.env.GOOGLE_API_KEY;
    
    // 1. فحص المفتاح
    if (!apiKey) {
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ **FATAL ERROR:** API Key is MISSING in Environment Variables.`);
        res.end();
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let debugLog = "**Diagnostic Report:**\n";

    // سنجرب موديل مستقر جداً أولاً (1.5 Flash) ثم الجديد (2.0 Flash)
    const modelsToTest = ["gemini-1.5-flash", "gemini-2.0-flash"];

    try {
        for (const modelName of modelsToTest) {
            debugLog += `\nTesting ${modelName}... `;
            
            try {
                // محاولة اتصال بسيطة مع Tools
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [testTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } }
                }, { apiVersion: 'v1beta' });

                // إرسال رسالة تجريبية
                const result = await model.generateContent("Call the test_tool with value 'Hello'");
                const response = await result.response;
                
                // فحص هل الموديل استجاب
                if (response && response.functionCalls()) {
                    debugLog += "✅ SUCCESS (Tool Called).\n";
                    // إذا نجح واحد، نوقف التجربة ونخبر المستخدم
                    res.write(`{"visuals":null}|||STREAM_DIVIDER|||✅ **SYSTEM OPERATIONAL!**\nModel ${modelName} is working perfectly with Tools.\n\nRevert to the main code now.`);
                    res.end();
                    return;
                } else {
                    debugLog += "⚠️ SUCCESS but No Tool Call (Text Only).\n";
                }

            } catch (innerError) {
                // هنا "الكنز": سبب الخطأ الحقيقي
                debugLog += `❌ FAILED.\n**Error Name:** ${innerError.name}\n**Message:** ${innerError.message}\n`;
                
                // تحليل الخطأ للمستخدم
                if (innerError.message.includes("404")) debugLog += "-> Model not found (Check name).\n";
                if (innerError.message.includes("429")) debugLog += "-> Quota Exceeded (Too many requests).\n";
                if (innerError.message.includes("not supported")) debugLog += "-> Region/API not supported.\n";
                if (innerError.message.includes("functionDeclarations")) debugLog += "-> Library Version Issue (Tools not recognized).\n";
            }
        }

        // إذا وصلنا هنا، يعني كلشي فشل
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||🛑 **DIAGNOSTIC FAILED** 🛑\n\n${debugLog}`);
        res.end();

    } catch (globalError) {
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||☠️ **CRITICAL SERVER ERROR:** ${globalError.message}`);
        res.end();
    }
}
