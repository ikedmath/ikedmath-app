/* =======================================================
   IKED ENGINE v2026: ARABIC SCRIPT EDITION 🇲🇦✍️
   Mode: Interactive Socratic Coach
   Language: Darija (Arabic Letters) + Formal Math (LaTeX)
   Tech: Nuclear JSON Fix
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
   2. GENERATION LOGIC
   ======================================================= */
async function generateWithRetry(genAI, modelList, fullPrompt) {
    for (const modelName of modelList) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                    temperature: 0.6, // توازن بين التفاعل والصرامة
                    maxOutputTokens: 4000, 
                    topP: 0.9,
                }
            }, { apiVersion: 'v1beta' });

            const result = await model.generateContentStream(fullPrompt);
            return result.stream;

        } catch (error) {
            console.warn(`⚠️ [Skip] ${modelName}: ${error.message}`);
            if (error.message.includes("429") || error.message.includes("Quota")) {
                await new Promise(r => setTimeout(r, 2000)); 
            }
            continue; 
        }
    }
    throw new Error("System Overload.");
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

    const { prompt, userProfile } = req.body;
    if (!prompt) return res.status(400).write(JSON.stringify({ error: "Input required" }));

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) { res.write(JSON.stringify({ error: "API Key Error" })); res.end(); return; }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);

        // 🔥 SYSTEM PROMPT: ARABIC SCRIPT & SOCRATIC METHOD 🔥
        const systemInstruction = `
        You are **IKED**, a smart and interactive Moroccan Math Tutor (2 Bac SM).

        🛑 **LANGUAGE RULES (ARABIC SCRIPT ONLY):**
        1. **Write in ARABIC LETTERS (اللغة العربية):** - **NEVER** use Latin script for Darija (No "Ahlan", No "Kifach").
           - **ALWAYS** write Darija in Arabic script.
           - ✅ Good: "أهلاً بالبطل، كيفاش نقدر نعاونك؟"
           - ❌ Bad: "Salam ssi l'batal."
        
        2. **Dialect:** Use **Moroccan Darija** mixed with formal Arabic Math terms.
           - Example: "حنا عندنا مشكل فالنهاية، خاصنا نعملو بـ $x$."

        🧠 **INTERACTIVE BEHAVIOR (SOCRATIC METHOD):**
        1. **NO MONOLOGUES:** Never give the full solution immediately.
        2. **ASK FIRST:** When a student asks a question, guide them with a probing question.
           - If they ask to solve a limit, ask: "واش جربتي التعويض المباشر؟ شنو عطاك؟" (Did you try direct substitution?).
           - Only give the full solution if they are stuck.

        3. **ON-DEMAND EXECUTION:**
           - Do **NOT** draw graphs unless explicitly asked ("رسم ليا").
           - Do **NOT** provide full proofs unless asked ("عطيني البرهان").

        🎨 **FORMATTING:**
        - **Math:** Use LaTeX ($...$) for formulas.
        - **Visuals:** JSON output only when requested.

        🚨 **OUTPUT FORMAT:**
        1. JSON Object (Visuals or Null).
        2. "|||STREAM_DIVIDER|||"
        3. The Text Response (In Arabic Script).

        --- TEMPLATE ---
        { "visuals": null }
        |||STREAM_DIVIDER|||
        أهلاً بالبطل! تبارك الله عليك سؤال ممتاز.
        قبل ما نعطيك الجواب، قول ليا: شنو بان ليك نديرو باش نبسطو هاد التعبير؟ واش كاين شي عامل مشترك؟
        `;

        const level = userProfile?.stream || "SM";
        const fullPrompt = `${systemInstruction}\n\n[Level: ${level}]\n[User]: ${prompt}`;

        const models = selectModelStrategy(prompt);
        const stream = await generateWithRetry(genAI, models, fullPrompt);

        // 🔥 LOGIC: SURGICAL JSON EXTRACTION (UNCHANGED) 🔥
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
                        const firstBrace = rawBuffer.indexOf('{');
                        const lastBrace = rawBuffer.lastIndexOf('}');

                        if (firstBrace !== -1 && lastBrace !== -1) {
                            let cleanJson = rawBuffer.substring(firstBrace, lastBrace + 1);
                            JSON.parse(cleanJson);
                            res.write(cleanJson + DIVIDER + content);
                        } else {
                            res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                        }
                    } catch (e) {
                        res.write(JSON.stringify({ visuals: null }) + DIVIDER + content);
                    }
                    isHeaderSent = true;
                    buffer = "";
                }
            } else {
                res.write(chunkText);
            }
        }
        
        if (!isHeaderSent && buffer) {
             res.write(JSON.stringify({ visuals: null }) + DIVIDER + buffer);
        }
        res.end();

    } catch (error) {
        console.error("Handler Error:", error);
        res.write(`{"visuals":null}|||STREAM_DIVIDER|||⚠️ IKED: Please retry.`);
        res.end();
    }
}
