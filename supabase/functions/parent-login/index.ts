import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const babyName = typeof body?.babyName === 'string' ? body.babyName.trim() : '';
    const password = typeof body?.password === 'string' ? body.password.trim() : '';

    if (!babyName || !password || babyName.length > 200 || password.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter both Baby Name and Password.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: babies, error } = await admin
      .from('babies')
      .select('id, baby_name, bed_number, parent_contact, status, login_password')
      .ilike('baby_name', babyName);

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verification failed. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!babies || babies.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No baby found with this name.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidates = babies.filter((b: any) => typeof b.login_password === 'string' && b.login_password.length > 0);
    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Parent portal access is not configured for this baby.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ids = candidates.map((b: any) => b.id);
    const { data: matches, error: verifyError } = await admin.rpc('verify_baby_password', {
      _baby_ids: ids,
      _password: password,
    });

    if (verifyError || !matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password does not match our records.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const matchedId = matches[0].id;
    const baby = candidates.find((b: any) => b.id === matchedId);
    if (!baby) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password does not match our records.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        parent: {
          id: baby.id,
          babyId: baby.id,
          babyName: baby.baby_name,
          bedNumber: baby.bed_number,
          parentContact: baby.parent_contact,
          status: baby.status || 'normal',
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
