const fs = require('fs');
const path = require('path');

function loadDotenv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      const value = rest.join('=');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
}

loadDotenv();

// Support multiple common environment variable names to reduce setup mistakes.
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.V_KEY;
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parsePayload(body) {
  try {
    return JSON.parse(body || '{}');
  } catch (error) {
    const parseError = new Error('Invalid JSON payload.');
    parseError.code = 'bad_request';
    throw parseError;
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { code: 'bad_request', message: 'Request body must be a JSON object.' };
  }
  const { participants, mode } = payload;

  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return { code: 'bad_request', message: 'At least one participant is required.' };
  }
  if (mode === 'paired' && participants.length < 2) {
    return { code: 'bad_request', message: 'Paired reports need two participant submissions.' };
  }
  const invalidParticipant = participants.find(
    (p) => !p?.profile?.name || !Array.isArray(p.responses)
  );
  if (invalidParticipant) {
    return { code: 'bad_request', message: 'Each participant requires a name and responses list.' };
  }
  return null;
}

function buildPrompt({ participants, mode, relationshipType }) {
  const solo = mode !== 'paired';
  const label = relationshipType || 'partner';
  const intro = solo
    ? "Here is a single person's values profile. Create an encouraging, strengths-based character review."
    : `Here are two people and their stated relationship (${label}). Create a character review for each, then provide a comparison section that highlights harmony and tension points.`;

  const summaries = participants
    .map((p, idx) => {
      const header = solo ? 'Person' : `Person ${idx + 1}`;
      const meta = [`Name: ${p.profile.name}`];
      if (p.profile.age) meta.push(`Age: ${p.profile.age}`);
      if (p.profile.gender) meta.push(`Gender: ${p.profile.gender}`);
      if (!solo && idx === 1 && label) meta.push(`Relationship: ${label}`);
      const answered = p.responses
        .map((r) => `${r.value}: ${r.answer}`)
        .join('; ');
      return `${header}\n${meta.join(' | ')}\nValues: ${answered}`;
    })
    .join('\n\n');

  return `${intro}\n\nUse this outline:\n- Introduction\n- Strengths & Weaknesses\n- Romantic Relationships\n- Friendships\n- Conclusion\n\nProfiles:\n${summaries}`;
}

async function generateReport({ participants, mode, relationshipType }) {
  const prompt = buildPrompt({ participants, mode, relationshipType });

  if (!GEMINI_API_KEY) {
    return {
      text:
        'Gemini key not configured (set GEMINI_API_KEY, GOOGLE_API_KEY, or V_KEY).' +
        ` Here is a preview of what would be sent:\n${prompt}`,
      usedGemini: false,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: { temperature: 0.7 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Gemini returned no content. Please try again.';

    return { text, usedGemini: true };
  } catch (error) {
    clearTimeout(timeout);
    return {
      text: `Unable to reach Gemini: ${error.message}. Prompt preview:\n${prompt}`,
      usedGemini: false,
    };
  }
}

async function respondWithReport(res, payload) {
  const validationError = validatePayload(payload);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const report = await generateReport(payload);
  sendJson(res, 200, report);
}

function handleReportRequest(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    try {
      const payload = parsePayload(body);
      await respondWithReport(res, payload);
    } catch (error) {
      console.error('Report generation error:', error);
      const status = error.code === 'bad_request' ? 400 : 500;
      sendJson(res, status, { error: { code: error.code || 'server_error', message: error.message } });
    }
  });
}

async function handleParsedReportRequest(req, res) {
  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      payload = parsePayload(payload);
    }
    if (payload === undefined || payload === null) {
      payload = {};
    }
    await respondWithReport(res, payload);
  } catch (error) {
    console.error('Report generation error:', error);
    const status = error.code === 'bad_request' ? 400 : 500;
    sendJson(res, status, { error: { code: error.code || 'server_error', message: error.message } });
  }
}

module.exports = {
  buildPrompt,
  generateReport,
  handleReportRequest,
  handleParsedReportRequest,
  sendJson,
};
