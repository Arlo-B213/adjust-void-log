/**
 * Adjust & Void Log — receipt photo reader (Cloudflare Worker).
 *
 * Receives a receipt photo from the log app, sends it to the Claude API,
 * and returns the fields it read as JSON. The API key never leaves Cloudflare.
 *
 * Settings > Variables and Secrets (add each as type "Secret"):
 *   ANTHROPIC_API_KEY  your key from console.anthropic.com (starts with sk-ant-api)
 *   MANAGER_PASSCODE   the manager passcode the team uses to open the log
 *   ADMIN_PASSCODE     the admin passcode
 *   Add one more *_PASSCODE secret for each other restaurant's manager passcode,
 *   e.g. RESTAURANT_PASSCODE. Any secret whose name ends in _PASSCODE is accepted.
 *
 * Opening the worker's URL in a browser shows {"ok":true,...} when it's running.
 */

const MODEL = 'claude-haiku-5-5'; // switch to 'claude-sonnet-5-5' if handwriting is misread

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

function reply(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (request.method === 'GET') {
      return reply({
        ok: true,
        service: 'Adjust & Void Log photo reader',
        apiKeySet: Boolean(env.ANTHROPIC_API_KEY),
        passcodesSet: Boolean(env.MANAGER_PASSCODE && env.ADMIN_PASSCODE),
        passcodeCount: Object.keys(env).filter(k => k.endsWith('_PASSCODE')).length
      });
    }

    if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);

    try {
      const req = JSON.parse(await request.text());
      const allowed = Object.keys(env).filter(k => k.endsWith('_PASSCODE')).map(k => String(env[k])).filter(Boolean);
      if (!req.key || !allowed.includes(String(req.key))) return reply({ error: 'unauthorized' });
      if (!req.image || !req.prompt) return reply({ error: 'missing_photo' });
      if (!env.ANTHROPIC_API_KEY) return reply({ error: 'ANTHROPIC_API_KEY is not set in the worker settings' });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: req.image } },
              { type: 'text', text: req.prompt }
            ]
          }]
        })
      });

      const body = await res.json();
      if (!res.ok) return reply({ error: (body.error && body.error.message) || ('api_error_' + res.status) });

      const text = (body.content || []).map(c => c.text || '').join('');
      const match = text.match(/\{[\s\S]*\}/);
      return reply({ result: match ? JSON.parse(match[0]) : null });
    } catch (err) {
      return reply({ error: String(err && err.message || err) });
    }
  }
};
