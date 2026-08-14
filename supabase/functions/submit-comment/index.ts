import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || "";

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { action, comment, rating, commentId, status, adminResponse, limitCount } = body;

    // 1. SUBMIT COMMENT
    if (action === 'submit_comment') {
      const payload: any = {
        user_name: comment.userName || 'Élève',
        user_phone: comment.userPhone || 'N/A',
        content: comment.content,
        rating: comment.rating || 0,
        category: comment.category || 'general',
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      if (comment.userId) {
        payload.user_id = comment.userId;
      }

      const { data, error } = await supabaseAdmin
        .from('user_comments')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Database insert comment error:", error);
        return new Response(
          JSON.stringify({ error: error.message, details: error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. SUBMIT RATING
    if (action === 'submit_rating') {
      const payload: any = {
        user_name: rating.userName || 'Anonyme',
        overall: rating.overall || 5,
        features: rating.features || {},
        comment: rating.comment || '',
        timestamp: new Date().toISOString()
      };

      if (rating.userId) {
        payload.user_id = rating.userId;
      }

      const { data, error } = await supabaseAdmin
        .from('user_ratings')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Database insert rating error:", error);
        return new Response(
          JSON.stringify({ error: error.message, details: error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. GET STUDENT COMMENTS (Excludes support/crash items so student comments are never drowned out)
    if (action === 'get_comments') {
      const { data, error } = await supabaseAdmin
        .from('user_comments')
        .select('*')
        .neq('category', 'support')
        .neq('user_phone', 'crash-reporter')
        .order('timestamp', { ascending: false })
        .limit(limitCount || 100);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. GET SUPPORT / CRASH REPORTS (Dedicated for Support tab)
    if (action === 'get_support') {
      const { data, error } = await supabaseAdmin
        .from('user_comments')
        .select('*')
        .or('category.eq.support,user_phone.eq.crash-reporter')
        .order('timestamp', { ascending: false })
        .limit(limitCount || 100);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. GET ALL RATINGS
    if (action === 'get_ratings') {
      const { data, error } = await supabaseAdmin
        .from('user_ratings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limitCount || 100);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. UPDATE COMMENT STATUS
    if (action === 'update_comment') {
      const { data, error } = await supabaseAdmin
        .from('user_comments')
        .update({
          status,
          admin_response: adminResponse || '',
          admin_response_date: new Date().toISOString()
        })
        .eq('id', commentId)
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. DELETE COMMENT
    if (action === 'delete_comment') {
      const { error } = await supabaseAdmin
        .from('user_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. GET ALL USERS (Admin RLS Bypass via Service Role)
    if (action === 'get_users') {
      try {
        const usersMap = new Map<string, any>();

        // a. Fetch from profiles table
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profiles && Array.isArray(profiles)) {
          profiles.forEach(p => {
            if (p.id) usersMap.set(p.id, p);
          });
        }

        // b. Fetch from auth.users (Supabase Auth Admin API)
        try {
          const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (authData && authData.users && Array.isArray(authData.users)) {
            authData.users.forEach((u: any) => {
              if (u.id) {
                const existing = usersMap.get(u.id) || {};
                usersMap.set(u.id, {
                  id: u.id,
                  email: u.email || existing.email,
                  phone_number: u.phone || u.user_metadata?.phone_number || existing.phone_number || 'N/A',
                  name: u.user_metadata?.name || u.user_metadata?.full_name || existing.name || (u.email ? u.email.split('@')[0] : 'Élève Levelmak'),
                  role: u.user_metadata?.role || existing.role || 'student',
                  status: existing.status || 'active',
                  is_premium: existing.is_premium || false,
                  premium_until: existing.premium_until || null,
                  created_at: u.created_at || existing.created_at || new Date().toISOString(),
                  last_active: u.last_sign_in_at || existing.last_active || u.created_at,
                  stats: existing.stats || {}
                });
              }
            });
          }
        } catch (authErr) {
          console.warn("auth.admin.listUsers error in Edge Function:", authErr);
        }

        // c. Fetch from teachers table
        try {
          const { data: teachers } = await supabaseAdmin.from('teachers').select('*');
          if (teachers && Array.isArray(teachers)) {
            teachers.forEach((t: any) => {
              const tid = t.user_id || t.id;
              if (tid) {
                const existing = usersMap.get(tid) || {};
                usersMap.set(tid, {
                  ...existing,
                  id: tid,
                  name: t.name || t.full_name || existing.name || 'Enseignant Levelmak',
                  email: t.email || existing.email,
                  phone_number: t.whatsapp_number || t.phone_number || existing.phone_number,
                  role: 'teacher',
                  status: t.status || existing.status || 'active',
                  created_at: t.created_at || existing.created_at || new Date().toISOString(),
                  is_premium: true
                });
              }
            });
          }
        } catch (tErr) {
          console.warn("teachers query error in Edge Function:", tErr);
        }

        // d. Fetch from user_comments table
        try {
          const { data: comments } = await supabaseAdmin.from('user_comments').select('*');
          if (comments && Array.isArray(comments)) {
            comments.forEach((c: any) => {
              if (c.user_id && !usersMap.has(c.user_id) && c.user_name && c.user_name !== 'Élève Anonyme') {
                usersMap.set(c.user_id, {
                  id: c.user_id,
                  name: c.user_name,
                  phone_number: c.user_phone,
                  role: 'student',
                  status: 'active',
                  created_at: c.timestamp || new Date().toISOString(),
                  is_premium: false
                });
              }
            });
          }
        } catch (cErr) {
          console.warn("user_comments query error in Edge Function:", cErr);
        }

        const allUsers = Array.from(usersMap.values());
        return new Response(
          JSON.stringify({ success: true, data: allUsers }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        console.error("get_users edge action error:", err);
        return new Response(
          JSON.stringify({ error: err.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 9. GRANT SUBSCRIPTION BONUS (Admin Bonus Days & Tier Upgrade)
    if (action === 'grant_subscription_bonus') {
      const { targetUserId, bonusDays, tier, reason } = body;

      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      const currentExpiry = userProfile?.premium_until ? new Date(userProfile.premium_until).getTime() : Date.now();
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      const newExpiry = new Date(baseTime + (bonusDays || 7) * 24 * 60 * 60 * 1000).toISOString();

      if (userProfile) {
        const updatedStats = userProfile.stats || {};
        updatedStats.subscriptionTier = tier || userProfile.stats?.subscriptionTier || 'mensuel';
        updatedStats.subscription_tier = tier || userProfile.stats?.subscription_tier || 'mensuel';

        const notifications = updatedStats.notifications || [];
        const newNotification = {
          id: `notif_${Date.now()}`,
          title: "🎁 CADEAU BONUS LEVELMAK !",
          message: `Félicitations ! L'administration Levelmak vient de vous accorder ${bonusDays} jours d'accès Premium bonus. Prolonge jusqu'au ${new Date(newExpiry).toLocaleDateString()}.`,
          timestamp: new Date().toISOString(),
          read: false
        };
        updatedStats.notifications = [newNotification, ...notifications];

        await supabaseAdmin
          .from('profiles')
          .update({
            is_premium: true,
            premium_until: newExpiry,
            stats: updatedStats
          })
          .eq('id', targetUserId);
      }

      return new Response(
        JSON.stringify({ success: true, newExpiry, message: "Bonus attribué avec succès." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. GRANT QUOTA BOOST (Admin Boost Daily Messages)
    if (action === 'grant_quota_boost') {
      const { targetUserId, boostMessages } = body;

      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (userProfile) {
        const updatedStats = userProfile.stats || {};
        const currentBoost = updatedStats.adminMessageBoost || 0;
        updatedStats.adminMessageBoost = currentBoost + (boostMessages || 50);

        const notifications = updatedStats.notifications || [];
        const newNotification = {
          id: `notif_${Date.now()}`,
          title: "⚡ BOOST DE QUOTA ACCORDÉ !",
          message: `L'administration Levelmak vous a accordé un boost de +${boostMessages} messages IA par jour !`,
          timestamp: new Date().toISOString(),
          read: false
        };
        updatedStats.notifications = [newNotification, ...notifications];

        await supabaseAdmin
          .from('profiles')
          .update({
            stats: updatedStats
          })
          .eq('id', targetUserId);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Boost accordé avec succès." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. UPDATE USER STATUS ADMIN (Suspend, Block, Reactivate)
    if (action === 'update_user_status') {
      const { targetUserId, newStatus } = body;

      const { data: userProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (userProfile) {
        await supabaseAdmin
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', targetUserId);
      }

      return new Response(
        JSON.stringify({ success: true, status: newStatus }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Action inconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erreur submit-comment Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
