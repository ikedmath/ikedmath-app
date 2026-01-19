// خزان السوارت (نفسهم ما قسناهمش)
const API_KEYS = [
  "AIzaSyBPz8vXwVUG-XEZhp-Tgl7DgbJNVBzasbU",
  "AIzaSyA0mtRY0r3V_4YgbysODF74ZF96d8BDdKI",
  "AIzaSyCfdmvpmblXCLECHH7FaDYLPDFbEKIvXLU",
  "AIzaSyBjA2NpNvi3evBYvPgDUxBdsUnz1rXiuK8",
  "AIzaSyAsk6lafFuqW5F6C3KWjAR6GczqfFB1WjU",
  "AIzaSyBmmCbuU2GjEl4Vtpp0ptyNL9Mu3GMRjcc",
  "AIzaSyD0Q5wdMko3fRPudDfUZV0Y_OcRlySlN3Y",
  "AIzaSyAN0U3UtB3oZZPUjCFr7qxgd9H2vKvva-A",
  "AIzaSyAz6BaeOnSgE1eaW4Ywfhkt5BggcIk463g",
  "AIzaSyDaRAVDYonItLkhQipP7IEhcrRM_q3RQdU",
  "AIzaSyBzfphr62SGax09-wvKM4DbOACKarqYFtg",
  "AIzaSyCxohCSJDmmpQHnxZcTnAkUr9WjFinBOEo",
  "AIzaSyBjtH15LRaIzM4JnFw70Ha_qm8Lzx0fOME",
  "AIzaSyBwkd8WXx_T4IBv-PTSlaSJDMuxuHWJV_g"
];

// ✅ هادو هوما الموديلات الحقيقية والموجودة حالياً
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];

module.exports = async (req, res) => {
  // 1. السماح للواجهة بالاتصال (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { contents } = req.body;
    const randomKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

    // تجريب الموديلات بالترتيب
    for (const model of MODELS) {
      try {
        // كنستعملو fetch ديال Node.js (متوفرة ف Vercel)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${randomKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contents,
              generationConfig: { maxOutputTokens: 1000 }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        } else {
          console.log(`Model ${model} error: ${await response.text()}`);
        }
      } catch (e) {
        console.log(`Model ${model} failed locally: ${e.message}`);
      }
    }

    return res.status(503).json({ error: "All models failed to respond" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
