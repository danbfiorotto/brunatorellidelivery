import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMITS = {
  'api': { requests: 30, window: 60 }, // 30 requests per minute
  'login': { requests: 5, window: 60 }, // 5 requests per minute
  'default': { requests: 30, window: 60 }
};

interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get identifier (user ID or IP)
    const authHeader = req.headers.get('Authorization');
    let identifier = 'anonymous';
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (user) {
          identifier = user.id;
        }
      } catch {
        // If token is invalid, use IP
        identifier = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
      }
    } else {
      identifier = req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown';
    }

    // Get endpoint type from request
    const body = await req.json().catch(() => ({}));
    const endpointType = body.endpoint_type || 'api';
    const config: RateLimitConfig = RATE_LIMITS[endpointType as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - config.window;
    const key = `rate_limit:${identifier}:${endpointType}`;

    // Get current count from database (using a temporary table or cache)
    // For simplicity, we'll use a table to store rate limit data
    const { data: existing } = await supabaseClient
      .from('rate_limit_cache')
      .select('count, reset_at')
      .eq('key', key)
      .single();

    let count = 0;
    let resetAt = now + config.window;

    if (existing && existing.reset_at > now) {
      // Still within the window
      count = existing.count || 0;
      resetAt = existing.reset_at;
    } else {
      // Window expired or doesn't exist, reset
      count = 0;
      resetAt = now + config.window;
    }

    // Check if limit exceeded
    if (count >= config.requests) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${config.requests} per ${config.window} seconds.`,
          retry_after: resetAt - now
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetAt.toString(),
            'Retry-After': (resetAt - now).toString(),
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Increment count
    count += 1;

    // Update or insert rate limit record
    await supabaseClient
      .from('rate_limit_cache')
      .upsert({
        key,
        count,
        reset_at: resetAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    // Return success
    return new Response(
      JSON.stringify({
        allowed: true,
        remaining: Math.max(0, config.requests - count),
        reset_at: resetAt
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.requests.toString(),
          'X-RateLimit-Remaining': (config.requests - count).toString(),
          'X-RateLimit-Reset': resetAt.toString(),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow the request (fail open)
    return new Response(
      JSON.stringify({
        allowed: true,
        error: 'Rate limit check failed, allowing request'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});









