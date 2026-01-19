export const config = {
  runtime: 'edge',
};

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

// ⚠️ هادو هوما السميات الصحيحة عند Google
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];

export default async function handler(req) {
  try {
    const { contents } = await req.json();
    const randomKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
    
    // كنزيدو Debugging باش نعرفو السبب الحقيقي إلا فشل
    let lastError = "";

    for (const model of MODELS) {
      try {
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
          return new Response(JSON.stringify(data), {
            headers: { 'content-type': 'application/json' }
          });
        } else {
          // نسجلو الخطأ باش نشوفوه
          const errData = await response.text();
          lastError = `Model ${model} Error: ${errData}`;
          console.log(lastError);
        }
      } catch (e) {
        lastError = e.message;
      }
    }

    // إلا فشل، كنرجعو ليك السبب الحقيقي بلاصة "Server Busy"
    return new Response(JSON.stringify({ error: lastError || "All models failed" }), { status: 500 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
