import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Не авторизован' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Не авторизован' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is admin
    const { data: roles, error: rolesErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId);
    if (rolesErr) throw rolesErr;
    const isAdmin = (roles || []).some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Только администратор может удалять пользователей' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const targetUserId: string | undefined = body?.user_id;
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Не указан user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetUserId === callerId) {
      return new Response(JSON.stringify({ error: 'Нельзя удалить собственный аккаунт' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure at least one other admin remains if target is admin
    const { data: targetRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId);
    const targetIsAdmin = (targetRoles || []).some((r: any) => r.role === 'admin');
    if (targetIsAdmin) {
      const { count } = await admin
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((count ?? 0) <= 1) {
        return new Response(JSON.stringify({ error: 'Нельзя удалить последнего администратора' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Delete cascades: profiles & user_roles reference auth.users via FK on most setups,
    // but to be safe, delete dependent rows first.
    await admin.from('user_roles').delete().eq('user_id', targetUserId);
    await admin.from('profiles').delete().eq('user_id', targetUserId);

    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) throw delErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Ошибка удаления пользователя' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
