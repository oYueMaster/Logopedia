
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse } from "../types.ts";

export async function analyzeSpeech(
  targetWord: string,
  audioBase64: string,
  mimeType: string
): Promise<AnalysisResponse> {
  // Verificación de seguridad para la API KEY
  const apiKey = (window as any).process?.env?.API_KEY || '';
  
  if (!apiKey) {
    console.warn("Atención: API_KEY no configurada.");
    return {
      status: 'retry',
      message: "No se pudo conectar con la inteligencia de voz. Por favor, verifica la configuración."
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Eres un experto en logopedia infantil, especializado en niños con autismo. 
    Tu tarea es escuchar el audio y determinar si el niño intentó decir la palabra objetivo: "${targetWord}".

    METODOLOGÍA DE RETROALIMENTACIÓN (TEA):
    - Si el niño falla, usa Refuerzo Positivo: Valida el esfuerzo.
    - Usa Modelado: Proporciona la palabra clara nuevamente.
    
    RESPUESTA:
    Debes responder exclusivamente en formato JSON:
    {
      "status": "success" | "retry",
      "message": "mensaje motivador"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["success", "retry"] },
            message: { type: Type.STRING }
          },
          required: ["status", "message"]
        }
      }
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text;
    
    return JSON.parse(cleanJson) as AnalysisResponse;
  } catch (error) {
    console.error("Error en GeminiService:", error);
    return {
      status: 'retry',
      message: `¡Buen intento! Vamos a probar una vez más. Di: ${targetWord}`
    };
  }
}
