/* =======================================================
   IKED 2026: THE MODEL HUNTER 🔫
   Objective: Find the ACTIVE 2026 Model for your API Key
   ======================================================= */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) { console.error("❌ Key missing"); process.exit(1); }

const genAI = new GoogleGenerativeAI(apiKey);

// لائحة 2026 القوية ديالك
const candidates = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",           // غالباً هذا هو "الجوكر"
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-preview-02-05",
    "gemini-flash-latest"
];

async function huntActiveModel() {
    console.log("🚀 Starting System Check (Year: 2026)...\n");

    for (const modelName of candidates) {
        process.stdout.write(`Testing [ ${modelName} ] ... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test connection 2026.");
            const response = result.response.text();
            
            if (response) {
                console.log("✅ LIVE! (Working)");
                console.log(`\n🎉 WINNER FOUND: use "model: '${modelName}'" in your app.`);
                return; // صافي لقينا الموديل، نخرجو
            }
        } catch (error) {
            if (error.message.includes("404")) {
                console.log("❌ Not Found (404)");
            } else if (error.message.includes("429") || error.message.includes("limit")) {
                console.log("⛔ Quota/Limit 0 (Blocked)");
            } else {
                console.log(`⚠️ Error: ${error.message.split(' ')[0]}`);
            }
        }
    }
    console.log("\n❌ All 2026 models failed. Check your Project Billing or create a new Project.");
}

huntActiveModel();
