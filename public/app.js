import { valuesData } from './values.js';

const PAGE_SIZE = 10;
const answerOptions = ['Indifferent', 'Valued', 'Highly Valued', 'Critical'];
const optionClasses = {
  Indifferent: 'option--indifferent',
  Valued: 'option--valued',
  'Highly Valued': 'option--highly',
  Critical: 'option--critical',
};

const dom = {
  startBtn: document.querySelector('#startBtn'),
  scrollToValues: document.querySelector('#scrollToValues'),
  bioForm: document.querySelector('#bioForm'),
  setupCard: document.querySelector('#setup'),
  quizCard: document.querySelector('#quiz'),
  lengthChips: document.querySelector('#lengthChips'),
  modeChips: document.querySelector('#modeChips'),
  relationshipField: document.querySelector('#relationshipField'),
  relationship: document.querySelector('#relationship'),
  customRelationship: document.querySelector('#customRelationship'),
  customGender: document.querySelector('#customGender'),
  name: document.querySelector('#name'),
  age: document.querySelector('#age'),
  gender: document.querySelector('#gender'),
  name2: document.querySelector('#name2'),
  age2: document.querySelector('#age2'),
  gender2: document.querySelector('#gender2'),
  customGender2: document.querySelector('#customGender2'),
  partnerFields: document.querySelector('#partnerFields'),
  progressBar: document.querySelector('#progressBar'),
  progressCount: document.querySelector('#progressCount'),
  progressTotal: document.querySelector('#progressTotal'),
  tableContainer: document.querySelector('#tableContainer'),
  prevPage: document.querySelector('#prevPage'),
  nextPage: document.querySelector('#nextPage'),
  pageLabel: document.querySelector('#pageLabel'),
  toQuiz: document.querySelector('#toQuiz'),
  backToBio: document.querySelector('#backToBio'),
  participantBadge: document.querySelector('#participantBadge'),
  resultsCard: document.querySelector('#results'),
  jsonOutput: document.querySelector('#jsonOutput'),
  reportOutput: document.querySelector('#reportOutput'),
  reportStatus: document.querySelector('#reportStatus'),
  downloadJson: document.querySelector('#downloadJson'),
  downloadErrorLog: document.querySelector('#downloadErrorLog'),
};

const state = {
  mode: 'solo',
  length: 'quick',
  values: [],
  currentPage: 1,
  answers: {},
  participants: [],
  profiles: {},
  currentParticipant: 1,
  currentStep: 1,
  relationshipType: 'partner',
  lastErrorLog: '',
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
  updatePaginationControls();
}

function setStep(step) {
  state.currentStep = step;
  dom.setupCard.classList.toggle('step-hidden', step !== 1);
  dom.quizCard.classList.toggle('step-hidden', step !== 2);
  dom.resultsCard.classList.toggle('step-hidden', step !== 3);
  dom.resultsCard.hidden = step !== 3;
  const target = step === 1 ? dom.setupCard : step === 2 ? dom.quizCard : dom.resultsCard;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateProgress() {
  const answered = Object.keys(state.answers).length;
  dom.progressCount.textContent = answered;
  const pct = Math.round((answered / state.values.length) * 100) || 0;
  dom.progressBar.style.width = `${pct}%`;
}

function updatePaginationControls() {
  const totalPages = Math.ceil(state.values.length / PAGE_SIZE) || 1;
  dom.pageLabel.textContent = `Page ${state.currentPage} / ${totalPages}`;
  dom.prevPage.disabled = state.currentPage === 1;
  const isLastPage = state.currentPage === totalPages;
  dom.nextPage.textContent = isLastPage ? 'Submit participant' : 'Next';
}

function toggleChip(group, value) {
  group.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('selected', chip.dataset.length === value || chip.dataset.mode === value);
  });
}

function toggleCustomGender(selectEl, inputEl) {
  const shouldShow = selectEl.value === 'Self-described';
  inputEl.hidden = !shouldShow;
  if (!shouldShow) inputEl.value = '';
}

function toggleCustomRelationship() {
  const shouldShow = dom.relationship.value === 'other';
  dom.customRelationship.hidden = !shouldShow;
  if (!shouldShow) dom.customRelationship.value = '';
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

    const options = document.createElement('div');
    options.className = 'table__options';

    answerOptions.forEach((option) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = option;
      btn.className = `ghost ${optionClasses[option]}`;
      btn.dataset.id = value.id;
      btn.dataset.answer = option;
      if (state.answers[value.id] === option) {
        btn.classList.add('option--selected');
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

  updatePaginationControls();
}

function buildProfile(prefix = '') {
  const nameField = prefix === '2' ? dom.name2 : dom.name;
  const ageField = prefix === '2' ? dom.age2 : dom.age;
  const genderField = prefix === '2' ? dom.gender2 : dom.gender;
  const customGenderField = prefix === '2' ? dom.customGender2 : dom.customGender;

  const name = nameField?.value?.trim();
  if (!name) {
    alert(`Please enter a name for ${prefix === '2' ? 'participant 2' : 'participant 1'}.`);
    return null;
  }

  const profile = { name };
  const age = ageField?.value;
  if (age) profile.age = age;

  const gender = genderField?.value;
  const customGender = customGenderField?.value?.trim();
  if (gender === 'Self-described' && customGender) {
    profile.gender = customGender;
  } else if (gender) {
    profile.gender = gender;
  }

  return profile;
}

function prepareProfiles() {
  const primary = buildProfile();
  if (!primary) return false;

  let secondary = null;
  if (state.mode === 'paired') {
    secondary = buildProfile('2');
    if (!secondary) return false;
  }

  if (state.mode === 'paired') {
    const rel = dom.relationship.value;
    const customRel = dom.customRelationship.value.trim();
    state.relationshipType = rel === 'other' && customRel ? customRel : rel;
  } else {
    state.relationshipType = 'solo';
  }

  state.profiles = { 1: primary };
  if (secondary) state.profiles[2] = secondary;
  state.participants = [];
  state.currentParticipant = 1;
  state.answers = {};
  state.currentPage = 1;
  dom.participantBadge.textContent = secondary
    ? `Participant 1 - ${primary.name}`
    : `Participant 1 - ${primary.name}`;
  renderTable();
  updateProgress();
  updatePaginationControls();
  return true;
}

function gatherResponses() {
  const responses = state.values.map((v) => ({
    id: v.id,
    value: v.name,
    description: v.description,
    answer: state.answers[v.id] || 'Unrated',
  }));
  return responses;
}

async function submitParticipant() {
  const profile = state.profiles[state.currentParticipant];
  if (!profile) {
    alert('Please complete Step 1 to confirm participant info.');
    return;
  }

  state.participants.push({ profile, responses: gatherResponses() });

  if (state.mode === 'paired' && state.currentParticipant === 1) {
    state.currentParticipant = 2;
    state.answers = {};
    state.currentPage = 1;
    dom.participantBadge.textContent = `Participant 2 - ${state.profiles[2].name}`;
    renderTable();
    updateProgress();
    updatePaginationControls();
    alert('Participant 1 captured. Please rate the same values for Participant 2.');
    return;
  }

  await finalize();
  setStep(3);
}

function renderJson(participants) {
  const modeLabel = state.mode;
  const payload = {
    mode: modeLabel,
    relationship: state.relationshipType,
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
  dom.downloadErrorLog.hidden = true;
  state.lastErrorLog = '';

  const requestPayload = {
    participants: state.participants,
    mode: state.mode,
    relationshipType: state.relationshipType,
  };

  try {
    const response = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const rawText = await response.text();

    if (!response.ok) {
      let serviceMessage = rawText;
      try {
        const parsed = JSON.parse(rawText || '{}');
        serviceMessage = parsed?.error?.message || parsed?.text || rawText || 'Unknown error';
      } catch (err) {
        serviceMessage = rawText || 'Unknown error';
      }
      state.lastErrorLog = buildErrorLog({
        stage: 'report_service_error',
        status: response.status,
        statusText: response.statusText,
        body: rawText,
        payload: requestPayload,
      });
      throw new Error(`Report service error (${response.status} ${response.statusText}): ${serviceMessage}`);
    }

    const data = JSON.parse(rawText || '{}');
    dom.reportStatus.textContent = data.usedGemini
      ? 'Gemini response ready.'
      : 'Preview shown because Gemini key was missing or unreachable.';
    dom.reportOutput.innerHTML = formatReport(data.text);
  } catch (error) {
    if (!state.lastErrorLog) {
      state.lastErrorLog = buildErrorLog({ stage: 'request_failed', error, payload: requestPayload });
    }
    dom.reportStatus.textContent = 'Report failed. Please retry after reviewing the log.';
    dom.reportOutput.innerHTML = `<p>${error.message}</p><p>If the issue persists, share the downloaded log with support.</p>`;
    dom.downloadErrorLog.hidden = false;
  }
}

function buildErrorLog({ stage, payload, status, statusText, body, error }) {
  const timestamp = new Date().toISOString();
  return [
    `Timestamp: ${timestamp}`,
    `Stage: ${stage}`,
    status ? `Status: ${status} ${statusText || ''}`.trim() : null,
    payload ? `Payload: ${JSON.stringify(payload, null, 2)}` : null,
    body ? `Body: ${body}` : null,
    error ? `Error: ${error.message}` : null,
  ]
    .filter(Boolean)
    .join('\n');
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

function downloadErrorLog() {
  if (!state.lastErrorLog) {
    alert('No error log is available yet. Trigger a report first.');
    return;
  }
  const blob = new Blob([state.lastErrorLog], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'values-report-error.log';
  a.click();
  URL.revokeObjectURL(url);
}

dom.startBtn.addEventListener('click', () => {
  setStep(1);
});

dom.scrollToValues.addEventListener('click', () => {
  setStep(1);
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
  const isPaired = state.mode === 'paired';
  dom.relationshipField.hidden = !isPaired;
  dom.partnerFields.hidden = !isPaired;
  dom.name2.required = isPaired;
  if (!isPaired) {
    dom.relationship.value = 'partner';
    toggleCustomRelationship();
  }
});

dom.gender.addEventListener('change', () => toggleCustomGender(dom.gender, dom.customGender));
dom.gender2.addEventListener('change', () => toggleCustomGender(dom.gender2, dom.customGender2));
dom.relationship.addEventListener('change', toggleCustomRelationship);

dom.prevPage.addEventListener('click', () => {
  if (state.currentPage === 1) return;
  state.currentPage -= 1;
  renderTable();
});

dom.nextPage.addEventListener('click', () => {
  const totalPages = Math.ceil(state.values.length / PAGE_SIZE);
  if (state.currentPage >= totalPages) {
    submitParticipant();
    return;
  }
  state.currentPage += 1;
  renderTable();
});

dom.downloadJson.addEventListener('click', downloadJson);
dom.downloadErrorLog.addEventListener('click', downloadErrorLog);

dom.toQuiz.addEventListener('click', () => {
  if (prepareProfiles()) {
    setStep(2);
  }
});

dom.backToBio.addEventListener('click', () => {
  setStep(1);
});

// Initialize
toggleChip(dom.lengthChips, state.length);
toggleChip(dom.modeChips, state.mode);
dom.relationshipField.hidden = true;
dom.partnerFields.hidden = true;
dom.name2.required = false;
toggleCustomGender(dom.gender, dom.customGender);
toggleCustomGender(dom.gender2, dom.customGender2);
toggleCustomRelationship();
updateValues();
setStep(1);
