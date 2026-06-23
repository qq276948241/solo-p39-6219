const EMOJI_POOL = [
  '🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍒', '🍑',
  '🥝', '🍍', '🥭', '🍋', '🐶', '🐱', '🦊', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐰',
  '🦄', '🐝', '🦋', '🐢', '🐬', '🐙', '🦀', '🐠'
];

const DIFFICULTY_CONFIG = {
  easy: {
    name: '简单模式',
    size: 4,
    pairs: 8,
    ratings: { S: 10, A: 14, B: 20 }
  },
  normal: {
    name: '普通模式',
    size: 6,
    pairs: 18,
    ratings: { S: 24, A: 32, B: 44 }
  },
  hard: {
    name: '困难模式',
    size: 8,
    pairs: 32,
    ratings: { S: 44, A: 58, B: 80 }
  }
};

class GameManager {
  constructor() {
    this.difficulty = null;
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.steps = 0;
    this.timeElapsed = 0;
    this.timerInterval = null;
    this.gameStarted = false;
    this.canFlip = false;
    this.gameEnded = false;

    this.elements = {
      board: document.getElementById('board'),
      timer: document.getElementById('timer'),
      steps: document.getElementById('steps'),
      countdown: document.getElementById('countdown'),
      restartBtn: document.getElementById('restartBtn'),
      difficultyModal: document.getElementById('difficultyModal'),
      resultModal: document.getElementById('resultModal'),
      resultDifficulty: document.getElementById('resultDifficulty'),
      resultRating: document.getElementById('resultRating'),
      resultSteps: document.getElementById('resultSteps'),
      resultTime: document.getElementById('resultTime'),
      playerName: document.getElementById('playerName'),
      submitScoreBtn: document.getElementById('submitScoreBtn'),
      playAgainBtn: document.getElementById('playAgainBtn'),
      changeDifficultyBtn: document.getElementById('changeDifficultyBtn'),
      leaderboard: document.getElementById('leaderboard')
    };

    this.bindEvents();
  }

  static shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  bindEvents() {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.startGame(btn.dataset.difficulty);
      });
    });

    this.elements.restartBtn.addEventListener('click', () => this.handleRestart());
    this.elements.playAgainBtn.addEventListener('click', () => this.handlePlayAgain());
    this.elements.changeDifficultyBtn.addEventListener('click', () => this.handleChangeDifficulty());
    this.elements.submitScoreBtn.addEventListener('click', () => this.handleSubmitScore());
    this.elements.playerName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSubmitScore();
    });
  }

  getEmojisForDifficulty(difficulty) {
    const shuffled = GameManager.shuffle([...EMOJI_POOL]);
    return shuffled.slice(0, DIFFICULTY_CONFIG[difficulty].pairs);
  }

  calculateRating(steps, difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty].ratings;
    if (steps <= config.S) return 'S';
    if (steps <= config.A) return 'A';
    if (steps <= config.B) return 'B';
    return 'C';
  }

  showDifficultySelect() {
    this.stopTimer();
    this.elements.difficultyModal.classList.remove('hidden');
    this.elements.resultModal.classList.add('hidden');
    this.elements.board.innerHTML = '';
    this.elements.board.className = 'board';
    this.difficulty = null;
  }

  startGame(difficulty) {
    this.difficulty = difficulty;
    const config = DIFFICULTY_CONFIG[difficulty];
    const emojis = this.getEmojisForDifficulty(difficulty);

    this.resetState();
    this.elements.board.innerHTML = '';
    this.elements.board.className = `board size-${config.size}`;
    this.cards = GameManager.shuffle([...emojis, ...emojis]);

    this.cards.forEach((emoji, index) => {
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
      card.addEventListener('click', () => this.handleCardClick(card));
      this.elements.board.appendChild(card);
    });

    this.elements.difficultyModal.classList.add('hidden');
    this.startCountdown();
  }

  resetState() {
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.steps = 0;
    this.timeElapsed = 0;
    this.gameStarted = false;
    this.canFlip = false;
    this.gameEnded = false;

    this.elements.steps.textContent = '0';
    this.elements.timer.textContent = '00:00';
  }

  startCountdown() {
    this.elements.countdown.classList.remove('hidden');
    let count = 2;
    this.elements.countdown.textContent = count;

    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.elements.countdown.textContent = count;
      } else {
        clearInterval(countInterval);
        this.elements.countdown.classList.add('hidden');
        this.flipAllDown();
      }
    }, 1000);
  }

  flipAllDown() {
    document.querySelectorAll('.card').forEach(card => {
      card.classList.remove('flipped');
    });

    setTimeout(() => {
      this.canFlip = true;
      this.gameStarted = true;
      this.startTimer();
    }, 600);
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timeElapsed++;
      this.elements.timer.textContent = GameManager.formatTime(this.timeElapsed);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleCardClick(card) {
    if (!this.canFlip || this.gameEnded) return;
    if (card.classList.contains('flipped')) return;
    if (card.classList.contains('matched')) return;
    if (this.flippedCards.length >= 2) return;

    card.classList.add('flipped');
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.steps++;
      this.elements.steps.textContent = this.steps;
      this.canFlip = false;
      this.checkMatch();
    }
  }

  checkMatch() {
    const [card1, card2] = this.flippedCards;
    const match = card1.dataset.emoji === card2.dataset.emoji;

    if (match) {
      card1.classList.add('matched');
      card2.classList.add('matched');
      this.matchedPairs++;
      this.flippedCards = [];
      this.canFlip = true;

      if (this.matchedPairs === DIFFICULTY_CONFIG[this.difficulty].pairs) {
        this.endGame();
      }
    } else {
      card1.classList.add('shake');
      card2.classList.add('shake');

      setTimeout(() => {
        card1.classList.remove('flipped', 'shake');
        card2.classList.remove('flipped', 'shake');
        this.flippedCards = [];
        this.canFlip = true;
      }, 1000);
    }
  }

  endGame() {
    this.gameEnded = true;
    this.stopTimer();
    this.showResult();
  }

  showResult() {
    const rating = this.calculateRating(this.steps, this.difficulty);
    this.elements.resultDifficulty.textContent = DIFFICULTY_CONFIG[this.difficulty].name;
    this.elements.resultDifficulty.className = `difficulty-tag ${this.difficulty}`;
    this.elements.resultRating.textContent = rating;
    this.elements.resultRating.className = `rating rating-${rating}`;
    this.elements.resultSteps.textContent = this.steps;
    this.elements.resultTime.textContent = GameManager.formatTime(this.timeElapsed);
    this.elements.resultModal.classList.remove('hidden');
    this.elements.playerName.value = '';
  }

  hideResult() {
    this.elements.resultModal.classList.add('hidden');
  }

  handleRestart() {
    this.stopTimer();
    this.hideResult();
    if (this.difficulty) {
      this.startGame(this.difficulty);
    } else {
      this.showDifficultySelect();
    }
  }

  handlePlayAgain() {
    this.hideResult();
    this.startGame(this.difficulty);
  }

  handleChangeDifficulty() {
    this.hideResult();
    this.showDifficultySelect();
  }

  async handleSubmitScore() {
    const name = this.elements.playerName.value.trim();
    if (!name) {
      this.elements.playerName.focus();
      return;
    }

    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          steps: this.steps,
          time: this.timeElapsed
        })
      });
      const data = await res.json();
      this.renderLeaderboard(data);
      this.hideResult();
    } catch (e) {
      console.error('提交成绩失败:', e);
      alert('提交失败，请稍后重试');
    }
  }

  async loadLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      this.renderLeaderboard(data);
    } catch (e) {
      console.error('加载排行榜失败:', e);
    }
  }

  renderLeaderboard(data) {
    if (!data || data.length === 0) {
      this.elements.leaderboard.innerHTML = '<li class="empty">暂无记录</li>';
      return;
    }

    this.elements.leaderboard.innerHTML = data.map((entry, i) => `
      <li class="rank-${i + 1}">
        <span class="rank-badge">${i + 1}</span>
        <div class="player-info">
          <div class="player-name">${GameManager.escapeHtml(entry.name)}</div>
          <div class="player-stats">${entry.steps} 步 · ${GameManager.formatTime(entry.time)}</div>
        </div>
      </li>
    `).join('');
  }
}

const game = new GameManager();
game.loadLeaderboard();
game.showDifficultySelect();
