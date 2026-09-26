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

    // 8. GET ALL USERS — Source unique : auth.users (via admin API) mergé avec profiles
    // C'est la seule source de vérité pour la Gestion Utilisateurs ET la Vue d'ensemble
    if (action === 'get_users') {
      try {
        const usersMap = new Map<string, any>();

        // SOURCE PRIMAIRE : auth.admin.listUsers (tous les comptes Supabase Auth réels)
        try {
          const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (!authErr && authData?.users) {
            authData.users.forEach((u: any) => {
              if (u.id) {
                usersMap.set(u.id, {
                  id: u.id,
                  email: u.email || u.user_metadata?.email || null,
                  phone_number: u.phone || u.user_metadata?.phone_number || null,
                  name: u.user_metadata?.name || u.user_metadata?.full_name || (u.email ? u.email.split('@')[0] : 'Élève Levelmak'),
                  role: u.user_metadata?.role || 'student',
                  status: 'active',
                  is_premium: false,
                  premium_until: null,
                  created_at: u.created_at,
                  last_active: u.last_sign_in_at || u.created_at,
                  stats: {}
                });
              }
            });
          }
        } catch (authErr) {
          console.warn("auth.admin.listUsers error:", authErr);
        }

        // ENRICHISSEMENT : profiles (ajoute xp, level, subscription, stats)
        try {
          const { data: profiles } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
          if (profiles) {
            profiles.forEach((p: any) => {
              if (p.id) {
                const existing = usersMap.get(p.id) || {};
                usersMap.set(p.id, {
                  ...existing,
                  id: p.id,
                  name: p.name || p.username || existing.name || 'Élève Levelmak',
                  email: p.email || p.auth_email || existing.email,
                  phone_number: p.phone_number || existing.phone_number,
                  role: p.role || existing.role || 'student',
                  status: p.status || existing.status || 'active',
                  is_premium: p.is_premium ?? existing.is_premium ?? false,
                  premium_until: p.premium_until || existing.premium_until,
                  created_at: existing.created_at || p.created_at,
                  last_active: p.last_active || existing.last_active,
                  xp: p.xp || 0,
                  level: p.level || 1,
                  grade_class: p.grade_class,
                  age_range: p.age_range,
                  subscription_tier: p.subscription_tier,
                  stats: p.stats || existing.stats || {}
                });
              }
            });
          }
        } catch (profileErr) {
          console.warn("profiles enrichment error:", profileErr);
        }

        // ENRICHISSEMENT : teachers (ajoute les enseignants non présents dans auth.users)
        try {
          const { data: teachers } = await supabaseAdmin.from('teachers').select('*');
          if (teachers) {
            teachers.forEach((t: any) => {
              const tid = t.user_id || t.id;
              if (tid && !usersMap.has(tid)) {
                usersMap.set(tid, {
                  id: tid,
                  name: t.name || t.full_name || 'Enseignant Levelmak',
                  email: t.email,
                  phone_number: t.whatsapp_number || t.phone_number,
                  role: 'teacher',
                  status: t.status || 'active',
                  is_premium: true,
                  created_at: t.created_at || new Date().toISOString(),
                  stats: {}
                });
              } else if (tid) {
                // Enrichir le rôle si déjà dans la map
                const ex = usersMap.get(tid);
                usersMap.set(tid, { ...ex, role: 'teacher', is_premium: true });
              }
            });
          }
        } catch (tErr) {
          console.warn("teachers enrichment error:", tErr);
        }

        const allUsers = Array.from(usersMap.values());
        return new Response(
          JSON.stringify({ success: true, data: allUsers, total: allUsers.length }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        console.error("get_users error:", err);
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

      const updatedStats = userProfile?.stats || {};
      updatedStats.subscriptionTier = tier || userProfile?.stats?.subscriptionTier || 'mensuel';
      updatedStats.subscription_tier = tier || userProfile?.stats?.subscription_tier || 'mensuel';

      const notifications = updatedStats.notifications || [];
      const newNotification = {
        id: `notif_${Date.now()}`,
        title: "🎁 CADEAU BONUS LEVELMAK !",
        message: `Félicitations ! L'administration Levelmak vient de vous accorder ${bonusDays} jours d'accès Premium bonus. Prolonge jusqu'au ${new Date(newExpiry).toLocaleDateString()}.`,
        timestamp: new Date().toISOString(),
        read: false
      };
      updatedStats.notifications = [newNotification, ...notifications];

      let { error: dbErr } = await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: true,
          premium_until: newExpiry,
          stats: updatedStats
        })
        .eq('id', targetUserId);

      if (dbErr) {
        console.error("grant_subscription_bonus update error:", dbErr);
        return new Response(
          JSON.stringify({ error: dbErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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

      const updatedStats = userProfile?.stats || {};
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

      const { error: dbErr } = await supabaseAdmin
        .from('profiles')
        .update({
          stats: updatedStats
        })
        .eq('id', targetUserId);

      if (dbErr) {
        console.error("grant_quota_boost update error:", dbErr);
        return new Response(
          JSON.stringify({ error: dbErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Boost accordé avec succès." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. UPDATE USER STATUS ADMIN (Suspend, Block, Reactivate)
    if (action === 'update_user_status') {
      const { targetUserId, newStatus } = body;

      const { error: dbErr } = await supabaseAdmin
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', targetUserId);

      if (dbErr) {
        console.error("update_user_status update error:", dbErr);
        return new Response(
          JSON.stringify({ error: dbErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, status: newStatus }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 12. GET REAL STATS — Source unique : auth.users count (aligné avec get_users)
    if (action === 'get_stats') {
      try {
        const now = new Date();
        const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
        const startOfMonth = new Date(now); startOfMonth.setDate(now.getDate() - 30);

        // TOTAL USERS — auth.users (même source que get_users pour cohérence)
        let totalUsers = 0;
        let newToday = 0, newWeek = 0, newMonth = 0;
        try {
          const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          if (authData?.users) {
            const users = authData.users;
            totalUsers = users.length;
            const todayISO = startOfToday.toISOString();
            const weekISO = startOfWeek.toISOString();
            const monthISO = startOfMonth.toISOString();
            newToday = users.filter((u: any) => u.created_at >= todayISO).length;
            newWeek = users.filter((u: any) => u.created_at >= weekISO).length;
            newMonth = users.filter((u: any) => u.created_at >= monthISO).length;
          }
        } catch (_) {
          // Fallback: profiles count
          const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
          totalUsers = count || 0;
        }

        // Parallelized count queries for performance
        const [
          { count: quizzesGenerated },
          { count: quizzesToday },
          { count: flashcardsCreated },
          { count: flashcardsToday },
          { count: activeUsers },
          aiCountRes
        ] = await Promise.all([
          supabaseAdmin.from('user_quizzes').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('user_quizzes').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday.toISOString()),
          supabaseAdmin.from('user_flashcard_decks').select('*', { count: 'exact', head: true }),
          supabaseAdmin.from('user_flashcard_decks').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday.toISOString()),
          supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active', startOfWeek.toISOString()),
          supabaseAdmin.from('student_ai_interactions').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 }))
        ]);

        const aiInteractionsCount = aiCountRes?.count || 0;

        const total = totalUsers;
        const active = activeUsers || 0;
        const engagementRate = total > 0 ? Number(((active / total) * 100).toFixed(1)) : 0;

        return new Response(JSON.stringify({
          success: true,
          data: {
            totalUsers: total,
            activeUsers: active,
            newUsersToday: newToday,
            newUsersWeek: newWeek,
            newUsersMonth: newMonth,
            quizzesGenerated: quizzesGenerated || 0,
            quizzesToday: quizzesToday || 0,
            flashcardsCreated: flashcardsCreated || 0,
            flashcardsToday: flashcardsToday || 0,
            averageEngagementRate: engagementRate,
            aiInteractionsCount
          }
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err: any) {
        console.error("get_stats error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 13. DELETE USER ADMIN (RLS Bypass via Service Role Key)

    if (action === 'delete_user') {
      const { userId } = body;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId requis' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errors: string[] = [];
      // 1. Supprimer toutes les données utilisateur (ordre important : FK d'abord)
      const tables = [
        { table: 'user_comments', field: 'user_id' },
        { table: 'user_quizzes', field: 'user_id' },
        { table: 'user_flashcard_decks', field: 'user_id' },
        { table: 'user_stories', field: 'user_id' },
        { table: 'student_ai_interactions', field: 'user_id' },
        { table: 'teachers', field: 'user_id' },
        { table: 'profiles', field: 'id' },
      ];
      for (const { table, field } of tables) {
        try {
          await supabaseAdmin.from(table).delete().eq(field, userId);
        } catch (e: any) {
          errors.push(`${table}: ${e.message}`);
        }
      }
      // 2. Supprimer de auth.users (étape finale — irréversible)
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (authErr: any) {
        errors.push(`auth.users: ${authErr.message}`);
      }
      return new Response(
        JSON.stringify({ success: true, errors: errors.length > 0 ? errors : undefined }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 13. SANCTION USER (Deduct XP, Deduct Coins, Warning)
    if (action === 'sanction_user') {
      const { userId, type, amount, reason } = body;
      const { data: profile } = await supabaseAdmin.from('profiles').select('xp, level_coins, stats').eq('id', userId).maybeSingle();
      if (profile) {
        let updates: any = {};
        if (type === 'deduct_xp') updates.xp = Math.max(0, (profile.xp || 0) - amount);
        else if (type === 'deduct_coins') updates.level_coins = Math.max(0, (profile.level_coins || 0) - amount);
        
        const updatedStats = profile.stats || {};
        const notifications = updatedStats.notifications || [];
        const newNotification = {
          id: `notif_${Date.now()}`,
          title: "⚠️ AVERTISSEMENT / SANCTION ADMIN",
          message: `Modération : ${reason || type}`,
          timestamp: new Date().toISOString(),
          read: false
        };
        updatedStats.notifications = [newNotification, ...notifications];
        updates.stats = updatedStats;

        await supabaseAdmin.from('profiles').upsert({ id: userId, ...updates }, { onConflict: 'id' });
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 14. RESET USER CONTENT & POINTS
    if (action === 'reset_user_content') {
      const { userId } = body;
      if (userId) {
        await supabaseAdmin.from('user_comments').delete().eq('user_id', userId);
        await supabaseAdmin.from('profiles').update({ xp: 0, level_coins: 0 }).eq('id', userId);
      }
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 15. (get_users dupliqué supprimé — voir handler 8 ci-dessus)

    // 16. LOG ADMIN ACTION (bypass RLS for admin_logs)
    if (action === 'log_admin_action') {
      const { adminId, adminName, adminAction, details, targetUserId } = body;
      await supabaseAdmin.from('admin_logs').insert({
        admin_id: adminId || 'admin',
        admin_name: adminName || 'Admin Levelmak',
        action: adminAction,
        details,
        target_user_id: targetUserId || null,
        timestamp: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 17. GRANT SUBSCRIPTION BONUS (authoritative server-side update, bypasses RLS)
    if (action === 'grant_subscription_bonus') {
      const { targetUserId, bonusDays, tier, reason } = body;
      if (!targetUserId) {
        return new Response(
          JSON.stringify({ error: 'targetUserId requis' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const daysToAdd = Number(bonusDays) || 30;
      const targetTier = tier || 'mensuel';

      // Check current profile expiration to allow smart rollover
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_premium, premium_until, stats')
        .eq('id', targetUserId)
        .maybeSingle();

      const now = Date.now();
      const currentExpiry = profile?.premium_until ? new Date(profile.premium_until).getTime() : 0;
      const baseTime = (profile?.is_premium && currentExpiry > now) ? currentExpiry : now;
      const newExpiryDate = new Date(baseTime + daysToAdd * 86400000);
      const newExpiryIso = newExpiryDate.toISOString();

      const updatedStats = profile?.stats || {};
      updatedStats.subscriptionTier = targetTier;
      updatedStats.subscription_tier = targetTier;

      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: true,
          premium_until: newExpiryIso,
          stats: updatedStats
        })
        .eq('id', targetUserId);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          newExpiry: newExpiryIso,
          message: 'Bonus attribué avec succès.'
        }),
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
