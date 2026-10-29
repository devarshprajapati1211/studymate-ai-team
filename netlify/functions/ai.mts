import type { Config, Context } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";
import { isSameOrigin, requireUser } from "../../lib/auth.js";

const MODEL = "gemini-3.8-flash";

type ChatTurn = { role: "user" | "model"; text: string };

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!isSameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const user = await requireUser();
  if (user instanceof Response) return user;

  const body = await req.json().catch(() => ({}));
  const ai = new GoogleGenAI({});

  try {
    switch (context.params.action) {
      case "chat": {
        const history: ChatTurn[] = Array.isArray(body.history) ? body.history.slice(-12) : [];
        const question = String(body.question ?? "").trim().slice(0, 4000);
        if (!question) return Response.json({ error: "Please type a question." }, { status: 400 });

        const response = await ai.models.generateContent({
          model: MODEL,
          contents: [
            ...history
              .filter((t) => (t.role === "user" || t.role === "model") && typeof t.text === "string")
              .map((t) => ({ role: t.role, parts: [{ text: t.text.slice(0, 4000) }] })),
            { role: "user", parts: [{ text: question }] },
          ],
          config: {
            systemInstruction:
              "You are StudyMate, a friendly tutor for students. Explain concepts clearly and step by step, " +
              "use short paragraphs and simple examples, and check understanding at the end when helpful. " +
              "Format answers in plain text with simple Markdown (bold, lists, code) only.",
          },
        });
        return Response.json({ answer: response.text?.trim() ?? "" });
      }

      case "quiz": {
        const topic = String(body.topic ?? "").trim().slice(0, 200);
        if (!topic) return Response.json({ error: "Topic is required." }, { status: 400 });
        const difficulty = ["easy", "medium", "hard"].includes(body.difficulty) ? body.difficulty : "medium";
        const count = Math.min(Math.max(Number(body.count) || 5, 1), 15);

        const response = await ai.models.generateContent({
          model: MODEL,
          contents: `Write exactly ${count} ${difficulty}-level multiple-choice questions about "${topic}". Each question has exactly 4 options and one correct answer, plus a one-sentence explanation.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  answerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ["question", "options", "answerIndex", "explanation"],
              },
            },
          },
        });
        return Response.json({ quiz: JSON.parse(response.text ?? "[]") });
      }

      case "flashcards": {
        const topic = String(body.topic ?? "").trim().slice(0, 200);
        if (!topic) return Response.json({ error: "Topic is required." }, { status: 400 });

        const response = await ai.models.generateContent({
          model: MODEL,
          contents: `Create 8 study flashcards for the topic "${topic}". The front is a short question or term, the back is a concise answer (max 2 sentences).`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { front: { type: Type.STRING }, back: { type: Type.STRING } },
                required: ["front", "back"],
              },
            },
          },
        });
        return Response.json({ flashcards: JSON.parse(response.text ?? "[]") });
      }

      default:
        return Response.json({ error: "Not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("AI request failed", error);
    return Response.json({ error: "The AI couldn't answer right now. Please try again." }, { status: 502 });
  }
};

export const config: Config = {
  path: "/api/ai/:action",
};
