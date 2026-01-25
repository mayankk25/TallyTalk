import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedTransaction {
  amount: number;
  description: string;
  suggested_category: string;
  type: "expense" | "income";
}

async function transcribeAudio(audioBase64: string): Promise<string> {
  const binaryStr = atob(audioBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  console.log("Audio bytes length:", bytes.length);

  const formData = new FormData();
  const blob = new Blob([bytes], { type: "audio/mp4" });
  formData.append("file", blob, "recording.m4a");
  formData.append("model", "whisper-1");
  formData.append("task", "translate"); // Always translate any language to English

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  const responseText = await response.text();
  console.log("Whisper response status:", response.status);

  if (!response.ok) {
    throw new Error(`Whisper API error: ${responseText}`);
  }

  const result = JSON.parse(responseText);
  return result.text;
}

async function parseTransactionsWithGPT(transcript: string): Promise<ParsedTransaction[]> {
  console.log("Sending to GPT API...");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You extract financial transactions from voice transcripts. The transcript may be translated from another language - ALWAYS output descriptions in English regardless of the original language. ALWAYS return a JSON array with at least one transaction if there's a dollar amount mentioned.

Each transaction needs:
- amount: number (dollar amount, always positive)
- description: string (brief description of what it's for)
- suggested_category: string (from the lists below)
- type: "expense" or "income"

INCOME indicators (use type: "income"):
- Words: salary, paycheck, income, received, earned, got paid, payment, bonus, dividend, interest, refund, freelance, commission, tips, gift money, sold, revenue
- Context: money coming IN to the user

EXPENSE indicators (use type: "expense"):
- Words: spent, bought, paid for, cost, purchased, expense, charged, bill, subscription
- Context: money going OUT from the user

EXPENSE categories: "Food & Dining", "Groceries", "Transport", "Entertainment", "Shopping", "Bills & Utilities", "Health", "Other"
INCOME categories: "Salary", "Freelance", "Investments", "Gifts", "Refunds", "Other Income"

Examples:
- "$20 for lunch" → [{"amount": 20, "description": "lunch", "suggested_category": "Food & Dining", "type": "expense"}]
- "$5000 salary" or "$5000 for salary" → [{"amount": 5000, "description": "salary", "suggested_category": "Salary", "type": "income"}]
- "Got $50 refund" → [{"amount": 50, "description": "refund", "suggested_category": "Refunds", "type": "income"}]
- "$100 freelance work" → [{"amount": 100, "description": "freelance work", "suggested_category": "Freelance", "type": "income"}]
- "$25 coffee and $30 uber" → [{"amount": 25, "description": "coffee", "suggested_category": "Food & Dining", "type": "expense"}, {"amount": 30, "description": "uber", "suggested_category": "Transport", "type": "expense"}]

IMPORTANT: If the description mentions salary, paycheck, freelance, bonus, refund, income, or similar - it's INCOME, not expense.

LANGUAGE: Always output descriptions in English. If any part of the transcript contains non-English words, translate them to English for the description field.

Return ONLY a valid JSON array, no other text.`
        },
        {
          role: "user",
          content: transcript
        }
      ],
      temperature: 0.1,
    }),
  });

  const responseText = await response.text();
  console.log("GPT response status:", response.status);

  if (!response.ok) {
    throw new Error(`GPT API error: ${responseText}`);
  }

  const result = JSON.parse(responseText);
  const content = result.choices[0].message.content;
  console.log("GPT content:", content);

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (e) {
    console.error("Failed to parse:", content);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { audio } = body;

    if (!audio) {
      return new Response(
        JSON.stringify({ error: "No audio data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received audio base64 length:", audio.length);

    // Transcribe with Whisper
    const transcript = await transcribeAudio(audio);
    console.log("Transcript:", transcript);

    if (!transcript || transcript.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Could not understand audio. Please speak more clearly." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse transactions with GPT
    const transactions = await parseTransactionsWithGPT(transcript);
    console.log("Transactions:", JSON.stringify(transactions));

    return new Response(
      JSON.stringify({ transcript, expenses: transactions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
