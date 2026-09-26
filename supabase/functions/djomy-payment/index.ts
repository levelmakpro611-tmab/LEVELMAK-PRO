import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

// Timing-safe comparison to prevent side-channel timing attacks
function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// HMAC-SHA256 Helper using Deno Web Crypto API
async function calculateHmacHex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const messageBuf = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    messageBuf
  );

  return Array.from(new Uint8Array(signatureBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Load environment variables
  const isProduction = Deno.env.get("DJOMY_ENV") !== "sandbox";
  
  const DJOMY_CLIENT_ID = (Deno.env.get("DJOMY_CLIENT_ID") || "").trim();
  const DJOMY_CLIENT_SECRET = (Deno.env.get("DJOMY_CLIENT_SECRET") || "").trim();
  const DJOMY_PARTNER_DOMAIN = (Deno.env.get("DJOMY_PARTNER_DOMAIN") || "").trim();
  const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || "").trim();
  const SERVICE_ROLE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "").trim();
  
  const baseUrl = isProduction 
    ? "https://api.djomy.africa" 
    : "https://sandbox-api.djomy.africa";

  // Check if it is a webhook call from Djomy
  const webhookSignature = req.headers.get("x-webhook-signature");
  
  if (webhookSignature) {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let rawBody = "";
    try {
      rawBody = await req.text();

      // Log raw request to admin_logs
      await supabaseAdmin.from("admin_logs").insert({
        admin_id: "webhook-system",
        admin_name: "Djomy Webhook Logger",
        action: "webhook_raw_received",
        details: {
          webhookSignature,
          rawBody: rawBody.slice(0, 1000)
        }
      });
      
      // Verify webhook authenticity (timing-safe)
      const cleanSignature = webhookSignature.startsWith("v1:") ? webhookSignature.slice(3) : webhookSignature;
      const expectedSignature = await calculateHmacHex(rawBody, DJOMY_CLIENT_SECRET);
      const isSignatureValid = timingSafeEqualHex(expectedSignature, cleanSignature) || timingSafeEqualHex(expectedSignature, webhookSignature);
      if (!isSignatureValid) {
        console.warn("Invalid webhook signature received:", webhookSignature, "expected:", expectedSignature);
        
        await supabaseAdmin.from("admin_logs").insert({
          admin_id: "webhook-system",
          admin_name: "Djomy Webhook Logger",
          action: "webhook_signature_failed",
          details: {
            webhookSignature,
            expectedSignature,
            rawBody: rawBody.slice(0, 1000)
          }
        });

        return new Response(JSON.stringify({ error: "Signature invalide" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = JSON.parse(rawBody);
      console.log("Valid Djomy webhook received payload:", payload);

      // Robust extraction of transaction ID (must be a valid UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let transactionId: string | null = null;

      if (payload.metadata?.transactionId && uuidRegex.test(payload.metadata.transactionId)) {
        transactionId = payload.metadata.transactionId;
      } else if (payload.merchantPaymentReference && uuidRegex.test(payload.merchantPaymentReference)) {
        transactionId = payload.merchantPaymentReference;
      } else if (payload.orderId && uuidRegex.test(payload.orderId)) {
        transactionId = payload.orderId;
      } else if (payload.reference && uuidRegex.test(payload.reference)) {
        transactionId = payload.reference;
      }

      // If we still don't have a valid UUID, look inside payload properties as fallback
      if (!transactionId) {
        // Log mismatch
        await supabaseAdmin.from("admin_logs").insert({
          admin_id: "webhook-system",
          admin_name: "Djomy Webhook Logger",
          action: "webhook_invalid_uuid",
          details: {
            payload,
            message: "No valid UUID found in reference, orderId, merchantPaymentReference or metadata.transactionId"
          }
        });

        return new Response(JSON.stringify({ error: "Format ID transaction invalide" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const status = payload.status; // e.g. 'SUCCESS', 'FAILED'
      const dbStatus = (status === "SUCCESS" || status === "payment.success" || status === "APPROVED") ? "success" : "failed";
      
      const { data: transaction, error: txError } = await supabaseAdmin
        .from("user_transactions")
        .update({ status: dbStatus })
        .eq("id", transactionId)
        .select()
        .single();

      if (txError || !transaction) {
        console.error("Error updating transaction in DB:", txError);
        
        await supabaseAdmin.from("admin_logs").insert({
          admin_id: "webhook-system",
          admin_name: "Djomy Webhook Logger",
          action: "webhook_tx_not_found",
          details: {
            transactionId,
            dbStatus,
            payload,
            error: txError?.message || "Transaction not found"
          }
        });

        return new Response(JSON.stringify({ error: "Transaction introuvable" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If success, activate premium subscription on profiles
      if (dbStatus === "success") {
        const userId = transaction.user_id;
        const duration = transaction.plan_duration || "monthly";

        // Smart Rollover Cumul: check if user already has an active subscription
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("is_premium, premium_until")
          .eq("id", userId)
          .maybeSingle();

        const now = Date.now();
        const baseDate = (existingProfile?.is_premium && existingProfile?.premium_until && new Date(existingProfile.premium_until).getTime() > now)
          ? new Date(existingProfile.premium_until)
          : new Date();

        const expirationDate = new Date(baseDate);
        if (duration === "weekly") {
          expirationDate.setDate(expirationDate.getDate() + 7);
        } else if (duration === "monthly") {
          expirationDate.setDate(expirationDate.getDate() + 30);
        } else if (duration === "annual") {
          expirationDate.setDate(expirationDate.getDate() + 365);
        }

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: true,
            premium_until: expirationDate.toISOString(),
          })
          .eq("id", userId);

        if (profileError) {
          console.error("Error updating profile premium status:", profileError);
          await supabaseAdmin.from("admin_logs").insert({
            admin_id: "webhook-system",
            admin_name: "Djomy Webhook Logger",
            action: "webhook_profile_update_error",
            details: {
              transactionId,
              userId,
              error: profileError
            }
          });
        } else {
          console.log(`Premium activated successfully for user ${userId} until ${expirationDate.toISOString()}`);
          await supabaseAdmin.from("admin_logs").insert({
            admin_id: "webhook-system",
            admin_name: "Djomy Webhook Logger",
            action: "webhook_premium_activated",
            details: {
              transactionId,
              userId,
              expiresAt: expirationDate.toISOString()
            }
          });
        }
      } else {
        // Log transaction marked as failed
        await supabaseAdmin.from("admin_logs").insert({
          admin_id: "webhook-system",
          admin_name: "Djomy Webhook Logger",
          action: "webhook_tx_failed",
          details: {
            transactionId,
            payload
          }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (e: any) {
      console.error("Error processing Djomy webhook:", e);
      try {
        await supabaseAdmin.from("admin_logs").insert({
          admin_id: "webhook-system",
          admin_name: "Djomy Webhook Logger",
          action: "webhook_fatal_error",
          details: {
            error: e.message,
            stack: e.stack,
            rawBody: rawBody.slice(0, 1000)
          }
        });
      } catch (logErr) {
        console.error("Failed to log fatal error to DB:", logErr);
      }

      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Normal request handler: create checkout session or verify status
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentification requise" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate Supabase user
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Utilisateur non valide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestBody = await req.json();
    const { action, transactionId } = requestBody;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ACTION: ACTIVATE PREMIUM (server-side, bypasses RLS)
    if (action === "activate-premium") {
      const { duration: planDuration, transactionId: txId } = requestBody;

      if (!planDuration) {
        return new Response(JSON.stringify({ error: "Durée du plan manquante" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch existing profile to allow cumulative rollover
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("is_premium, premium_until")
        .eq("id", user.id)
        .maybeSingle();

      const now = Date.now();
      const baseDate = (existingProfile?.is_premium && existingProfile?.premium_until && new Date(existingProfile.premium_until).getTime() > now)
        ? new Date(existingProfile.premium_until)
        : new Date();

      const expirationDate = new Date(baseDate);
      if (planDuration === "weekly") expirationDate.setDate(expirationDate.getDate() + 7);
      else if (planDuration === "monthly") expirationDate.setDate(expirationDate.getDate() + 30);
      else if (planDuration === "annual") expirationDate.setDate(expirationDate.getDate() + 365);
      else expirationDate.setDate(expirationDate.getDate() + 30); // fallback monthly

      const expiryIso = expirationDate.toISOString();

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ is_premium: true, premium_until: expiryIso })
        .eq("id", user.id);

      if (profileError) {
        console.error("activate-premium: profile update error:", profileError);
        return new Response(JSON.stringify({ error: "Échec de l'activation du profil: " + profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If a transactionId is provided, also mark transaction as success
      if (txId) {
        await supabaseAdmin
          .from("user_transactions")
          .update({ status: "success" })
          .eq("id", txId)
          .eq("user_id", user.id);
      }

      await supabaseAdmin.from("admin_logs").insert({
        admin_id: "payment-system",
        admin_name: "Levelmak Auto Activation",
        action: "activate_premium_server_side",
        details: {
          userId: user.id,
          duration: planDuration,
          transactionId: txId || null,
          expiresAt: expiryIso
        }
      });

      console.log(`activate-premium: Premium activated for user ${user.id} until ${expiryIso}`);
      return new Response(JSON.stringify({ success: true, premium_until: expiryIso, is_premium: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: VERIFY STATUS
    if (action === "verify-status") {
      if (!transactionId) {
        return new Response(JSON.stringify({ error: "ID transaction manquant" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tx, error: txError } = await supabaseAdmin
        .from("user_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (txError || !tx) {
        return new Response(JSON.stringify({ error: "Transaction introuvable dans la DB" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If already success or failed, return it immediately
      if (tx.status === "success" || tx.status === "failed") {
        return new Response(JSON.stringify({ success: true, status: tx.status }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If we don't have provider_tx_id, we can't query Djomy API
      if (!tx.provider_tx_id) {
        return new Response(JSON.stringify({ success: true, status: tx.status, message: "Pas d'ID provider associé" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Query Djomy status API
      // 1. Auth with Djomy to retrieve Bearer Token
      const hexSignature = await calculateHmacHex(DJOMY_CLIENT_ID, DJOMY_CLIENT_SECRET);
      const authHeaders = {
        "Content-Type": "application/json",
        "User-Agent": "LevelMak-Pro/1.0",
        "X-API-KEY": `${DJOMY_CLIENT_ID}:${hexSignature}`,
      };

      const authResponse = await fetch(`${baseUrl}/v1/auth`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({}),
      });

      if (!authResponse.ok) {
        throw new Error("Échec d'authentification auprès de l'opérateur de paiement.");
      }

      const authData = await authResponse.json();
      const bearerToken = authData.token || authData.data?.token || authData.data?.accessToken || authData.accessToken;
      
      // 2. Query status
      const querySig = await calculateHmacHex(DJOMY_CLIENT_ID, DJOMY_CLIENT_SECRET);
      const statusResponse = await fetch(`${baseUrl}/v1/payments/${tx.provider_tx_id}/status`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${bearerToken}`,
          "X-API-KEY": `${DJOMY_CLIENT_ID}:${querySig}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Échec de récupération du statut auprès de Djomy: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();
      const djomyStatus = statusData.data?.status || statusData.status;

      const dbStatus = (djomyStatus === "SUCCESS" || djomyStatus === "payment.success" || djomyStatus === "APPROVED") ? "success" : 
                       (djomyStatus === "FAILED" || djomyStatus === "CANCELLED" || djomyStatus === "TIMEOUT") ? "failed" : "pending";

      // If status changed, update DB and activate subscription if success
      if (dbStatus !== tx.status) {
        const { error: updateError } = await supabaseAdmin
          .from("user_transactions")
          .update({ status: dbStatus })
          .eq("id", tx.id);

        if (!updateError && dbStatus === "success") {
          const userId = tx.user_id;
          const duration = tx.plan_duration || "monthly";

          const expirationDate = new Date();
          if (duration === "weekly") {
            expirationDate.setDate(expirationDate.getDate() + 7);
          } else if (duration === "monthly") {
            expirationDate.setDate(expirationDate.getDate() + 30);
          } else if (duration === "annual") {
            expirationDate.setDate(expirationDate.getDate() + 365);
          }

          await supabaseAdmin
            .from("profiles")
            .update({
              is_premium: true,
              premium_until: expirationDate.toISOString(),
            })
            .eq("id", userId);
        }
      }

      return new Response(JSON.stringify({ success: true, status: dbStatus }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: CREATE CHECKOUT SESSION
    const { planId, amount, payerNumber, returnUrl, duration, simulate } = requestBody;

    // Verify user is not a teacher (teachers cannot purchase subscriptions)
    const [ { data: dbProfile }, { data: dbTeacher } ] = await Promise.all([
      supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("teachers").select("id").eq("user_id", user.id).maybeSingle()
    ]);

    if (dbProfile?.role === "teacher" || dbTeacher) {
      return new Response(JSON.stringify({ error: "Les enseignants ne peuvent pas souscrire d'abonnement." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!amount || !payerNumber || !returnUrl || !duration) {
      return new Response(JSON.stringify({ error: "Champs obligatoires manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IF SIMULATION MODE
    if (simulate && !isProduction) {
      // 1. Create transaction in DB as success directly
      const { data: tx, error: txError } = await supabaseAdmin
        .from("user_transactions")
        .insert({
          user_id: user.id,
          amount: amount,
          currency: "FG",
          status: "success",
          payment_method: "orange_money",
          item_type: "premium",
          plan_duration: duration,
        })
        .select()
        .single();

      if (txError || !tx) {
        console.error("Error creating simulated tx:", txError);
        throw new Error(`Impossible de simuler la transaction: ${txError.message}`);
      }

      // 2. Activate subscription
      const expirationDate = new Date();
      if (duration === "weekly") {
        expirationDate.setDate(expirationDate.getDate() + 7);
      } else if (duration === "monthly") {
        expirationDate.setDate(expirationDate.getDate() + 30);
      } else if (duration === "annual") {
        expirationDate.setDate(expirationDate.getDate() + 365);
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_premium: true,
          premium_until: expirationDate.toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        console.error("Error updating simulated profile:", profileError);
        throw new Error(`Impossible d'activer l'abonnement simulé: ${profileError.message}`);
      }

      return new Response(JSON.stringify({ success: true, redirectUrl: returnUrl, transactionId: tx.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure profile row exists to satisfy foreign key constraint
    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        role: "user",
        status: "active"
      }, { onConflict: "id" });

    // 1. Create transaction log
    const { data: tx, error: txError } = await supabaseAdmin
      .from("user_transactions")
      .insert({
        user_id: user.id,
        amount: amount,
        currency: "FG",
        status: "pending",
        payment_method: "orange_money",
        item_type: "premium",
        plan_duration: duration,
      })
      .select()
      .single();

    if (txError || !tx) {
      console.error("Error inserting transaction log:", txError);
      throw new Error(`Impossible de créer la transaction: ${txError?.message || 'Inconnue'} (code: ${txError?.code || 'Aucun'})`);
    }

    // 2. Auth with Djomy to retrieve Bearer Token
    const hexSignature = await calculateHmacHex(DJOMY_CLIENT_ID, DJOMY_CLIENT_SECRET);
    const authHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "X-API-KEY": `${DJOMY_CLIENT_ID}:${hexSignature}`,
      "X-PARTNER-DOMAIN": DJOMY_PARTNER_DOMAIN,
    };

    console.log("Authenticating with Djomy API...");
    const authResponse = await fetch(`${baseUrl}/v1/auth`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({}),
    });

    if (!authResponse.ok) {
      const authErrText = await authResponse.text();
      console.error("Djomy auth returned error:", authResponse.status, authErrText);
      throw new Error(`Réponse Djomy (HTTP ${authResponse.status}): ${authErrText.slice(0, 300)}`);
    }

    const authData = await authResponse.json();
    const bearerToken = authData.token || authData.data?.token || authData.data?.accessToken || authData.accessToken;
    if (!bearerToken) {
      throw new Error("Token d'accès manquant de la part de Djomy.");
    }

    // 3. Initiate payment session on Djomy Gateway
    const paymentSignature = await calculateHmacHex(DJOMY_CLIENT_ID, DJOMY_CLIENT_SECRET);
    const gatewayHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${bearerToken}`,
      "X-API-KEY": `${DJOMY_CLIENT_ID}:${paymentSignature}`,
      "X-PARTNER-DOMAIN": DJOMY_PARTNER_DOMAIN,
    };

    // Format payerNumber to international format required by Djomy (Ex: 00224623707722)
    let formattedPayerNumber = String(payerNumber || "").replace(/\D/g, "");
    if (formattedPayerNumber.length === 9) {
      formattedPayerNumber = "00224" + formattedPayerNumber;
    } else if (formattedPayerNumber.startsWith("224") && formattedPayerNumber.length === 12) {
      formattedPayerNumber = "00" + formattedPayerNumber;
    }

    // Ensure returnUrl is valid (use client returnUrl, fallback to levelmak-pro.vercel.app)
    let safeReturnUrl = returnUrl ? String(returnUrl).trim() : "";
    if (!safeReturnUrl || safeReturnUrl.includes("levelmak.app") || safeReturnUrl.includes("localhost") || !safeReturnUrl.startsWith("https://")) {
      safeReturnUrl = "https://levelmak-pro.vercel.app/pricing?success=true";
    }

    let safeCancelUrl = safeReturnUrl.includes("success=true")
      ? safeReturnUrl.replace("success=true", "cancelled=true")
      : (safeReturnUrl.includes("?") ? `${safeReturnUrl}&cancelled=true` : `${safeReturnUrl}?cancelled=true`);

    const gatewayBody = {
      amount: amount,
      countryCode: "GN",
      payerNumber: formattedPayerNumber,
      merchantPaymentReference: tx.id,
      description: `Abonnement LEVELMAK PRO - ${duration === 'weekly' ? 'Hebdomadaire' : duration === 'monthly' ? 'Mensuel' : 'Annuel'}`,
      returnUrl: safeReturnUrl,
      cancelUrl: safeCancelUrl,
      metadata: {
        userId: user.id,
        transactionId: tx.id,
        planId: planId,
        duration: duration,
      },
    };

    console.log("Creating Djomy Checkout session with payload:", gatewayBody);
    const gatewayResponse = await fetch(`${baseUrl}/v1/payments/gateway`, {
      method: "POST",
      headers: gatewayHeaders,
      body: JSON.stringify(gatewayBody),
    });

    if (!gatewayResponse.ok) {
      const gatewayErrText = await gatewayResponse.text();
      console.error("Djomy payment gateway returned error:", gatewayResponse.status, gatewayErrText);
      throw new Error(`Échec de la création de la session de paiement: ${gatewayErrText} (status: ${gatewayResponse.status})`);
    }

    const gatewayData = await gatewayResponse.json();
    const redirectUrl = gatewayData.redirectUrl || gatewayData.data?.redirectUrl || gatewayData.data?.paymentUrl || gatewayData.paymentUrl;
    const djomyTxId = gatewayData.transactionId || gatewayData.data?.transactionId || gatewayData.data?.id || gatewayData.id;

    if (!redirectUrl) {
      throw new Error("URL de redirection de paiement manquante de la part de Djomy.");
    }

    // Store provider's transaction ID in our DB
    if (djomyTxId) {
      const { error: updateError } = await supabaseAdmin
        .from("user_transactions")
        .update({ provider_tx_id: djomyTxId })
        .eq("id", tx.id);
      
      if (updateError) {
        console.warn("Failed to store provider_tx_id in DB:", updateError);
      }
    }

    return new Response(JSON.stringify({ success: true, redirectUrl, transactionId: tx.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in djomy-payment function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
