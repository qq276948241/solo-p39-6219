const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'api', 'data', 'leaderboard.json');

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

function readLeaderboard() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (e) {
    return [];
  }
}

function writeLeaderboard(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/leaderboard', (req, res) => {
  ensureDataDir();
  const leaderboard = readLeaderboard();
  res.json(leaderboard);
});

app.post('/api/leaderboard', (req, res) => {
  ensureDataDir();
  const { name, steps, time } = req.body;

  if (!name || !steps || !time) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const leaderboard = readLeaderboard();
  leaderboard.push({
    name,
    steps: parseInt(steps),
    time: parseInt(time),
    date: new Date().toISOString()
  });

  leaderboard.sort((a, b) => a.steps - b.steps || a.time - b.time);

  const top10 = leaderboard.slice(0, 10);
  writeLeaderboard(top10);

  res.json(top10);
});

app.listen(PORT, () => {
  ensureDataDir();
  console.log(`游戏服务器已启动: http://localhost:${PORT}`);
});
