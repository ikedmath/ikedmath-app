/* =======================================================
   IKED ENGINE v2026: FUTURE PROOF (MULTI-MODEL FAILOVER) 💎
   Architecture: Cascade Strategy
   Primary: gemini-2.5-flash-lite
   Fallback: gemini-flash-lite-latest
   ======================================================= */

export const config = {
    maxDuration: 60, // 60 Seconds Timeout
};

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

// 1. لائحة الموديلات بالترتيب (من الأقوى للأضمن)
const CANDIDATE_MODELS = [
    "gemini-2.5-flash-lite",           // الخيار رقم 1: سرعة خيالية وكفاءة 2026
    "gemini-flash-lite-latest",        // الخيار رقم 2: النسخة المستقرة دائماً
    "gemini-2.0-flash-lite-preview-02-05" // الخيار رقم 3: نسخة احتياطية معروفة
];

const renderGraphTool = {
    functionDeclarations: [
        {
            name: "render_math_graph",
            description: "Generates a math graph SVG. Use this for ANY visual request (plot, draw, graph).",
            parameters: {
                type: "OBJECT",
                properties: {
                    svg_code: {
                        type: "STRING",
                        description: "SVG code only. viewBox='-10 -10 20 20'. No <script>. No markdown."
                    }
                },
                required: ["svg_code"]
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

        // 🛑 Loop of Survival: نجربو الموديلات واحد بواحد
        for (const modelName of CANDIDATE_MODELS) {
            try {
                // console.log(`Trying model: ${modelName}...`); // (Optional logging)

                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    tools: [renderGraphTool],
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
                    safetySettings: safetySettings,
                }, { apiVersion: 'v1beta' });

                const systemInstruction = `
                    You are **IKED**, an elite Math Tutor for 2 Bac SM (Morocco).
                    Current User: ${userName}.
                    
                    🚨 PROTOCOL (2026 Edition):
                    1. **No Hallucinations:** Never output python code or generic definitions.
                    2. **Visuals:** Use 'render_math_graph' tool for ALL plots/drawings.
                    3. **Context:** Ignore [HISTORY] tags in output.
                    4. **Lang:** Moroccan Darija (Arabic script).
                `;

                const chat = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: systemInstruction }] },
                        { role: "model", parts: [{ text: "مفهوم. أنا واجد." }] }
                    ]
                });

                let messageParts = [];
                if (prompt) messageParts.push({ text: prompt });
                if (image) {
                    const base64Data = image.split(',')[1] || image;
                    messageParts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
                }

                const result = await chat.sendMessageStream(messageParts);
                
                // إلى وصلنا لهنا، يعني الموديل خدام والاتصال داز
                for await (const chunk of result.stream) {
                    const calls = chunk.functionCalls();
                    if (calls && calls.length > 0) {
                        const call = calls[0];
                        if (call.name === "render_math_graph") {
                            const svgCode = call.args.svg_code;
                            res.write(JSON.stringify({
                                type: "visual",
                                data: { type: "SVG", code: svgCode },
                                gamification: { xp: 50 }
                            }) + "\n");

                            const result2 = await chat.sendMessageStream([{
                                functionResponse: {
                                    name: "render_math_graph",
                                    response: { status: "success", content: "Graph rendered." }
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
                break; // صافي خدمنا، نخرجو من الحلقة

            } catch (innerError) {
                // هادي هي قوة المبرمج: إلا فشل موديل، كندوزو للي موراه
                lastError = innerError;
                console.warn(`Model ${modelName} failed: ${innerError.message}`);
                
                // إلا كان المشكل 429 (Quota) أو 503 (Overload)، نكملو للموديل التالي
                if (innerError.message.includes("429") || innerError.message.includes("503") || innerError.message.includes("404")) {
                    continue; 
                } else {
                    // إلا كان خطأ فادح آخر، نوقفو
                    throw innerError;
                }
            }
        }

        if (!success) {
            throw new Error(`All 2026 models failed. Last error: ${lastError?.message}`);
        }

        res.write(JSON.stringify({ type: "done" }) + "\n");
        res.end();

    } catch (error) {
        console.error("CRITICAL ENGINE FAILURE:", error);
        res.write(JSON.stringify({ type: "error", message: `System Error: ${error.message}` }) + "\n");
        res.end();
    }
}
