import { GoogleGenAI, Type } from '@google/genai';

// In a real application, you would pass the API key securely or use the environment variable.
// AI Studio injects process.env.GEMINI_API_KEY automatically.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function summarizeApplicationPaper(paperText: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sila analisis dan ringkaskan kertas kerja permohonan program pelajar berikut. 
      Ekstrak maklumat penting untuk memudahkan TNC HEPA dan YDP MPP membaca secara sepintas lalu sebelum meluluskan.
      
      Kertas Kerja:
      ${paperText}`,
      config: {
        systemInstruction: "Anda adalah AI pembantu kepada pengurusan universiti yang pakar dalam menganalisis kertas kerja program pelajar. Berikan ringkasan yang padat, profesional, dan objektif.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: "Ringkasan eksekutif program (tajuk, tarikh, tempat, objektif utama). Maksimum 3 ayat.",
            },
            budgetAnalysis: {
              type: Type.STRING,
              description: "Analisis ringkas mengenai bajet yang dimohon (jumlah, kewajaran, dan sumber pendapatan jika ada).",
            },
            impact: {
              type: Type.STRING,
              description: "Impak utama program kepada pelajar dan universiti.",
            },
          },
          required: ["executiveSummary", "budgetAnalysis", "impact"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("Ralat semasa menjana ringkasan AI:", error);
    throw new Error("Gagal menjana ringkasan AI.");
  }
}

export async function analyzePostProgramReport(reportText: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sila analisis laporan pascaprogram berikut dan berikan sentimen ringkas mengenai kejayaan program berdasarkan laporan pelajar.
      
      Laporan:
      ${reportText}`,
      config: {
        systemInstruction: "Anda adalah AI penganalisis laporan. Nilaikan kejayaan program berdasarkan objektif yang dicapai, penyertaan, dan pengurusan kewangan.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              description: "Sentimen keseluruhan (Sangat Berjaya, Berjaya, Memuaskan, Kurang Memuaskan).",
            },
            keyTakeaways: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 poin utama pencapaian atau kelemahan program.",
            },
          },
          required: ["sentiment", "keyTakeaways"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("Ralat semasa menganalisis laporan AI:", error);
    throw new Error("Gagal menganalisis laporan AI.");
  }
}
