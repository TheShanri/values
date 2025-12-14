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
const BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseReport(text) {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : cleaned;
  try {
    return JSON.parse(candidate);
  } catch (error) {
    return null;
  }
}

function buildLocalFallback(payload) {
  const primary = payload.participants?.[0]?.profile?.name || 'You';
  const secondary = payload.participants?.[1]?.profile?.name;
  const solo = payload.mode !== 'paired';

  return {
    title: solo ? `${primary}'s Values Report` : `${primary} + ${secondary} Values Report`,
    intro: solo
      ? `${primary} is mapping what matters most. Here's a quick constellation of themes based on the quiz responses.`
      : `${primary} and ${secondary} share a lot of heart. Here's where their values orbit together and where they diverge.`,
    meta: {
      mode: payload.mode,
      relationshipType: payload.relationshipType,
      quizLength: payload.quizLength || payload.length,
    },
    participants: payload.participants?.map((p) => ({
      name: p.profile?.name,
      archetype: 'Explorer of Potential',
      synopsis:
        `${p.profile?.name || 'They'} tends to move through the world with a blend of curiosity and care, eager to understand how people tick and how systems fit together. They show up with a gentle confidence, using conversation to create psychological safety and then nudging ideas forward once the room feels aligned.\n\nFriends often see them as the person who notices subtle shifts in energy and invites clearer dialogue. They approach commitments with integrity, and when conflict appears, they try to translate competing needs into a shared plan instead of taking sides.`,
      summary:
        'An adaptive, curious spirit who likes to test ideas in the real world and grow through meaningful connections.',
      strengths: ['Openness to growth', 'Ability to hold nuance', 'Collaborative problem solving'],
      growth: ['Name and honor non-negotiables early', 'Ask for support before burnout hits'],
    })),
    compatibility: solo
      ? null
      : {
          pairedSynopsis:
            'Together, they tend to create an atmosphere of imaginative possibility and emotional steadiness. When they collaborate, one spotlights potential futures while the other grounds the conversation in present realities, giving their partnership a rhythm of dreaming and doing.\n\nTheir shared respect for autonomy keeps things spacious, yet they both light up around traditions that make the relationship feel intentional—like weekly walks, shared playlists, or celebrating small wins.',
          summary: 'Their value maps overlap around curiosity and long-term growth, with some frictions around pacing.',
          harmony: ['Shared hunger for learning', 'Respect for autonomy', 'Desire for emotionally honest conversations'],
          tension: ['Different speeds for decisions', 'One may crave more structure than the other'],
        },
    recommendations: [
      'Schedule a monthly “values check-in” to celebrate alignment and adjust expectations.',
      'Name two rituals that honor both autonomy and togetherness.',
      'Translate disagreements into “value stories” rather than blame.',
    ],
    inspiration: [
      '“Alignment is less about sameness and more about honoring each other’s principles.”',
      '“Clarity is kindness: speak your values aloud.”',
    ],
    links: [
      { label: 'The Examined Existence', url: 'https://www.theexaminedexistence.com/' },
    ],
  };
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
  const emphasisNote =
    'CRITICAL INSTRUCTION: Do not use vague horoscope language. Every claim you make must be directly tied to a specific value the user selected. If you say they are "bold," you must cite that they rated "Boldness" as Critical. Avoid "Barnum statements" that could apply to anyone.';

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

  return `${intro}\n${emphasisNote}\n\nRespond ONLY with JSON (no markdown fences) using this schema:\n{\n  "title": "Values Alignment Report",\n  "intro": "1-3 sentence overview",\n  "meta": {"mode": "solo|paired", "relationshipType": "${label}", "quizLength": "quick|moderate|full"},\n  "participants": [\n    {"name": "Name", "archetype": "Title", "synopsis": "2-3 paragraphs that summarize who they are, how they show up, and their relational vibe", "summary": "1-2 sentence tagline", "strengths": ["..."], "growth": ["..."]}\n  ],\n  "compatibility": {"pairedSynopsis": "2-3 paragraphs on the shared dynamic", "summary": "paragraph", "harmony": ["..."], "tension": ["..."]},\n  "recommendations": ["..."],\n  "inspiration": ["short quotes"],\n  "links": [{"label": "Source", "url": "https://..."}]\n}\n\nProfiles:\n${summaries}`;
}

async function callGemini(model, prompt, signal) {
  const url = `${BASE_URL}/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generation_config: {
      temperature: 0.4,
      response_mime_type: 'application/json',
    },
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Model ${model} failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function generateReport({ participants, mode, relationshipType }) {
  const prompt = buildPrompt({ participants, mode, relationshipType });

  if (!GEMINI_API_KEY) {
    return { text: 'Gemini key missing.', usedGemini: false };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    let data;
    try {
      console.log(`Attempting with ${PRIMARY_MODEL}...`);
      data = await callGemini(PRIMARY_MODEL, prompt, controller.signal);
    } catch (primaryError) {
      console.warn(`${PRIMARY_MODEL} failed, switching to ${FALLBACK_MODEL}. Error:`, primaryError.message);
      data = await callGemini(FALLBACK_MODEL, prompt, controller.signal);
    }

    clearTimeout(timeout);

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Gemini returned no content.';

    return { text, usedGemini: true, report: parseReport(text) };

  } catch (error) {
    clearTimeout(timeout);
    return {
      text: `All models failed. Last error: ${error.message}`,
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
  if (!report.report) {
    sendJson(res, 500, {
      error: {
        code: 'ai_generation_failed',
        message: 'The oracle is silent. AI generation failed or returned invalid data. Please try again.',
        debug: report,
      },
    });
    return;
  }
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
