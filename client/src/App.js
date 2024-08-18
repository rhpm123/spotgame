import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'multipart/form-data' },
});

function AdminPage() {
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [error, setError] = useState(null);

  const handleImageUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('image', image1);
    formData.append('image', image2);

    try {
      await apiClient.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('이미지 업로드 성공!');
    } catch (error) {
      setError('이미지 업로드에 실패했습니다.');
      console.error('Error uploading images:', error);
    }
  };

  return (
    <div className="admin-page">
      <h2>관리자 페이지</h2>
      <form onSubmit={handleImageUpload}>
        <h3>이미지 업로드</h3>
        <input type="file" onChange={(e) => setImage1(e.target.files[0])} />
        <input type="file" onChange={(e) => setImage2(e.target.files[0])} />
        <button type="submit">업로드</button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

function GamePlay({ gameData, score, timeLeft, difficulty, handleImageClick }) {
  return (
    <div className="game-play">
      <div className="game-info">
        <p>점수: {score}</p>
        <p>남은 시간: {timeLeft}초</p>
        <p>난이도: {difficulty}</p>
      </div>
      <div className="game-container">
        <div className="image-container">
          <img src={`${apiClient.defaults.baseURL}${gameData.imageUrl1}`} alt="원본 이미지" onClick={handleImageClick} />
        </div>
        <div className="image-container">
          <img src={`${apiClient.defaults.baseURL}${gameData.imageUrl2}`} alt="수정된 이미지" onClick={handleImageClick} />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [gameState, setGameState] = useState('ready');
  const [gameData, setGameData] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [foundDifferences, setFoundDifferences] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [leaderboard, setLeaderboard] = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/leaderboard');
      setLeaderboard(data);
    } catch (error) {
      setError('리더보드를 불러오는 데 실패했습니다.');
      console.error('Error fetching leaderboard:', error);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    let timer;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 || (gameData && foundDifferences.length === gameData.differences.length)) {
      setGameState('finished');
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameState, foundDifferences.length, gameData]);

  const fetchGameData = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/api/game?difficulty=${difficulty}`);
      setGameData(data);
    } catch (error) {
      setError('게임 데이터를 불러오는 데 실패했습니다.');
      console.error('Error fetching game data:', error);
    }
  }, [difficulty]);

  const handleAuth = useCallback(async (type) => {
    try {
      const { data } = await apiClient.post(`/api/${type}`, { username, password });
      if (type === 'login') {
        setToken(data.token);
        localStorage.setItem('token', data.token);
      }
      alert(`${type === 'login' ? '로그인' : '회원가입'} 성공!`);
    } catch (error) {
      setError(`${type === 'login' ? '로그인' : '회원가입'}에 실패했습니다.`);
      console.error(`Error ${type}:`, error);
    }
  }, [username, password]);

  const handleSubmitScore = useCallback(async () => {
    try {
      await apiClient.post('/api/score', { score, difficulty });
      alert('점수가 성공적으로 제출되었습니다!');
      fetchLeaderboard();
    } catch (error) {
      setError('점수 제출에 실패했습니다.');
      console.error('Error submitting score:', error);
    }
  }, [score, difficulty, fetchLeaderboard]);

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(60);
    setFoundDifferences([]);
    setGameState('playing');
    fetchGameData();
  }, [fetchGameData]);

  const handleImageClick = useCallback((e) => {
    if (gameState !== 'playing' || !gameData) return;

    const rect = e.target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const clickedDifference = gameData.differences.find(
      diff => Math.abs(diff.x/100 - x) < 0.05 && Math.abs(diff.y/100 - y) < 0.05
    );

    if (clickedDifference && !foundDifferences.includes(clickedDifference)) {
      setFoundDifferences(prev => [...prev, clickedDifference]);
      setScore(prev => prev + 1);
    }
  }, [gameState, gameData, foundDifferences]);

  const renderAuthForm = (
    <div className="auth-form">
      <input type="text" placeholder="사용자 이름" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={() => handleAuth('register')}>회원가입</button>
      <button onClick={() => handleAuth('login')}>로그인</button>
    </div>
  );

  const renderGame = () => (
    <>
      {gameState === 'ready' && (
        <div className="game-setup">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>
          <button onClick={startGame}>게임 시작</button>
        </div>
      )}
      {gameState === 'playing' && gameData && (
        <GamePlay
          gameData={gameData}
          score={score}
          timeLeft={timeLeft}
          difficulty={difficulty}
          handleImageClick={handleImageClick}
        />
      )}
      {gameState === 'finished' && (
        <div className="game-result">
          <h2>게임 종료!</h2>
          <p>최종 점수: {score}</p>
          <p>난이도: {difficulty}</p>
          <button onClick={handleSubmitScore}>점수 제출</button>
          <button onClick={startGame}>다시 시작</button>
        </div>
      )}
    </>
  );

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>틀린그림찾기 게임</h1>
          <nav>
            <ul>
              <li><Link to="/">게임</Link></li>
              <li><Link to="/admin">관리자</Link></li>
            </ul>
          </nav>
          {token && <button className="logout-button" onClick={() => {setToken(null); localStorage.removeItem('token');}}>로그아웃</button>}
        </header>
        <main>
          {error && <div className="error-message">{error}</div>}
          <Routes>
            <Route path="/" element={!token ? renderAuthForm : renderGame()} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
          <div className="leaderboard">
            <h2>리더보드</h2>
            <ul>
              {leaderboard.map((entry, index) => (
                <li key={index}>{entry.username}: {entry.score} (난이도: {entry.difficulty})</li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;