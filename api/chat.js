/* =======================================================
   IKED ENGINE v2026: UNSTOPPABLE ELITE 💎
   Strategy: High Quota Priority -> Failover
   Models: 2.0 Flash (High Limit) -> 2.0 Exp (Backup)
   ======================================================= */

export const config = {
    maxDuration: 60,
};

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

// 🛑 اللائحة الذكية (تفادينا 2.5 حيت فيه 20 طلب فقط)
const CANDIDATE_MODELS = [
    "gemini-2.0-flash",        // 1. العملاق: كوطا كبيرة (1500/يوم) + ذكاء عالي
    "gemini-2.0-flash-001",    // 2. البديل الرسمي: نفس القوة
    "gemini-2.0-flash-exp",    // 3. التجريبي: كاحتياط أخير
];

// أداة استخراج المعادلة (Hybrid Brain)
const mathPlotTool = {
    functionDeclarations: [
        {
            name: "plot_function",
            description: "Extracts the mathematical expression for the client engine. Call this for ANY drawing task.",
            parameters: {
                type: "OBJECT",
                properties: {
                    expression: { 
                        type: "STRING", 
                        description: "JS Math expression (e.g. 'x**2', 'Math.sin(x)'). Variable must be 'x'." 
                    },
                    xMin: { type: "NUMBER", description: "Default -10" },
                    xMax: { type: "NUMBER", description: "Default 10" }
                },
                required: ["expression"]
            }
        }
    ]
};

const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, userProfile, image } = req.body;
    
    if (!prompt && !image) {
        res.write(JSON.stringify({ type: "error", message: "Input required" }) + "\n");
        res.end(); return;
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { 
        res.write(JSON.stringify({ type: "error", message: "MISSING_API_KEY" }) + "\n"); 
        res.end(); return; 
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const userName = userProfile?.name || "Student";
        
        let success = false;
        let lastError = null;

        // 🛑 Loop of Survival
        for (const modelName of CANDIDATE_MODELS) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [mathPlotTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                    safetySettings: safetySettings,
                }, { apiVersion: 'v1beta' });

                const systemInstruction = `
                    You are **IKED**, an elite Math Tutor for 2 Bac SM. User: ${userName}.
                    
                    🚨 RULES:
                    1. **Task:** If user wants to draw/plot, extract formula & CALL 'plot_function'.
                    2. **No Code:** Do not write Python/Markdown code.
                    3. **Lang:** Moroccan Darija.
                `;

                const chat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: systemInstruction }] },
                        { role: "model", parts: [{ text: "مفهوم. سأستخدم المحرك للرسم." }] }
                    ]
                });

                let messageParts = [];
                if (prompt) messageParts.push({ text: prompt });
                if (image) {
                    const base64Data = image.split(',')[1] || image;
                    messageParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
                }

                const result = await chat.sendMessageStream(messageParts);
                
                for await (const chunk of result.stream) {
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        const call = calls[0];
                        if (call.name === "plot_function") {
                            // إرسال أمر الرسم (Command)
                            res.write(JSON.stringify({
                                type: "command",
                                cmd: "PLOT",
                                data: call.args,
                                gamification: { xp: 20 }
                            }) + "\n");

                            const result2 = await chat.sendMessageStream([{
                                functionResponse: {
                                    name: "plot_function",
                                    response: { status: "success", content: "Graph command sent." }
                                }
                            }]);
                            
                            for await (const chunk2 of result2.stream) {
                                const text2 = chunk2.text();
                                if (text2) res.write(JSON.stringify({ type: "text", content: text2 }) + "\n");
                            }
                        }
                    } else {
                        const text = chunk.text();
                        if (text) res.write(JSON.stringify({ type: "text", content: text }) + "\n");
                    }
                }

                success = true;
                break; 

            } catch (innerError) {
                lastError = innerError;
                // إذا كان الخطأ هو Quota (429) أو غير موجود (404)، ندوزو للموديل التالي
                console.warn(`Model ${modelName} failed (${innerError.message}), switching...`);
                continue; 
            }
        }

        if (!success) {
            // رسالة واضحة للمستخدم
            throw new Error(`All models exhausted. Please use a NEW API Key. Last Error: ${lastError?.message}`);
        }

        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("CRITICAL ERROR:", error);
        res.write(JSON.stringify({ type: "error", message: `System Error: ${error.message}` }) + "\n");
        res.end();
    }
}
