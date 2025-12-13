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
  toast: document.querySelector('#toast'),
  loadingOverlay: document.querySelector('#loadingOverlay'),
  loadingTitle: document.querySelector('#loadingTitle'),
  loadingSubtitle: document.querySelector('#loadingSubtitle'),
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
  toastTimer: null,
};

function updateCustomRelationshipVisibility() {
  const isOther = dom.relationship.value === 'other';
  dom.customRelationship.hidden = !isOther;
  if (!isOther) {
    dom.customRelationship.value = '';
  }
}

function toggleCustomGender(selectEl, inputEl) {
  if (!selectEl || !inputEl) return;
  const isSelfDescribed = selectEl.value === 'Self-described';
  inputEl.hidden = !isSelfDescribed;
  if (!isSelfDescribed) {
    inputEl.value = '';
  }
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  dom.toast.classList.add('visible');
  state.toastTimer = setTimeout(() => {
    dom.toast.classList.remove('visible');
    dom.toast.hidden = true;
  }, 2600);
}

const loadingMessages = [
  { title: 'Analyzing your stars…', subtitle: 'Plotting constellations of your core values.' },
  { title: 'Consulting the philosophers…', subtitle: 'Socrates, Simone, and Seneca are on the case.' },
  { title: 'Asking the algorithms nicely…', subtitle: 'Polishing every insight before it reaches you.' },
  { title: 'Decoding your narrative…', subtitle: 'Weaving your answers into a story worth rereading.' },
  { title: 'Brewing perspective…', subtitle: 'Steeping wisdom to the perfect temperature.' },
];

let loadingMessageIndex = 0;
let loadingMessageTimer = null;
let loadingTypingTimer = null;

function stopLoadingMessages() {
  clearInterval(loadingMessageTimer);
  clearInterval(loadingTypingTimer);
  loadingMessageTimer = null;
  loadingTypingTimer = null;
}

function typeLoadingSubtitle(subtitle) {
  clearInterval(loadingTypingTimer);
  dom.loadingSubtitle.textContent = '';

  if (!subtitle) return;

  let charIndex = 0;
  loadingTypingTimer = setInterval(() => {
    dom.loadingSubtitle.textContent = subtitle.slice(0, charIndex + 1);
    charIndex += 1;
    if (charIndex >= subtitle.length) {
      clearInterval(loadingTypingTimer);
    }
  }, 28);
}

function showLoadingMessage(message) {
  dom.loadingTitle.textContent = message.title;
  typeLoadingSubtitle(message.subtitle);
}

function startLoadingMessages(initialMessage) {
  stopLoadingMessages();

  const queue = [initialMessage, ...loadingMessages].filter(
    (entry) => entry && entry.title && entry.subtitle
  );

  loadingMessageIndex = 0;
  showLoadingMessage(queue[loadingMessageIndex]);

  loadingMessageTimer = setInterval(() => {
    loadingMessageIndex = (loadingMessageIndex + 1) % queue.length;
    showLoadingMessage(queue[loadingMessageIndex]);
  }, 3200);
}

function setLoading(
  isLoading,
  title = 'Evaluating values…',
  subtitle = 'Hold on while we prepare your report.'
) {
  if (isLoading) {
    startLoadingMessages({ title, subtitle });
  } else {
    stopLoadingMessages();
  }

  dom.loadingOverlay.hidden = !isLoading;
  dom.loadingOverlay.classList.toggle('visible', isLoading);
}

function scrollToQuizTop() {
  dom.quizCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function shuffleValues(list) {
  const shuffled = list.map((value) => ({ ...value }));
  let seed = 20241129;

  const seededRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.map((value, index) => ({ ...value, id: index + 1 }));
}

const shuffledValues = shuffleValues(valuesData);

function subsetValues() {
  const pool = [...shuffledValues];
  if (state.length === 'quick') return pool.slice(0, 50);
  if (state.length === 'moderate') return pool.slice(0, 125);
  return pool;
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

function getSubmitLabel(isLastPage) {
  if (!isLastPage) return 'Next';
  if (state.mode === 'paired' && state.currentParticipant === 1) {
    return 'Submit participant 1 details';
  }
  return 'Evaluate values';
}

function updatePaginationControls() {
  const totalPages = Math.ceil(state.values.length / PAGE_SIZE) || 1;
  dom.pageLabel.textContent = `Page ${state.currentPage} / ${totalPages}`;
  dom.prevPage.disabled = state.currentPage === 1;
  const isLastPage = state.currentPage === totalPages;
  dom.nextPage.textContent = getSubmitLabel(isLastPage);
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
    showToast(`Please enter a name for ${prefix === '2' ? 'participant 2' : 'participant 1'}.`);
    nameField?.focus();
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
    state.relationshipType = '';
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
    showToast('Participant 1 captured. Now rate the same values for Participant 2.');
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
  setLoading(true);
  dom.nextPage.disabled = true;
  dom.prevPage.disabled = true;
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
        relationshipType: state.relationshipType,
        quizLength: state.length,
      }),
    });

    if (!response.ok) throw new Error('Unable to reach the report service.');
    const data = await response.json();
    if (data.report) {
      dom.reportStatus.textContent = data.usedGemini
        ? 'Gemini response ready.'
        : 'Preview shown because Gemini key was missing or unreachable.';
      sessionStorage.setItem(
        'valuesReport',
        JSON.stringify({
          report: data.report,
          usedGemini: data.usedGemini,
          rawText: data.rawText || data.text,
          payload: {
            participants: state.participants,
            mode: state.mode,
            relationshipType: state.relationshipType,
            quizLength: state.length,
          },
        })
      );
      window.location.href = '/report.html';
      return;
    }

    dom.reportStatus.textContent = 'Report returned without structured data. Displaying raw text.';
    dom.reportOutput.innerHTML = formatReport(data.text || '');
  } catch (error) {
    dom.reportStatus.textContent = 'Report failed.';
    dom.reportOutput.textContent = error.message;
  } finally {
    setLoading(false);
    dom.nextPage.disabled = false;
    dom.prevPage.disabled = false;
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
  dom.relationshipField.classList.toggle('collapsed', !isPaired);
  dom.partnerFields.hidden = !isPaired;
  dom.name2.required = isPaired;
  if (!isPaired) {
    dom.relationship.value = 'partner';
    dom.customRelationship.hidden = true;
    dom.customRelationship.value = '';
  }
  updateCustomRelationshipVisibility();
});

dom.relationship.addEventListener('change', updateCustomRelationshipVisibility);

dom.gender.addEventListener('change', () => {
  toggleCustomGender(dom.gender, dom.customGender);
});

dom.gender2.addEventListener('change', () => {
  toggleCustomGender(dom.gender2, dom.customGender2);
});

dom.prevPage.addEventListener('click', () => {
  if (state.currentPage === 1) return;
  state.currentPage -= 1;
  renderTable();
  scrollToQuizTop();
});

dom.nextPage.addEventListener('click', () => {
  const totalPages = Math.ceil(state.values.length / PAGE_SIZE);
  if (state.currentPage >= totalPages) {
    scrollToQuizTop();
    submitParticipant();
    return;
  }
  state.currentPage += 1;
  renderTable();
  scrollToQuizTop();
});

dom.downloadJson.addEventListener('click', downloadJson);

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
dom.relationshipField.classList.add('collapsed');
updateCustomRelationshipVisibility();
toggleCustomGender(dom.gender, dom.customGender);
toggleCustomGender(dom.gender2, dom.customGender2);
dom.partnerFields.hidden = true;
dom.name2.required = false;
updateValues();
setStep(1);
