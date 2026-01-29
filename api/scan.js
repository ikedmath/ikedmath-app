/* =======================================================
   VERCEL API: MODEL SCANNER 2026 🕵️‍♂️
   Path: /api/scan.js
   Usage: Visit https://your-app.vercel.app/api/scan
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "❌ API Key is missing in Vercel Environment Variables" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // لائحة 2026 اللي باغين نجربو
    const candidates = [
        "gemini-2.0-flash-exp", // The most likely winner
        "gemini-1.5-flash",     // The backup
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite-preview-02-05",
    ];

    let logs = [];
    let winner = null;

    for (const modelName of candidates) {
        try {
            logs.push(`Testing: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            // نجربو واش خدام
            await model.generateContent("Test");
            
            winner = modelName;
            logs.push(`✅ SUCCESS: ${modelName} is WORKING!`);
            break; // لقينا واحد خدام، نخرجو

        } catch (error) {
            if (error.message.includes("429") || error.message.includes("Quota")) {
                logs.push(`⛔ FAIL: ${modelName} (Quota Exceeded/Limit 0)`);
            } else if (error.message.includes("404")) {
                logs.push(`❌ FAIL: ${modelName} (Not Found)`);
            } else {
                logs.push(`⚠️ FAIL: ${modelName} (${error.message.split(' ')[0]})`);
            }
        }
    }

    // النتيجة النهائية تخرج فالمتصفح
    if (winner) {
        return res.status(200).json({
            status: "DONE",
            winner_model: winner,
            message: `🎉 Great! Use '${winner}' in your chat code.`,
            details: logs
        });
    } else {
        return res.status(500).json({
            status: "FAILED",
            message: "❌ All models failed. Check your Billing or create a New Project.",
            details: logs
        });
    }
}
