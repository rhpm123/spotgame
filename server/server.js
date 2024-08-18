const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// 실제 프로젝트에서는 이 정보를 데이터베이스에 저장해야 합니다
const users = [];
const scores = [];

const JWT_SECRET = 'your_jwt_secret'; // 실제 프로젝트에서는 환경 변수로 관리해야 합니다

// Multer 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // 업로드된 파일이 저장될 경로
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // 파일명 설정
    }
});

const upload = multer({ dest: 'uploads/' });

// 여러 이미지 세트 추가
const gameSets = [
  {
    id: 1,
    difficulty: 'easy',
    imageUrl1: '/uploads/image1_easy.jpg',
    imageUrl2: '/uploads/image2_easy.jpg',
    differences: [
      { x: 50, y: 50 },
      { x: 150, y: 150 },
      { x: 250, y: 250 },
    ]
  },
  {
    id: 2,
    difficulty: 'medium',
    imageUrl1: '/uploads/image1_medium.jpg',
    imageUrl2: '/uploads/image2_medium.jpg',
    differences: [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 300 },
      { x: 400, y: 400 },
    ]
  },
  {
    id: 3,
    difficulty: 'hard',
    imageUrl1: '/uploads/image1_hard.jpg',
    imageUrl2: '/uploads/image2_hard.jpg',
    differences: [
      { x: 75, y: 75 },
      { x: 175, y: 175 },
      { x: 275, y: 275 },
      { x: 375, y: 375 },
      { x: 475, y: 475 },
    ]
  }
];

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.status(201).json({ message: 'User registered successfully' });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
});

// 관리자용 이미지 업로드 엔드포인트
app.post('/api/upload', upload.array('image', 2), (req, res) => { // 중괄호 추가
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ message: 'Invalid token' });

      // 관리자인지 확인하는 로직 추가 (예: 관리자 사용자명을 검사)
      if (decoded.username !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      res.json({ message: '파일 업로드 성공' });
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: '파일 업로드 중 오류 발생', error: error.message });
  }
}); // 'catch' 블록 추가

app.get('/api/game', (req, res) => {
  const difficulty = req.query.difficulty || 'medium';
  const gameSet = gameSets.find(set => set.difficulty === difficulty);
  if (gameSet) {
    res.json(gameSet);
  } else {
    res.status(404).json({ message: 'Game set not found' });
  }
});

app.get('/api/game/sets', (req, res) => {
  const sets = gameSets.map(({ id, difficulty }) => ({ id, difficulty }));
  res.json(sets);
});

app.post('/api/score', (req, res) => {
  const { score, difficulty } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    scores.push({ username: decoded.username, score, difficulty });
    res.json({ message: 'Score saved successfully' });
  });
});

app.get('/api/leaderboard', (req, res) => {
  const leaderboard = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json(leaderboard);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
