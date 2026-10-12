/**
 * Adjust & Void Log — receipt photo reader.
 *
 * Receives a receipt photo from the log page, sends it to the Claude API,
 * and returns the fields it read as JSON. The API key never leaves this script.
 *
 * Script Properties (Project Settings > Script Properties):
 *   ANTHROPIC_API_KEY  your key from console.anthropic.com
 *   MANAGER_PASSCODE   the same manager passcode the team uses to open the log
 *   ADMIN_PASSCODE     the same admin passcode
 *
 * Deploy > New deployment > Web app: Execute as "Me", Who has access "Anyone".
 */

const MODEL = 'claude-sonnet-5-5';

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const allowed = [props.getProperty('MANAGER_PASSCODE'), props.getProperty('ADMIN_PASSCODE')].filter(Boolean);
    if (!req.key || allowed.indexOf(String(req.key)) === -1) return reply({ error: 'unauthorized' });
    if (!req.image || !req.prompt) return reply({ error: 'missing_photo' });

    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': props.getProperty('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: req.image } },
            { type: 'text', text: req.prompt }
          ]
        }]
      }),
      muteHttpExceptions: true
    });

    const body = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200) {
      return reply({ error: (body.error && body.error.message) || ('api_error_' + res.getResponseCode()) });
    }
    const text = (body.content || []).map(function (c) { return c.text || ''; }).join('');
    const match = text.match(/\{[\s\S]*\}/);
    return reply({ result: match ? JSON.parse(match[0]) : null });
  } catch (err) {
    return reply({ error: String(err) });
  }
}

// Lets you confirm the deployment URL works by opening it in a browser.
function doGet() {
  return reply({ ok: true, service: 'Adjust & Void Log photo reader' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
