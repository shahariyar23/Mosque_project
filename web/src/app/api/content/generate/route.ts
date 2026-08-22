import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const contentTypes = ["announcement", "article", "khutbah", "event"] as const;
type ContentType = (typeof contentTypes)[number];

function isContentType(value: unknown): value is ContentType {
  return (
    typeof value === "string" && contentTypes.includes(value as ContentType)
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.permissions.includes("article.manage")) {
    return NextResponse.json(
      { error: "You do not have permission to generate content." },
      { status: 403 },
    );
  }

  const apiKey = process.env.AGENTROUTER_API_KEY;
  const baseUrl = process.env.AGENTROUTER_BASE_URL;
  const model = process.env.AGENTROUTER_MODEL;

  if (!apiKey || apiKey.startsWith("replace_with_")) {
    return NextResponse.json(
      { error: "Add your AgentRouter API key to web/.env.local first." },
      { status: 503 },
    );
  }

  let body: {
    contentType?: unknown;
    topic?: unknown;
    tone?: unknown;
    language?: unknown;
    length?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (
    !isContentType(body.contentType) ||
    typeof body.topic !== "string" ||
    !body.topic.trim()
  ) {
    return NextResponse.json(
      { error: "Choose a content type and enter a topic." },
      { status: 400 },
    );
  }

  const tone = typeof body.tone === "string" ? body.tone : "warm and welcoming";
  const language =
    typeof body.language === "string" ? body.language : "English";
  const length =
    typeof body.length === "string" ? body.length : "medium length";
  const typeLabel =
    body.contentType.charAt(0).toUpperCase() + body.contentType.slice(1);
  const prompt = [
    `Create a ${typeLabel.toLowerCase()} draft for Noor Community Mosque.`,
    `Topic: ${body.topic.trim()}`,
    `Tone: ${tone}. Language: ${language}. Length: ${length}.`,
    "Write only the draft content, with a clear title followed by the body.",
    "Do not invent dates, times, links, quotations, or statistics. Use placeholders such as [date] when information is missing.",
  ].join("\n");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a careful mosque communications editor. Keep religious language respectful and accessible.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "AgentRouter could not generate the draft. Check your model and API key.",
        },
        { status: 502 },
      );
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty model response");

    return NextResponse.json({ content });
  } catch {
    return NextResponse.json(
      { error: "The content service is unavailable. Try again shortly." },
      { status: 502 },
    );
  }
}
