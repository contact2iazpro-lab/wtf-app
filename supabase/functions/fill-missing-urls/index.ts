import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const anthropicKey = Deno.env.get("ANTHROPIC_KEY") || Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Fetch VIP facts without source_url
    const { data: facts, error: fetchError } = await supabase
      .from("facts")
      .select("id, question, short_answer, explanation")
      .eq("type", "vip")
      .or("source_url.is.null,source_url.eq.")
      .order("id", { ascending: true });

    if (fetchError) throw fetchError;
    if (!facts || facts.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, updated: 0, not_found: 0, details: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const details: { id: number; url: string }[] = [];
    let updated = 0;
    let notFound = 0;

    // Handle fact #351 first (special rule)
    const idx351 = facts.findIndex((f) => f.id === 351);
    if (idx351 !== -1) {
      const specialUrl = "https://www.zebulo.com";
      await supabase
        .from("facts")
        .update({ source_url: specialUrl, updated_at: new Date().toISOString() })
        .eq("id", 351);
      console.log("Fact #351 → www.zebulo.com (règle spéciale)");
      details.push({ id: 351, url: specialUrl });
      updated++;
      facts.splice(idx351, 1);
    }

    // Process remaining facts sequentially
    for (const fact of facts) {
      const prompt = `Tu es un assistant de recherche factuelle.

Voici un fait scientifique/culturel/historique :
Question : ${fact.question}
Réponse : ${fact.short_answer}
Explication : ${fact.explanation || ""}

Trouve une URL de source fiable et réelle qui confirme ce fait.
Priorité : Wikipedia FR, Wikipedia EN, sites gouvernementaux, musées, encyclopédies scientifiques reconnues, grands médias.

Réponds UNIQUEMENT avec l'URL complète (https://...), rien d'autre.
Si tu ne trouves pas de source fiable, réponds : INTROUVABLE`;

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-opus-4-20250514",
            max_tokens: 256,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const data = await response.json();
        const answer = (data.content?.[0]?.text || "").trim();

        if (answer.startsWith("http")) {
          await supabase
            .from("facts")
            .update({ source_url: answer, updated_at: new Date().toISOString() })
            .eq("id", fact.id);
          console.log(`Fact #${fact.id} → ${answer}`);
          details.push({ id: fact.id, url: answer });
          updated++;
        } else {
          console.log(`Fact #${fact.id} → source introuvable`);
          details.push({ id: fact.id, url: "INTROUVABLE" });
          notFound++;
        }
      } catch (err) {
        console.error(`Fact #${fact.id} — erreur Opus:`, err);
        details.push({ id: fact.id, url: "INTROUVABLE" });
        notFound++;
      }

      // 500ms delay between calls to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    }

    return new Response(
      JSON.stringify({
        processed: details.length,
        updated,
        not_found: notFound,
        details,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fill-missing-urls error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
