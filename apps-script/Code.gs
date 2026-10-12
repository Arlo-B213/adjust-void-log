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

const MODEL = 'claude-haiku-5-5';  // switch to 'claude-sonnet-5-5' if handwriting is misread

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

/**
 * Run this once from the editor (select testSetup, then click Run).
 * It asks Google for the permissions the reader needs and checks your settings.
 * Open View > Logs (or Execution log) to see the result.
 */
function testSetup() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('ANTHROPIC_API_KEY') || '';
  Logger.log('API key present: ' + (key ? 'yes, starts with ' + key.slice(0, 10) : 'NO - add ANTHROPIC_API_KEY'));
  Logger.log('Manager passcode set: ' + (props.getProperty('MANAGER_PASSCODE') ? 'yes' : 'NO'));
  Logger.log('Admin passcode set: ' + (props.getProperty('ADMIN_PASSCODE') ? 'yes' : 'NO'));
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: MODEL, max_tokens: 20, messages: [{ role: 'user', content: 'Reply with the word ready.' }] }),
    muteHttpExceptions: true
  });
  Logger.log('Claude answered with status ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
  Logger.log(res.getResponseCode() === 200 ? 'ALL GOOD - now deploy a new version.' : 'Fix the problem above, then run testSetup again.');
}

// Lets you confirm the deployment URL works by opening it in a browser.
function doGet() {
  return reply({ ok: true, service: 'Adjust & Void Log photo reader' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
