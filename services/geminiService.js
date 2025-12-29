
import { GoogleGenAI } from "@google/genai";

export async function analyzeSpeech(targetWord, audioBase64, mimeType) {
  const apiKey = window.process?.env?.API_KEY || '';
  if (!apiKey) return { status: 'retry', message: "Falta configurar la llave IA." };

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [
        { text: `Experto en autismo. ¿El niño dijo "${targetWord}" o algo parecido? Responde solo JSON: {"status": "success"|"retry", "message": "un mensaje motivador corto"}` },
        { inlineData: { data: audioBase64, mimeType } }
      ]}],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  } catch (e) {
    return { status: 'retry', message: "¡Buen intento! Di: " + targetWord };
  }
}
