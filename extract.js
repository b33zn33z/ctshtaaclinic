const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { files, caseType } = req.body;
    if (!files || files.length === 0) return res.status(400).json({ error: "No files provided" });

    const contents = [];
    for (const file of files) {
      if (file.type === "image") {
        contents.push({ inlineData: { data: file.data, mimeType: file.mediaType } });
      } else {
        contents.push({ text: `File: ${file.name}\n---\n${(file.data || "").slice(0, 10000)}` });
      }
    }

    const systemMsg = `You are an elite clinical data extraction system for a Cardiothoracic Surgery department. 
    Analyze the documents provided for a ${caseType || 'Cardiothoracic'} surgery candidate.
    Return ONLY a valid JSON object matching these fields perfectly:
    {
      "name": "Full name of patient",
      "age": "Age",
      "gender": "Male or Female",
      "phone": "Phone number or contact info",
      "diagnosis": "Short concise summary sentence of primary cardiac/thoracic pathology",
      "surgicalNotes": "Identify key mentions of proposed procedures (e.g. CABG, Valve Replacement, Lobectomy) and urgency indicators."
    }`;

    const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemMsg,
        responseMimeType: "application/json"
      }
    });

    const parsedData = JSON.parse(resp.text.trim());
    return res.json(parsedData);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Extraction failed" });
  }
}