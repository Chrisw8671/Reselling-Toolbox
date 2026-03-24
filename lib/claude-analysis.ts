import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ItemAnalysisInput {
  title: string;
  currentPrice: number;
  avgSoldPrice: number;
  soldSampleSize: number;
  condition: string | null;
  imageUrl: string | null;
}

export interface ItemAnalysisResult {
  recommendation: "buy" | "maybe" | "skip";
  confidence: number; // 0–100
  reasoning: string;
}

export async function analyseItem(item: ItemAnalysisInput): Promise<ItemAnalysisResult> {
  const estimatedMargin =
    item.avgSoldPrice > 0
      ? Math.round(((item.avgSoldPrice - item.currentPrice) / item.currentPrice) * 100)
      : 0;

  const imageContent: Anthropic.MessageParam["content"] = [];

  if (item.imageUrl) {
    try {
      const imgRes = await fetch(item.imageUrl);
      if (imgRes.ok) {
        const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
        const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (validTypes.some((t) => contentType.startsWith(t))) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          imageContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: contentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          });
        }
      }
    } catch {
      // Image fetch failed — continue without it
    }
  }

  const textPrompt = `You are an expert eBay reseller helping to identify profitable flipping opportunities.

Analyse this eBay listing and decide if it is worth buying to resell for profit.

**Item:** ${item.title}
**Buy Price (current listing):** £${item.currentPrice.toFixed(2)}
**Condition:** ${item.condition ?? "Not specified"}
**Average recently sold price (${item.soldSampleSize} sold listings):** £${item.avgSoldPrice.toFixed(2)}
**Estimated gross margin:** ${estimatedMargin}%

Consider:
- Is the margin realistic after eBay fees (~13%) and postage (~£3–5)?
- Does the item look genuine and in the condition described?
- Is this item in demand or a niche product?
- Are there any red flags (replica, poor condition, low demand)?

Respond ONLY with valid JSON in this exact format:
{
  "recommendation": "buy" | "maybe" | "skip",
  "confidence": <integer 0-100>,
  "reasoning": "<1-3 sentences explaining your decision>"
}`;

  const messageContent: Anthropic.MessageParam["content"] = [
    ...imageContent,
    { type: "text", text: textPrompt },
  ];

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: messageContent }],
  });

  const text =
    message.content.find((b) => b.type === "text")?.text?.trim() ?? "";

  // Extract JSON even if Claude wraps it in a code block
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { recommendation: "skip", confidence: 0, reasoning: "AI analysis failed to parse." };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      recommendation: "buy" | "maybe" | "skip";
      confidence: number;
      reasoning: string;
    };
    return {
      recommendation: parsed.recommendation ?? "skip",
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return { recommendation: "skip", confidence: 0, reasoning: "AI analysis failed to parse." };
  }
}
