const container = document.getElementById('reportContent');
const titleEl = document.getElementById('reportTitle');
const metaEl = document.getElementById('reportMeta');

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

function renderLinks(links = []) {
  if (!links.length) return null;
  const row = document.createElement('div');
  row.className = 'link-row';
  row.innerHTML = '<strong>Sources:</strong>';
  links.forEach((link) => {
    const a = document.createElement('a');
    a.href = link.url;
    a.textContent = link.label || link.url;
    a.target = '_blank';
    row.appendChild(a);
  });
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

  if (data.links?.length) {
    const row = renderLinks(data.links);
    if (row) {
      const body = document.createElement('div');
      body.appendChild(row);
      container.appendChild(createCard('Further reading', '🔗', body));
    }
  }
}

function loadReport() {
  const stored = sessionStorage.getItem('valuesReport');
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored);
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
