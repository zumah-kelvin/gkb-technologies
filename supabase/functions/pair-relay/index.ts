import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://gkb-company-ltd.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonResponse(body: Record<string, unknown>, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...Object.fromEntries(new Headers(headers)), 'Content-Type': 'application/json' }
  });
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async request => {
  const origin = request.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, headers);
  }
  if (!origin || !allowedOrigins.has(origin)) {
    return jsonResponse({ error: 'This website origin is not allowed to pair devices.' }, 403, headers);
  }

  const authorization = request.headers.get('Authorization');
  const bearerMatch = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!bearerMatch) {
    return jsonResponse({ error: 'Sign in with your Supabase account before pairing an ESP32.' }, 401, headers);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400, headers);
  }
  const pairingKey = typeof body === 'object' && body !== null && 'pairingKey' in body
    ? body.pairingKey
    : null;
  if (typeof pairingKey !== 'string' || pairingKey.trim().length < 32 || pairingKey.length > 256) {
    return jsonResponse({ error: 'Invalid ESP32 pairing key.' }, 400, headers);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Pairing service is not configured by the administrator.' }, 500, headers);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(bearerMatch[1]);
  if (authError || !user) {
    return jsonResponse({ error: 'Supabase sign-in is expired or invalid. Sign in again and retry.' }, 401, headers);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: pairing, error: lookupError } = await adminClient
    .from('relay_pairings')
    .select('device_id, pairing_key_hash, paired_at')
    .eq('device_id', 'relay_01')
    .maybeSingle();
  if (lookupError) {
    return jsonResponse({ error: `Could not look up the relay pairing record: ${lookupError.message}` }, 500, headers);
  }
  if (!pairing) {
    return jsonResponse({ error: 'The relay_01 pairing record is not provisioned yet.' }, 404, headers);
  }
  if (pairing.paired_at || typeof pairing.pairing_key_hash !== 'string' || pairing.pairing_key_hash.length !== 64) {
    return jsonResponse({ error: 'This device pairing key is invalid, expired, or already used.' }, 409, headers);
  }

  const suppliedHash = await sha256Hex(pairingKey.trim());
  if (!constantTimeEqual(suppliedHash, pairing.pairing_key_hash.toLowerCase())) {
    return jsonResponse({ error: 'That pairing key does not match this ESP32.' }, 403, headers);
  }

  const { data: pairedRelay, error: pairingError } = await adminClient.rpc('claim_relay_pairing', {
    p_pairing_key_hash: pairing.pairing_key_hash,
    p_owner_id: user.id
  });
  if (pairingError) {
    return jsonResponse({ error: `Could not complete ESP32 pairing: ${pairingError.message}` }, 500, headers);
  }
  if (!Array.isArray(pairedRelay) || pairedRelay.length !== 1 || pairedRelay[0].device_id !== 'relay_01') {
    return jsonResponse({ error: 'The pairing key was just used or rotated. Generate a new key and retry.' }, 409, headers);
  }

  return jsonResponse({
    device_id: pairedRelay[0].device_id,
    paired_at: pairedRelay[0].paired_at,
    message: 'ESP32 paired to the signed-in Supabase account. The pairing key can no longer be reused.'
  }, 200, headers);
});
