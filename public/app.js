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
  resumeModal: document.querySelector('#resumeModal'),
  resumeQuiz: document.querySelector('#resumeQuiz'),
  startOver: document.querySelector('#startOver'),
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
  loadingMessageTimer: null,
  loadingStreamTimer: null,
};

const STORAGE_KEY = 'valuesQuizProgress';
let pendingResumeData = null;

const LOADING_MESSAGES = [
  'Analyzing your stars…',
  'Consulting the philosophers…',
  'Balancing head, heart, and gut…',
  'Negotiating with your inner heroes…',
  'Counting virtues — twice for honesty…',
  'Asking the muses for a quick peer review…',
];

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

function setLoading(isLoading, title = 'Evaluating values…', subtitle = 'Hold on while we prepare your report.') {
  clearInterval(state.loadingStreamTimer);
  clearTimeout(state.loadingMessageTimer);
  dom.loadingTitle.textContent = title;
  dom.loadingSubtitle.textContent = subtitle;
  dom.loadingOverlay.hidden = !isLoading;
  dom.loadingOverlay.classList.toggle('visible', isLoading);

  if (isLoading) {
    startLoadingMessages(subtitle);
  }
}

function startLoadingMessages(seedSubtitle) {
  const messages = [seedSubtitle, ...LOADING_MESSAGES];
  let index = 0;

  const typeMessage = (message) => {
    let charIndex = 0;
    dom.loadingSubtitle.textContent = '';
    state.loadingStreamTimer = setInterval(() => {
      if (charIndex <= message.length) {
        dom.loadingSubtitle.textContent = message.slice(0, charIndex);
        charIndex += 1;
        return;
      }

      clearInterval(state.loadingStreamTimer);
      state.loadingMessageTimer = setTimeout(() => {
        index = (index + 1) % messages.length;
        typeMessage(messages[index]);
      }, 700);
    }, 35);
  };

  typeMessage(messages[index]);
}

function getFormValuesSnapshot() {
  return {
    name: dom.name.value,
    age: dom.age.value,
    gender: dom.gender.value,
    customGender: dom.customGender.value,
    name2: dom.name2.value,
    age2: dom.age2.value,
    gender2: dom.gender2.value,
    customGender2: dom.customGender2.value,
    relationship: dom.relationship.value,
    customRelationship: dom.customRelationship.value,
  };
}

function updateCustomRelationshipVisibility() {
  const isOther = dom.relationship.value === 'other';
  dom.customRelationship.hidden = !isOther;
  if (!isOther) {
    dom.customRelationship.value = '';
  }
}

function updateCustomGenderVisibility(selectEl, inputEl) {
  if (!selectEl || !inputEl) return;
  const isSelfDescribed = selectEl.value === 'Self-described';
  inputEl.hidden = !isSelfDescribed;
  if (!isSelfDescribed) {
    inputEl.value = '';
  }
}

function applyFormValues(snapshot = {}) {
  dom.name.value = snapshot.name || '';
  dom.age.value = snapshot.age || '';
  dom.gender.value = snapshot.gender || '';
  dom.customGender.value = snapshot.customGender || '';
  dom.name2.value = snapshot.name2 || '';
  dom.age2.value = snapshot.age2 || '';
  dom.gender2.value = snapshot.gender2 || '';
  dom.customGender2.value = snapshot.customGender2 || '';
  dom.relationship.value = snapshot.relationship || 'partner';
  dom.customRelationship.value = snapshot.customRelationship || '';
  updateCustomRelationshipVisibility();
  updateCustomGenderVisibility(dom.gender, dom.customGender);
  updateCustomGenderVisibility(dom.gender2, dom.customGender2);
}

function persistProgress() {
  const hasProgress = state.currentStep > 1 || Object.keys(state.answers).length > 0 || state.participants.length > 0;
  if (!hasProgress) return;

  const payload = {
    answers: state.answers,
    currentPage: state.currentPage,
    currentStep: state.currentStep,
    currentParticipant: state.currentParticipant,
    profiles: state.profiles,
    participants: state.participants,
    relationshipType: state.relationshipType,
    length: state.length,
    mode: state.mode,
    formValues: getFormValuesSnapshot(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearSavedProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadSavedProgress() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (error) {
    clearSavedProgress();
    return null;
  }
}

function hasSavedProgress(saved) {
  if (!saved) return false;
  const answered = saved.answers ? Object.keys(saved.answers).length : 0;
  return answered > 0 || (saved.participants && saved.participants.length > 0);
}

function restoreProgress(saved) {
  state.mode = saved.mode || state.mode;
  state.length = saved.length || state.length;
  toggleChip(dom.modeChips, state.mode);
  toggleChip(dom.lengthChips, state.length);

  const isPaired = state.mode === 'paired';
  dom.relationshipField.hidden = !isPaired;
  dom.relationshipField.classList.toggle('collapsed', !isPaired);
  dom.partnerFields.hidden = !isPaired;
  dom.name2.required = isPaired;

  applyFormValues(saved.formValues);

  state.relationshipType = saved.relationshipType || (isPaired ? dom.relationship.value : '');
  state.profiles = saved.profiles || {};
  state.participants = saved.participants || [];
  state.currentParticipant = saved.currentParticipant || 1;
  state.answers = saved.answers || {};
  state.currentPage = saved.currentPage || 1;
  state.currentStep = saved.currentStep || 2;

  const totalPages = Math.ceil(subsetValues().length / PAGE_SIZE) || 1;
  state.currentPage = Math.min(state.currentPage, totalPages);

  updateValues(true);
  const participantName = state.profiles[state.currentParticipant]?.name;
  dom.participantBadge.textContent = participantName
    ? `Participant ${state.currentParticipant} - ${participantName}`
    : `Participant ${state.currentParticipant}`;
  updateProgress();
  updatePaginationControls();
  setStep(state.currentStep);
  persistProgress();
}

function resetToDefaults() {
  state.mode = 'solo';
  state.length = 'quick';
  state.currentPage = 1;
  state.answers = {};
  state.participants = [];
  state.profiles = {};
  state.currentParticipant = 1;
  state.relationshipType = 'partner';
  state.currentStep = 1;

  applyFormValues({ relationship: 'partner' });
  toggleChip(dom.modeChips, state.mode);
  toggleChip(dom.lengthChips, state.length);
  dom.relationshipField.hidden = true;
  dom.relationshipField.classList.add('collapsed');
  dom.partnerFields.hidden = true;
  dom.name2.required = false;
  updateCustomRelationshipVisibility();
  dom.participantBadge.textContent = 'Participant 1';

  updateValues();
  updateProgress();
  updatePaginationControls();
  setStep(1);
}

function promptResumeIfAvailable() {
  const saved = loadSavedProgress();
  if (!hasSavedProgress(saved)) return;

  pendingResumeData = saved;
  dom.resumeModal.hidden = false;
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
  if (state.length === 'super-quick') return pool.slice(0, 10);
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
        persistProgress();
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
  persistProgress();

  if (state.mode === 'paired' && state.currentParticipant === 1) {
    state.currentParticipant = 2;
    state.answers = {};
    state.currentPage = 1;
    dom.participantBadge.textContent = `Participant 2 - ${state.profiles[2].name}`;
    renderTable();
    updateProgress();
    updatePaginationControls();
    showToast('Participant 1 captured. Now rate the same values for Participant 2.');
    persistProgress();
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
  clearSavedProgress();
  setLoading(true);
  dom.nextPage.disabled = true;
  dom.prevPage.disabled = true;
  renderJson(state.participants);
  dom.resultsCard.hidden = false;
  dom.reportStatus.textContent = 'Requesting Gemini report...';
  dom.reportOutput.textContent = '';
  dom.reportOutput.classList.remove('report--error');

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

    if (!response.ok) {
      let errorMessage = 'Unable to reach the report service.';
      let debugData = null;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody?.error?.message || errorMessage;
        debugData = errorBody?.error?.debug;
      } catch (parseError) {
        errorMessage = `${errorMessage} (${response.statusText || 'Unknown error'})`;
      }
      const err = new Error(errorMessage);
      err.debugData = debugData;
      throw err;
    }
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
    dom.reportOutput.innerHTML = `<p>${error.message}</p>`;
    dom.reportOutput.classList.add('report--error');

    if (error.debugData) {
      const debugBtn = document.createElement('button');
      debugBtn.textContent = 'Download Debug Log';
      debugBtn.className = 'ghost mt-8';
      debugBtn.style.width = '100%';
      debugBtn.onclick = () => {
        const blob = new Blob([JSON.stringify(error.debugData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'values-debug-log.json';
        a.click();
        URL.revokeObjectURL(url);
      };
      dom.reportOutput.appendChild(debugBtn);
    }
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
    dom.customRelationship.value = '';
    dom.customRelationship.hidden = true;
  }
});

dom.relationship.addEventListener('change', updateCustomRelationshipVisibility);

dom.gender.addEventListener('change', () => updateCustomGenderVisibility(dom.gender, dom.customGender));
dom.gender2.addEventListener('change', () => updateCustomGenderVisibility(dom.gender2, dom.customGender2));

dom.prevPage.addEventListener('click', () => {
  if (state.currentPage === 1) return;
  state.currentPage -= 1;
  renderTable();
  scrollToQuizTop();
  persistProgress();
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
  persistProgress();
});

dom.downloadJson.addEventListener('click', downloadJson);

dom.toQuiz.addEventListener('click', () => {
  if (prepareProfiles()) {
    setStep(2);
    persistProgress();
  }
});

dom.backToBio.addEventListener('click', () => {
  setStep(1);
});

dom.resumeQuiz.addEventListener('click', () => {
  if (pendingResumeData) {
    restoreProgress(pendingResumeData);
    pendingResumeData = null;
  }
  dom.resumeModal.hidden = true;
});

dom.startOver.addEventListener('click', () => {
  clearSavedProgress();
  pendingResumeData = null;
  resetToDefaults();
  dom.resumeModal.hidden = true;
});

// Initialize
toggleChip(dom.lengthChips, state.length);
toggleChip(dom.modeChips, state.mode);
dom.relationshipField.hidden = true;
dom.relationshipField.classList.add('collapsed');
dom.partnerFields.hidden = true;
dom.name2.required = false;
updateCustomGenderVisibility(dom.gender, dom.customGender);
updateCustomGenderVisibility(dom.gender2, dom.customGender2);
updateValues();
setStep(1);
promptResumeIfAvailable();
