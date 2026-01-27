/* =======================================================
   IKED ENGINE v2026: THE HYBRID TANK 🛡️🧠
   Core: Nuclear JSON Extraction (100% Uptime Reliability)
   Brain: Socratic Tutor + Arabic Script + On-Demand Visuals
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

const ALLOWED_ORIGINS = [
    "https://h-app.vercel.app", 
    "http://localhost:3000", 
    "http://127.0.0.1:5500",
    "https://ikedmath-app.vercel.app"
];

/* =======================================================
   1. STRATEGY: STRICT 2026 LIST
   ======================================================= */
function selectModelStrategy(query) {
    const q = query.toLowerCase();
    // نكتشف هل طلب المستخدم الرسم صراحة
    const wantsDrawing = ["رسم", "draw", "svg", "منحنى", "شكل", "plot", "graph"].some(k => q.includes(k));

    if (wantsDrawing) {
        return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    }
    // للأسئلة العادية، نستخدم الموديلات السريعة
    return ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite-preview-02-05", "gemini-flash-lite-latest"]; 
}

/* =======================================================
   2. GENERATION LOGIC (NO TOOLS = NO CRASHES)
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.65, // توازن مثالي بين الذكاء والالتزام
                    maxOutputTokens: 8192, // مساحة كافية باش الرسم ما يتقطعش
                    topP: 0.9,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            // انتظار قصير في حالة الضغط
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 1500)); 
            }
            continue; 
        }
    }
    throw new Error("System Overload.");
}

export default async function handler(req, res) {
    // CORS Setup
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, userProfile } = req.body;
    if (!prompt) return res.status(400).write(JSON.stringify({ error: "Input required" }));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { res.write(JSON.stringify({ error: "API Key Error" })); res.end(); return; }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // 🔥 SYSTEM PROMPT: SOCRATIC BRAIN + ARABIC SCRIPT 🔥
        const systemInstruction = `
        You are **IKED**, a smart and interactive Moroccan Math Tutor (2 Bac SM).

        🛑 **STRICT LANGUAGE RULES (ARABIC SCRIPT ONLY):**
        1. **Script:** Write purely in **ARABIC LETTERS**. 
           - ❌ NO: "Salam ssi l'batal"
           - ✅ YES: "أهلاً بالبطل، كيفاش نقدر نعاونك؟"
        2. **Dialect:** Use **Moroccan Darija** mixed with formal Math Terms.
           - Keywords: "نعتبر"، "لدينا"، "بما أن"، "إذن"، "لاحظ معايا".
        
        🧠 **INTERACTIVE METHODOLOGY (SOCRATIC):**
        1. **Guide, Don't Just Solve:** - If the user asks a question, don't dump the full answer.
           - Start with a hint or a question: "واش فكرتي تستعمل مبرهنة القيم الوسيطية؟"
        2. **Concise:** Keep it short and engaging. No long lectures unless asked.
        3. **On-Demand Visuals:** - Do **NOT** generate JSON/Graphs unless the user explicitly asks ("رسم ليا", "عطيني المبيان").

        🎨 **FORMATTING:**
        - **Math:** Use LaTeX ($...$) for ALL math symbols.
        - **Visuals:** Return JSON Object ONLY when requested.

        🚨 **OUTPUT FORMAT (THE PROTOCOL):**
        1. JSON Object (Visuals or Null).
        2. "|||STREAM_DIVIDER|||"
        3. The Text Response (in Arabic Script).

        --- TEMPLATE ---
        { "visuals": null }
        |||STREAM_DIVIDER|||
        أهلاً تبارك الله عليك! سؤال فالمستوى.
        قبل ما نبداو، قول ليا: شنو هو الشرط الأساسي باش تكون الدالة متصلة؟
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[User]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 LOGIC: NUCLEAR JSON EXTRACTION (The Tank Armor) 🔥
        let buffer = "";
        let isHeaderSent = false;
        const DIVIDER = "|||STREAM_DIVIDER|||";

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            
            if (!isHeaderSent) {
                buffer += chunkText;
                
                if (buffer.includes(DIVIDER)) {
                    const parts = buffer.split(DIVIDER);
                    const rawBuffer = parts[0]; 
                    const content = parts.slice(1).join(DIVIDER);

                    try {
                        // 🛠️ الجراحة الدقيقة لاستخراج JSON
                        const firstBrace = rawBuffer.indexOf('{');
                        const lastBrace = rawBuffer.lastIndexOf('}');

                        if (firstBrace !== -1 && lastBrace !== -1) {
                            let cleanJson = rawBuffer.substring(firstBrace, lastBrace + 1);
                            JSON.parse(cleanJson); // التحقق من الصحة
                            res.write(cleanJson + DIVIDER + content);
                        } else {
                            // لم يتم العثور على JSON، نفترض null
                            res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                        }
                    } catch (e) {
                        // في حالة الفشل، نخفي الكود ونظهر النص فقط
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                res.write(chunkText);
            }
        }
        
        // Final flush
        if (!isHeaderSent && buffer) {
             res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        // Fallback message in Arabic Script
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ عذراً يا بطل، وقع واحد الخطأ تقني بسيط. عاود سولني عافاك.`);
        res.end();
    }
}
