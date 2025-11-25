require('dotenv').config();
const http = require('http');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.V_KEY;
const publicDir = path.join(__dirname, 'public');

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(publicDir, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(publicDir, 'index.html');
    }
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const type =
        ext === '.html'
          ? 'text/html'
          : ext === '.css'
          ? 'text/css'
          : ext === '.js'
          ? 'application/javascript'
          : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(content);
    });
  });
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
      text: 'Gemini key not configured. Here is a preview of what would be sent:\n' + prompt,
      usedGemini: false,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
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
      }
    );

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

function handleApi(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const { participants, mode, relationshipType } = payload;
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return sendJson(res, 400, { error: { code: 'bad_request', message: 'At least one participant is required.' } });
      }
      if (mode === 'paired' && participants.length < 2) {
        return sendJson(res, 400, { error: { code: 'bad_request', message: 'Paired reports need two participant submissions.' } });
      }
      const invalidParticipant = participants.find(
        (p) => !p?.profile?.name || !Array.isArray(p.responses)
      );
      if (invalidParticipant) {
        return sendJson(res, 400, {
          error: { code: 'bad_request', message: 'Each participant requires a name and responses list.' },
        });
      }
      const report = await generateReport({ participants, mode, relationshipType });
      sendJson(res, 200, report);
    } catch (error) {
      console.error('Report generation error:', error);
      sendJson(res, 500, { error: { code: 'server_error', message: error.message } });
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/api/report')) {
    handleApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Values app listening on http://localhost:${port}`);
});
