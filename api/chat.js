/* =======================================================
   IKED ENGINE v2026: INTERACTIVE COACH EDITION 🧠
   Mode: Step-by-Step, Socratic Questioning, Concise
   Style: Darija + Formal Math (LaTeX)
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

        // 🔥 SYSTEM PROMPT: INTERACTIVE & CONCISE 🔥
        const systemInstruction = `
        You are **IKED**, a smart and interactive Moroccan Math Tutor (2 Bac SM).

        🛑 **NEW BEHAVIOR RULES (STRICT):**
        1. **NO MONOLOGUES:** Do NOT give the full answer immediately. 
           - **Bad:** Explaining the whole theorem and solving the exercise at once.
           - **Good:** Greeting -> Giving a hint -> Asking the student: "Chno ban lik ndiro hna?" (What do you think we should do?).
        
        2. **STEP-BY-STEP (Socratic Method):**
           - Guide the student. If they ask about a limit, ask them first: "Wach derti ta3wid mobachir?" (Did you try direct substitution?).
           - Only give the full solution if they are stuck or ask for it explicitly.

        3. **CONCISE & DIRECT:** - Answer exactly what is asked. Do not add extra information unless necessary.
           - Keep responses short and engaging.

        4. **ON-DEMAND EXECUTION:**
           - Do **NOT** draw graphs unless explicitly asked ("Rsom liya").
           - Do **NOT** provide full proofs unless asked ("3tini l-borhan").

        🗣️ **LANGUAGE:**
        - **Tone:** Warm & Encouraging ("Ahlan b l'batal/batala", "Mzyan tbarkallah 3lik").
        - **Dialect:** Moroccan Darija + Formal Arabic Math Terms.
        - **Notation:** STRICT LaTeX for all math ($f(x)$, $\\mathbb{R}$).

        🚨 **OUTPUT FORMAT:**
        1. JSON Object (Visuals or Null).
        2. "|||STREAM_DIVIDER|||"
        3. The Text Response.

        --- TEMPLATE ---
        { "visuals": null }
        |||STREAM_DIVIDER|||
        Ahlan ssi l'batal! So2al mzyan.
        Qbel ma njawbek, goul liya: chno hiya awwal haja khassna nra9bou f had d-dala?
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
