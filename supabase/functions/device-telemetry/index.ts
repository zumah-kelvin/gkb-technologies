import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://gkb-company-ltd.netlify.app',
  'https://gkb-iot.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-device-key, x-device-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json'
    }
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

/**
 * Resolves the server-side administrative key.
 * Follows modern Supabase configuration: prefers SUPABASE_SECRET_KEYS (JSON dictionary of named keys)
 * or SUPABASE_SECRET_KEY, falling back to legacy SUPABASE_SERVICE_ROLE_KEY if needed.
 */
function resolveServerSecretKey(): string | null {
  // 1. Modern named secret keys dictionary (JSON)
  const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeysRaw) {
    try {
      const parsed = JSON.parse(secretKeysRaw);
      if (typeof parsed === 'object' && parsed !== null) {
        const key = parsed.default ?? Object.values(parsed)[0];
        if (typeof key === 'string' && key.trim()) {
          return key.trim();
        }
      }
    } catch {
      if (secretKeysRaw.trim()) {
        return secretKeysRaw.trim();
      }
    }
  }

  // 2. Modern single secret key
  const singleKey = Deno.env.get('SUPABASE_SECRET_KEY');
  if (singleKey?.trim()) {
    return singleKey.trim();
  }

  // 3. Fallback to legacy service role key
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyKey?.trim()) {
    return legacyKey.trim();
  }

  return null;
}

Deno.serve(async request => {
  const origin = request.headers.get('Origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  // Strictly allow POST only
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405, origin);
  }

  // 1. Parse JSON body
  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (typeof raw === 'object' && raw !== null) {
      body = raw as Record<string, unknown>;
    }
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400, origin);
  }

  // 2. Extract device identification & secret token (from headers or body)
  const deviceKey = String(
    request.headers.get('x-device-key') || body.device_key || ''
  ).trim();

  let deviceSecret = String(
    request.headers.get('x-device-secret') || body.device_secret || ''
  ).trim();

  if (!deviceSecret) {
    const authHeader = request.headers.get('Authorization');
    const bearerMatch = authHeader?.match(/^Bearer ([^\s]+)$/);
    if (bearerMatch) {
      deviceSecret = bearerMatch[1].trim();
    }
  }

  // Every request must explicitly authenticate
  if (!deviceKey || !deviceSecret) {
    return jsonResponse(
      { error: 'Authentication required. Device key and secret must be supplied.' },
      401,
      origin
    );
  }

  if (deviceKey.length < 3 || deviceKey.length > 50) {
    return jsonResponse({ error: 'Invalid device_key format.' }, 400, origin);
  }

  // 3. Validate & sanitize telemetry payload fields
  const rawStatus = typeof body.status === 'string' ? body.status.trim() : '';
  const rawAlert = typeof body.last_alert === 'string' ? body.last_alert.trim() : '';

  if (!rawStatus) {
    return jsonResponse({ error: 'Telemetry field "status" is required.' }, 400, origin);
  }

  const sanitizedStatus = rawStatus.slice(0, 100);
  const sanitizedLastAlert = rawAlert.slice(0, 300);

  // 4. Resolve server-side key
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = resolveServerSecretKey();

  if (!supabaseUrl || !serverKey) {
    return jsonResponse({ error: 'Server key configuration missing.' }, 500, origin);
  }

  const adminClient = createClient(supabaseUrl, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 5. Look up credential record to verify active status, secret hash, and bound user_id
  const { data: cred, error: credError } = await adminClient
    .from('gkb_device_credentials')
    .select('device_key, user_id, secret_hash, is_active')
    .eq('device_key', deviceKey)
    .maybeSingle();

  if (credError) {
    return jsonResponse({ error: 'Database credential verification failed.' }, 500, origin);
  }

  if (!cred || !cred.is_active || !cred.user_id) {
    return jsonResponse({ error: 'Device not authorized or inactive.' }, 401, origin);
  }

  // Constant-time hash check
  const incomingHash = await sha256Hex(deviceSecret);
  const isMatch = constantTimeEqual(incomingHash.toLowerCase(), cred.secret_hash.toLowerCase());

  if (!isMatch) {
    return jsonResponse({ error: 'Device authentication failed: invalid secret.' }, 401, origin);
  }

  // 6. Update last_seen_at timestamp on the credential record
  await adminClient
    .from('gkb_device_credentials')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('device_key', deviceKey);

  // 7. Update ONLY allowed telemetry fields (status, last_alert) bound to the EXACT (user_id, device_key) row
  const updatePayload: Record<string, string> = {
    status: sanitizedStatus
  };
  if (sanitizedLastAlert) {
    updatePayload.last_alert = sanitizedLastAlert;
  }

  const { data: updatedRows, error: updateError } = await adminClient
    .from('gkb_user_devices')
    .update(updatePayload)
    .eq('device_key', cred.device_key)
    .eq('user_id', cred.user_id)
    .select('device_key, user_id, status, last_alert');

  if (updateError) {
    return jsonResponse({ error: `Telemetry update failed: ${updateError.message}` }, 500, origin);
  }

  if (!updatedRows || updatedRows.length === 0) {
    return jsonResponse(
      { error: 'Device row not found for the bound account in gkb_user_devices.' },
      404,
      origin
    );
  }

  return jsonResponse(
    {
      success: true,
      device_key: deviceKey,
      updated_rows: updatedRows.length,
      status: sanitizedStatus,
      last_alert: sanitizedLastAlert,
      timestamp: new Date().toISOString()
    },
    200,
    origin
  );
});
