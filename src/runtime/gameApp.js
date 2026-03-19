import { createMathEncounterTemplate, generateEquation, listSkillFamilies } from '../math/equationEngine.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const ENCOUNTER_TYPES = ['target_select', 'range_landing', 'gate_unlock'];

function pick(array, random = Math.random) {
  return array[Math.floor(random() * array.length)];
}

function shuffle(array, random = Math.random) {
  const clone = [...array];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

export function createTargetSelectionGame(documentRef = document) {
  const app = documentRef.querySelector('[data-game-app]');
  const equationText = documentRef.querySelector('[data-equation]');
  const skillText = documentRef.querySelector('[data-skill]');
  const difficultyText = documentRef.querySelector('[data-difficulty]');
  const scoreText = documentRef.querySelector('[data-score]');
  const streakText = documentRef.querySelector('[data-streak]');
  const feedbackText = documentRef.querySelector('[data-feedback]');
  const hintText = documentRef.querySelector('[data-hint]');
  const encounterText = documentRef.querySelector('[data-encounter]');
  const choicesLayer = documentRef.querySelector('[data-choices]');
  const nextButton = documentRef.querySelector('[data-next-equation]');
  const hintButton = documentRef.querySelector('[data-show-hint]');

  const state = {
    score: 0,
    streak: 0,
    equation: null,
    encounter: null,
    targets: [],
    rafId: null,
    lastTime: 0,
  };

  function updateHud() {
    equationText.textContent = state.equation.prompt;
    skillText.textContent = state.equation.skill.replaceAll('_', ' ');
    difficultyText.textContent = state.equation.difficulty.label;
    scoreText.textContent = String(state.score);
    streakText.textContent = String(state.streak);
    encounterText.textContent = `${state.encounter.encounterType} • target ${state.encounter.successTarget}`;
    hintText.textContent = 'Press “Show Hint” if you want help.';
  }

  function stopLoop() {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
  }

  function createTarget(value, isCorrect, xPercent, yPercent, vx, vy) {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.className = 'answer-target';
    button.textContent = String(value);
    button.dataset.correct = String(isCorrect);
    button.style.left = `${xPercent}%`;
    button.style.top = `${yPercent}%`;
    button.addEventListener('click', () => handleChoice(isCorrect, value));
    choicesLayer.appendChild(button);

    return {
      value,
      isCorrect,
      x: xPercent,
      y: yPercent,
      vx,
      vy,
      width: 14,
      height: 14,
      element: button,
    };
  }

  function renderTargets() {
    choicesLayer.innerHTML = '';
    const answers = shuffle([
      state.equation.canonicalAnswer,
      ...state.equation.distractors,
    ]);

    state.targets = answers.map((answer, index) => createTarget(
      answer,
      answer === state.equation.canonicalAnswer,
      8 + index * 20,
      18 + (index % 2) * 30,
      index % 2 === 0 ? 0.014 + index * 0.002 : -0.016 - index * 0.001,
      index < 2 ? 0.01 : -0.012,
    ));
  }

  function animate(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const delta = timestamp - state.lastTime;
    state.lastTime = timestamp;

    for (const target of state.targets) {
      target.x += target.vx * delta;
      target.y += target.vy * delta;

      if (target.x <= 0 || target.x >= 86) target.vx *= -1;
      if (target.y <= 0 || target.y >= 76) target.vy *= -1;

      target.element.style.left = `${target.x}%`;
      target.element.style.top = `${target.y}%`;
    }

    state.rafId = requestAnimationFrame(animate);
  }

  function startLoop() {
    stopLoop();
    state.lastTime = 0;
    state.rafId = requestAnimationFrame(animate);
  }

  function selectEquation() {
    const skill = pick(listSkillFamilies()).id;
    const difficulty = pick(DIFFICULTIES);
    state.equation = generateEquation({ skill, difficulty });
    state.encounter = createMathEncounterTemplate({
      encounterType: pick(ENCOUNTER_TYPES),
      skill,
      difficulty,
      successTarget: Math.max(1, Math.min(5, 1 + Math.floor(state.equation.timePressureScore / 3))),
    });
  }

  function nextRound() {
    selectEquation();
    feedbackText.textContent = 'Pick the moving target that matches the equation.';
    updateHud();
    renderTargets();
    startLoop();
  }

  function handleChoice(isCorrect, value) {
    if (isCorrect) {
      state.score += 10 + state.streak * 2;
      state.streak += 1;
      feedbackText.textContent = `Correct! ${value} clears the encounter.`;
      nextRound();
      return;
    }

    state.score = Math.max(0, state.score - 5);
    state.streak = 0;
    feedbackText.textContent = `${value} is a distractor. Try again.`;
    updateHud();
  }

  nextButton.addEventListener('click', nextRound);
  hintButton.addEventListener('click', () => {
    hintText.textContent = state.equation.hintSteps.join(' ');
  });

  if (!app || !choicesLayer) {
    throw new Error('Game app container not found.');
  }

  nextRound();

  return {
    destroy() {
      stopLoop();
      choicesLayer.innerHTML = '';
    },
  };
}
