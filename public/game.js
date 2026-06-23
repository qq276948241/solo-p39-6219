const EMOJIS = ['🍎', '🍌', '🍇', '🍓', '🐶', '🐱', '🦊', '🐼'];

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let steps = 0;
let timeElapsed = 0;
let timerInterval = null;
let gameStarted = false;
let canFlip = false;
let gameEnded = false;

const boardEl = document.getElementById('board');
const timerEl = document.getElementById('timer');
const stepsEl = document.getElementById('steps');
const countdownEl = document.getElementById('countdown');
const restartBtn = document.getElementById('restartBtn');
const resultModal = document.getElementById('resultModal');
const resultTitle = document.getElementById('resultTitle');
const resultRating = document.getElementById('resultRating');
const resultSteps = document.getElementById('resultSteps');
const resultTime = document.getElementById('resultTime');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const leaderboardEl = document.getElementById('leaderboard');

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function calculateRating(steps) {
  if (steps <= 10) return 'S';
  if (steps <= 14) return 'A';
  if (steps <= 20) return 'B';
  return 'C';
}

function createBoard() {
  boardEl.innerHTML = '';
  cards = shuffle([...EMOJIS, ...EMOJIS]);
  flippedCards = [];
  matchedPairs = 0;
  steps = 0;
  timeElapsed = 0;
  gameStarted = false;
  canFlip = false;
  gameEnded = false;

  stepsEl.textContent = '0';
  timerEl.textContent = '00:00';

  cards.forEach((emoji, index) => {
    const card = document.createElement('div');
    card.className = 'card flipped';
    card.dataset.emoji = emoji;
    card.dataset.index = index;
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-front">🎴</div>
        <div class="card-back">${emoji}</div>
      </div>
    `;
    card.addEventListener('click', () => handleCardClick(card));
    boardEl.appendChild(card);
  });

  startCountdown();
}

function startCountdown() {
  countdownEl.classList.remove('hidden');
  let count = 2;
  countdownEl.textContent = count;

  const countInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      clearInterval(countInterval);
      countdownEl.classList.add('hidden');
      flipAllDown();
    }
  }, 1000);
}

function flipAllDown() {
  document.querySelectorAll('.card').forEach(card => {
    card.classList.remove('flipped');
  });

  setTimeout(() => {
    canFlip = true;
    gameStarted = true;
    startTimer();
  }, 600);
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeElapsed++;
    timerEl.textContent = formatTime(timeElapsed);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function handleCardClick(card) {
  if (!canFlip || gameEnded) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;
  if (flippedCards.length >= 2) return;

  card.classList.add('flipped');
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    steps++;
    stepsEl.textContent = steps;
    canFlip = false;
    checkMatch();
  }
}

function checkMatch() {
  const [card1, card2] = flippedCards;
  const match = card1.dataset.emoji === card2.dataset.emoji;

  if (match) {
    card1.classList.add('matched');
    card2.classList.add('matched');
    matchedPairs++;
    flippedCards = [];
    canFlip = true;

    if (matchedPairs === EMOJIS.length) {
      endGame();
    }
  } else {
    card1.classList.add('shake');
    card2.classList.add('shake');

    setTimeout(() => {
      card1.classList.remove('flipped', 'shake');
      card2.classList.remove('flipped', 'shake');
      flippedCards = [];
      canFlip = true;
    }, 1000);
  }
}

function endGame() {
  gameEnded = true;
  stopTimer();
  showResult();
}

function showResult() {
  const rating = calculateRating(steps);
  resultRating.textContent = rating;
  resultRating.className = `rating rating-${rating}`;
  resultSteps.textContent = steps;
  resultTime.textContent = formatTime(timeElapsed);
  resultModal.classList.remove('hidden');
  playerNameInput.value = '';
}

function hideResult() {
  resultModal.classList.add('hidden');
}

async function loadLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    renderLeaderboard(data);
  } catch (e) {
    console.error('加载排行榜失败:', e);
  }
}

function renderLeaderboard(data) {
  if (!data || data.length === 0) {
    leaderboardEl.innerHTML = '<li class="empty">暂无记录</li>';
    return;
  }

  leaderboardEl.innerHTML = data.map((entry, i) => `
    <li class="rank-${i + 1}">
      <span class="rank-badge">${i + 1}</span>
      <div class="player-info">
        <div class="player-name">${escapeHtml(entry.name)}</div>
        <div class="player-stats">${entry.steps} 步 · ${formatTime(entry.time)}</div>
      </div>
    </li>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function submitScore() {
  const name = playerNameInput.value.trim();
  if (!name) {
    playerNameInput.focus();
    return;
  }

  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, steps, time: timeElapsed })
    });
    const data = await res.json();
    renderLeaderboard(data);
    hideResult();
  } catch (e) {
    console.error('提交成绩失败:', e);
    alert('提交失败，请稍后重试');
  }
}

restartBtn.addEventListener('click', () => {
  stopTimer();
  hideResult();
  createBoard();
});

playAgainBtn.addEventListener('click', () => {
  hideResult();
  createBoard();
});

submitScoreBtn.addEventListener('click', submitScore);

playerNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitScore();
});

loadLeaderboard();
createBoard();
