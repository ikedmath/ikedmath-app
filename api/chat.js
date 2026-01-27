/* =======================================================
   IKED ENGINE: DIAGNOSTIC MODE 🕵️‍♂️
   Purpose: Reveal the TRUE error message
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   DEBUG STRATEGY: TRY EVERYTHING
   ======================================================= */
function selectModelStrategy(query) {
    // سنجرب موديلات معروفة باستقرارها أولاً للتأكد
    return [
        "gemini-2.0-flash",       // الجديد
        "gemini-1.5-flash",       // القديم المستقر (للتجربة فقط)
        "gemini-pro"              // الكلاسيكي
    ];
}

async function generateWithRetry(genAI, modelList, fullPrompt) {
    let debugLog = ""; // سجل الأخطاء

    for (const modelName of modelList) {
        try {
            debugLog += `\nTrying ${modelName}... `;
            
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 2000, 
                }
            }, { apiVersion: 'v1beta' }); // جربنا v1beta

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            // سجل الخطأ بالتفصيل
            debugLog += `❌ FAILED: ${error.message}. `;
            
            // انتظار قصير
            await new Promise(r => setTimeout(r, 500));
            continue; 
        }
    }
    // إذا وصلنا هنا، يعني كلشي فشل. نرسل السجل كامل
    throw new Error(`ALL MODELS FAILED. LOGS: ${debugLog}`);
}

export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt } = req.body;
    
    // التحقق من المفتاح
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { 
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ **FATAL ERROR**: API KEY IS MISSING in Vercel Environment Variables.`);
        res.end(); 
        return; 
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        const systemInstruction = `You are a helpful assistant. Answer shortly.`;
        const fullPrompt = `${systemInstruction}\n\nUser: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // إذا نجح الاتصال، سنمر من هنا
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                // نرسل هيدر فارغ فقط لنختبر النص
                res.write(JSON.stringify({ visuals: null }) + DIVIDER);
                isHeaderSent = true;
            }
            res.write(chunkText);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        
        // 🔥🔥🔥 هنا الحيلة: طباعة الخطأ الحقيقي للمستخدم 🔥🔥🔥
        const errorMsg = `
        🛑 **DIAGNOSTIC REPORT** 🛑
        
        **Error Type:** ${error.name}
        **Message:** ${error.message}
        
        **Possible Causes:**
        1. If "404 Not Found": The model name is wrong.
        2. If "400 Bad Request": The region is blocked or prompt is too long.
        3. If "429 Too Many Requests": Free tier quota exceeded.
        4. If "API Key": Your key is invalid.
        `;
        
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||${errorMsg}`);
        res.end();
    }
}
