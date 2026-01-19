
import { GoogleGenAI, Modality } from "@google/genai";

export const generateSceneImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Digital storybook illustration style, vivid cinematic colors, high detail, no text: ${prompt}` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const generateNarrationAudio = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Crafting a complex prompt to guide the TTS into character performances.
    const prompt = `
      Please act as a versatile voice actor and narrate the following text.
      
      Character Voice Instructions:
      1. Narrator (unlabeled text or labels like '旁白'): Use a 'Magical Old Grandfather' voice—warm, wise, slightly raspy, and full of wonder.
      2. Lion (labels like '狮子' or 'Leo'): Use a 'Deep, Thick, and Domineering' voice—authoritative, booming, and low-pitched.
      3. Tiger (labels like '老虎' or 'Tigris'): Use an 'Agile and Crisp' voice—fast-paced, sharp, alert, and energetic.

      Text to narrate:
      ${text}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Using 'Kore' as a base for the wise grandfather, but letting prompt instructions guide the animal nuances.
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned");
    return base64Audio;
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
};

// Helper to decode PCM
export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
