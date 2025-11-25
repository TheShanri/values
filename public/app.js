import { valuesData } from './values.js';

const PAGE_SIZE = 10;
const answerOptions = ['Indifferent', 'Valued', 'Highly Valued', 'Critical'];

const dom = {
  startBtn: document.querySelector('#startBtn'),
  scrollToValues: document.querySelector('#scrollToValues'),
  bioForm: document.querySelector('#bioForm'),
  lengthChips: document.querySelector('#lengthChips'),
  modeChips: document.querySelector('#modeChips'),
  relationshipField: document.querySelector('#relationshipField'),
  relationship: document.querySelector('#relationship'),
  customRelationship: document.querySelector('#customRelationship'),
  customGender: document.querySelector('#customGender'),
  progressBar: document.querySelector('#progressBar'),
  progressCount: document.querySelector('#progressCount'),
  progressTotal: document.querySelector('#progressTotal'),
  tableContainer: document.querySelector('#tableContainer'),
  prevPage: document.querySelector('#prevPage'),
  nextPage: document.querySelector('#nextPage'),
  pageLabel: document.querySelector('#pageLabel'),
  savePage: document.querySelector('#savePage'),
  submitQuiz: document.querySelector('#submitQuiz'),
  participantBadge: document.querySelector('#participantBadge'),
  resultsCard: document.querySelector('#results'),
  jsonOutput: document.querySelector('#jsonOutput'),
  reportOutput: document.querySelector('#reportOutput'),
  reportStatus: document.querySelector('#reportStatus'),
  downloadJson: document.querySelector('#downloadJson'),
};

const state = {
  mode: 'solo',
  length: 'quick',
  values: [],
  currentPage: 1,
  answers: {},
  participants: [],
};

function subsetValues() {
  const sorted = [...valuesData].sort((a, b) => a.id - b.id);
  if (state.length === 'quick') return sorted.slice(0, 50);
  if (state.length === 'moderate') return sorted.slice(0, 125);
  return sorted;
}

function updateValues(preserveAnswers = false) {
  state.values = subsetValues();
  if (!preserveAnswers) {
    state.answers = {};
    state.currentPage = 1;
  }
  dom.progressTotal.textContent = state.values.length;
  renderTable();
  updateProgress();
}

function updateProgress() {
  const answered = Object.keys(state.answers).length;
  dom.progressCount.textContent = answered;
  const pct = Math.round((answered / state.values.length) * 100) || 0;
  dom.progressBar.style.width = `${pct}%`;
}

function toggleChip(group, value) {
  group.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('selected', chip.dataset.length === value || chip.dataset.mode === value);
  });
}

function renderTable() {
  const start = (state.currentPage - 1) * PAGE_SIZE;
  const pageValues = state.values.slice(start, start + PAGE_SIZE);
  dom.tableContainer.innerHTML = '';

  pageValues.forEach((value) => {
    const row = document.createElement('div');
    row.className = 'table__row';

    const left = document.createElement('div');
    left.innerHTML = `<div class="badge">${value.id}</div><p class="table__title">${value.name}</p><p class="table__desc">${value.description}</p>`;

    const controls = document.createElement('div');
    controls.className = 'table__controls';

    const defaults = document.createElement('div');
    defaults.className = 'hint';
    defaults.textContent = `Suggested: ${value.personalTake}`;
    controls.appendChild(defaults);

    const options = document.createElement('div');
    options.className = 'table__options';

    answerOptions.forEach((option) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = option;
      btn.className = 'ghost';
      btn.dataset.id = value.id;
      btn.dataset.answer = option;
      if (state.answers[value.id] === option || (!state.answers[value.id] && value.personalTake === option)) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', () => {
        state.answers[value.id] = option;
        renderTable();
        updateProgress();
      });
      options.appendChild(btn);
    });

    controls.appendChild(options);
    row.appendChild(left);
    row.appendChild(controls);
    dom.tableContainer.appendChild(row);
  });

  const totalPages = Math.ceil(state.values.length / PAGE_SIZE) || 1;
  dom.pageLabel.textContent = `Page ${state.currentPage} / ${totalPages}`;
  dom.prevPage.disabled = state.currentPage === 1;
  dom.nextPage.disabled = state.currentPage === totalPages;
}

function persistPage() {
  const data = {
    mode: state.mode,
    length: state.length,
    answers: state.answers,
    currentPage: state.currentPage,
  };
  localStorage.setItem('values-progress', JSON.stringify(data));
  alert('Progress saved locally for this browser.');
}

function loadPersisted() {
  const saved = localStorage.getItem('values-progress');
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    if (data.mode) state.mode = data.mode;
    if (data.length) state.length = data.length;
    if (data.answers) state.answers = data.answers;
    if (data.currentPage) state.currentPage = data.currentPage;
    toggleChip(dom.lengthChips, state.length);
    toggleChip(dom.modeChips, state.mode);
    dom.relationshipField.hidden = state.mode !== 'paired';
    updateValues(true);
  } catch (e) {
    console.warn('Unable to parse saved progress', e);
  }
}

function collectProfile(participantNumber) {
  const formData = new FormData(dom.bioForm);
  const name = formData.get('name')?.trim();
  if (!name) {
    alert('Please enter a name before continuing.');
    return null;
  }
  const profile = { name };
  const age = formData.get('age');
  if (age) profile.age = age;

  const gender = formData.get('gender');
  const customGender = dom.customGender.value.trim();
  if (gender === 'Self-described' && customGender) {
    profile.gender = customGender;
  } else if (gender) {
    profile.gender = gender;
  }

  if (state.mode === 'paired' && participantNumber === 2) {
    const rel = dom.relationship.value;
    const customRel = dom.customRelationship.value.trim();
    profile.relationship = rel === 'other' && customRel ? customRel : rel;
  }

  return profile;
}

function gatherResponses() {
  const responses = state.values.map((v) => ({
    id: v.id,
    value: v.name,
    description: v.description,
    answer: state.answers[v.id] || v.personalTake,
  }));
  return responses;
}

async function submitParticipant() {
  const profile = collectProfile(state.participants.length + 1);
  if (!profile) return;

  if (Object.keys(state.answers).length === 0) {
    const proceed = confirm('You have not provided any custom ratings. Proceed with suggested ratings?');
    if (!proceed) return;
  }

  state.participants.push({ profile, responses: gatherResponses() });

  if (state.mode === 'paired' && state.participants.length === 1) {
    alert('First participant saved. Please enter details for the second person.');
    state.currentPage = 1;
    state.answers = {};
    dom.participantBadge.textContent = 'Participant 2';
    dom.bioForm.reset();
    toggleChip(dom.lengthChips, state.length);
    toggleChip(dom.modeChips, state.mode);
    dom.customGender.value = '';
    dom.relationshipField.hidden = false;
    renderTable();
    updateProgress();
    return;
  }

  await finalize();
}

function renderJson(participants) {
  const modeLabel = state.mode;
  const payload = {
    mode: modeLabel,
    relationship: dom.customRelationship.value.trim() || dom.relationship.value,
    quizLength: state.length,
    participants,
  };
  dom.jsonOutput.textContent = JSON.stringify(payload, null, 2);
}

async function finalize() {
  renderJson(state.participants);
  dom.resultsCard.hidden = false;
  dom.reportStatus.textContent = 'Requesting Gemini report...';
  dom.reportOutput.textContent = '';

  try {
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participants: state.participants,
        mode: state.mode,
        relationshipType: dom.customRelationship.value.trim() || dom.relationship.value,
      }),
    });

    if (!response.ok) throw new Error('Unable to reach the report service.');
    const data = await response.json();
    dom.reportStatus.textContent = data.usedGemini
      ? 'Gemini response ready.'
      : 'Preview shown because Gemini key was missing or unreachable.';
    dom.reportOutput.innerHTML = formatReport(data.text);
  } catch (error) {
    dom.reportStatus.textContent = 'Report failed.';
    dom.reportOutput.textContent = error.message;
  }
}

function formatReport(text) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .map((line) => {
      if (line.startsWith('- ')) {
        return `<p><strong>${line.replace('- ', '')}</strong></p>`;
      }
      if (line.match(/^\d+\./)) {
        return `<p><strong>${line}</strong></p>`;
      }
      return `<p>${line}</p>`;
    })
    .join('');
}

function downloadJson() {
  const blob = new Blob([dom.jsonOutput.textContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'values-results.json';
  a.click();
  URL.revokeObjectURL(url);
}

dom.startBtn.addEventListener('click', () => {
  document.querySelector('#setup').scrollIntoView({ behavior: 'smooth' });
});

dom.scrollToValues.addEventListener('click', () => {
  document.querySelector('#quiz').scrollIntoView({ behavior: 'smooth' });
});

dom.lengthChips.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-length]');
  if (!btn) return;
  state.length = btn.dataset.length;
  toggleChip(dom.lengthChips, state.length);
  updateValues();
});

dom.modeChips.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  state.mode = btn.dataset.mode;
  toggleChip(dom.modeChips, state.mode);
  dom.relationshipField.hidden = state.mode !== 'paired';
});

dom.prevPage.addEventListener('click', () => {
  if (state.currentPage === 1) return;
  state.currentPage -= 1;
  renderTable();
});

dom.nextPage.addEventListener('click', () => {
  const totalPages = Math.ceil(state.values.length / PAGE_SIZE);
  if (state.currentPage >= totalPages) return;
  state.currentPage += 1;
  renderTable();
});

dom.savePage.addEventListener('click', persistPage);

dom.submitQuiz.addEventListener('click', submitParticipant);

dom.downloadJson.addEventListener('click', downloadJson);

// Initialize
dom.progressTotal.textContent = subsetValues().length;
loadPersisted();
if (!state.values.length) updateValues();
