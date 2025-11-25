const container = document.getElementById('reportContent');
const titleEl = document.getElementById('reportTitle');
const metaEl = document.getElementById('reportMeta');
const downloadPdfBtn = document.getElementById('downloadPdf');

let cachedPayload = null;

function createCard(title, icon, body) {
  const section = document.createElement('section');
  section.className = 'card report-card';
  const heading = document.createElement('h2');
  heading.className = 'section-title';
  heading.innerHTML = `${icon || '✨'} <span>${title}</span>`;
  section.appendChild(heading);
  section.appendChild(body);
  return section;
}

function list(items) {
  const ul = document.createElement('ul');
  ul.className = 'list';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  return ul;
}

function paragraphs(text, className = 'synopsis') {
  if (!text) return null;
  const wrapper = document.createElement('div');
  wrapper.className = className;
  text
    .split(/\n+/)
    .filter(Boolean)
    .forEach((chunk) => {
      const p = document.createElement('p');
      p.textContent = chunk;
      wrapper.appendChild(p);
    });
  return wrapper;
}

function renderParticipants(participants = []) {
  const grid = document.createElement('div');
  grid.className = 'report-grid';
  participants.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'report-card';
    const name = document.createElement('h3');
    name.className = 'section-title';
    name.innerHTML = `🧑‍🚀 <span>${p.name || 'Participant'}</span>`;
    card.appendChild(name);

    if (p.archetype || p.role) {
      const pill = document.createElement('div');
      pill.className = 'pill-heading';
      pill.textContent = p.archetype || p.role;
      card.appendChild(pill);
    }

    if (p.summary) {
      const summary = document.createElement('p');
      summary.textContent = p.summary;
      card.appendChild(summary);
    }

    const synopsis = paragraphs(p.synopsis);
    if (synopsis) card.appendChild(synopsis);

    if (p.strengths?.length) {
      const strengthsHeader = document.createElement('h4');
      strengthsHeader.textContent = 'Strengths';
      card.appendChild(strengthsHeader);
      card.appendChild(list(p.strengths));
    }

    if (p.growth?.length) {
      const growthHeader = document.createElement('h4');
      growthHeader.textContent = 'Growth edges';
      card.appendChild(growthHeader);
      card.appendChild(list(p.growth));
    }

    grid.appendChild(card);
  });
  return grid;
}

function renderLinks() {
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = '<strong>Further reading:</strong>';

  const aboutLink = document.createElement('a');
  aboutLink.href = '/about.html';
  aboutLink.textContent = 'About this project';
  row.appendChild(aboutLink);

  return row;
}

function renderReport(data) {
  if (!data) return;
  container.innerHTML = '';
  titleEl.textContent = data.title || 'Values Alignment Report';

  if (data.meta) {
    metaEl.innerHTML = '';
    const labelMap = {
      relationshipType: 'Relationship Type',
      quizLength: 'Quiz Length',
      mode: 'Mode',
    };

    ['relationshipType', 'quizLength', 'mode'].forEach((key) => {
      if (data.meta[key]) {
        const pill = document.createElement('span');
        pill.className = 'pill';
        const label = labelMap[key] || key;
        const value = String(data.meta[key]);
        pill.textContent = `${label}: ${value.charAt(0).toUpperCase()}${value.slice(1)}`;
        metaEl.appendChild(pill);
      }
    });
  }

  if (data.intro) {
    const body = document.createElement('p');
    body.textContent = data.intro;
    container.appendChild(createCard('Overview', '📜', body));
  }

  if (data.participants?.length) {
    const body = renderParticipants(data.participants);
    container.appendChild(createCard('Individual Spotlights', '🌟', body));
  }

  if (data.compatibility) {
    const body = document.createElement('div');
    const pairedSynopsis = paragraphs(data.compatibility.pairedSynopsis);
    if (pairedSynopsis) body.appendChild(pairedSynopsis);
    if (data.compatibility.summary) {
      const p = document.createElement('p');
      p.textContent = data.compatibility.summary;
      body.appendChild(p);
    }
    if (data.compatibility.harmony?.length) {
      const h = document.createElement('h4');
      h.textContent = 'Harmony points';
      body.appendChild(h);
      body.appendChild(list(data.compatibility.harmony));
    }
    if (data.compatibility.tension?.length) {
      const h = document.createElement('h4');
      h.textContent = 'Tension points';
      body.appendChild(h);
      body.appendChild(list(data.compatibility.tension));
    }
    container.appendChild(createCard('Alignment & Contrast', '🧭', body));
  }

  if (data.recommendations?.length) {
    const body = list(data.recommendations);
    container.appendChild(createCard('Recommendations', '🚀', body));
  }

  if (data.inspiration?.length) {
    const body = document.createElement('div');
    data.inspiration.forEach((quote) => {
      const p = document.createElement('p');
      p.className = 'quote';
      p.textContent = `“${quote}”`;
      body.appendChild(p);
    });
    container.appendChild(createCard('Inspirations', '💫', body));
  }

  const linksRow = renderLinks();
  if (linksRow) {
    const body = document.createElement('div');
    body.appendChild(linksRow);
    container.appendChild(createCard('Further reading', '🔗', body));
  }
}

function loadReport() {
  const stored = sessionStorage.getItem('valuesReport');
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
    cachedPayload = parsed.payload || null;
    const report = parsed.report || null;
    if (report) {
      report.meta = report.meta || parsed.payload;
      renderReport(report);
    }
  } catch (error) {
    console.error('Unable to load report', error);
  }
}

loadReport();

function writeTableHeader(doc, startY) {
  doc.setFontSize(10);
  doc.text('No.', 14, startY);
  doc.text('Value', 26, startY);
  doc.text('Rating', 150, startY);
  return startY + 6;
}

function ensureSpace(doc, currentY, heightNeeded) {
  if (currentY + heightNeeded <= 280) return currentY;
  doc.addPage();
  return 20;
}

async function downloadPdf() {
  if (!cachedPayload?.participants?.length) {
    alert('No report data available. Please generate a report first.');
    return;
  }

  const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
  const doc = new jsPDF();
  let y = 14;

  doc.setFontSize(16);
  doc.text('Values Report', 14, y);
  y += 8;

  doc.setFontSize(10);
  if (cachedPayload.mode) {
    doc.text(`Mode: ${cachedPayload.mode}`, 14, y);
    y += 6;
  }
  if (cachedPayload.relationshipType) {
    doc.text(`Relationship: ${cachedPayload.relationshipType}`, 14, y);
    y += 6;
  }
  if (cachedPayload.quizLength) {
    doc.text(`Quiz length: ${cachedPayload.quizLength}`, 14, y);
    y += 8;
  }

  cachedPayload.participants.forEach((participant, index) => {
    if (index > 0) {
      doc.addPage();
      y = 14;
    }

    const profile = participant.profile || {};
    doc.setFontSize(14);
    doc.text(profile.name || `Participant ${index + 1}`, 14, y);
    y += 8;

    const metaBits = [];
    if (profile.age) metaBits.push(`Age: ${profile.age}`);
    if (profile.gender) metaBits.push(`Gender: ${profile.gender}`);
    if (metaBits.length) {
      doc.setFontSize(10);
      doc.text(metaBits.join(' | '), 14, y);
      y += 6;
    }

    y = writeTableHeader(doc, y);

    (participant.responses || []).forEach((response) => {
      const idLabel = String(response.id || response.value || '');
      const valueLines = doc.splitTextToSize(response.value || 'Value', 110);
      const ratingLines = doc.splitTextToSize(response.answer || 'Unrated', 40);
      const rowHeight = Math.max(valueLines.length, ratingLines.length) * 6;

      y = ensureSpace(doc, y, rowHeight + 6);
      if (y === 20) {
        y = writeTableHeader(doc, y);
      }

      doc.text(idLabel, 14, y);
      valueLines.forEach((line, lineIdx) => {
        doc.text(line, 26, y + lineIdx * 6);
      });
      ratingLines.forEach((line, lineIdx) => {
        doc.text(line, 150, y + lineIdx * 6);
      });

      y += rowHeight;
    });
  });

  doc.save('values-report.pdf');
}

if (downloadPdfBtn) {
  downloadPdfBtn.addEventListener('click', downloadPdf);
}
