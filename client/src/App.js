import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

function App() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('ready');
  const [gameData, setGameData] = useState(null);
  const [foundDifferences, setFoundDifferences] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [leaderboard, setLeaderboard] = useState([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [error, setError] = useState(null);
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);

  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/leaderboard');
      setLeaderboard(response.data);
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

  const fetchGameData = async () => {
    try {
      const response = await apiClient.get(`/api/game?difficulty=${difficulty}`);
      setGameData(response.data);
    } catch (error) {
      setError('게임 데이터를 불러오는 데 실패했습니다.');
      console.error('Error fetching game data:', error);
    }
  };

  const handleRegister = async () => {
    try {
      await apiClient.post('/api/register', { username, password });
      alert('성공적으로 등록되었습니다!');
    } catch (error) {
      setError('등록에 실패했습니다.');
      console.error('Error registering:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await apiClient.post('/api/login', { username, password });
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      alert('로그인 성공!');
    } catch (error) {
      setError('로그인에 실패했습니다.');
      console.error('Error logging in:', error);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setGameState('ready');
  };

  const handleSubmitScore = useCallback(async () => {
    try {
      await apiClient.post('/api/score', { score, difficulty });
      alert('점수가 성공적으로 제출되었습니다!');
      await fetchLeaderboard();
    } catch (error) {
      setError('점수 제출에 실패했습니다.');
      console.error('Error submitting score:', error);
    }
  }, [score, difficulty, fetchLeaderboard]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(60);
    setFoundDifferences([]);
    setGameState('playing');
    fetchGameData();
  };

  const handleDifficultyChange = (e) => {
    setDifficulty(e.target.value);
  };

  const handleImageClick = (e) => {
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
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('image', image1);
    formData.append('image', image2);

    try {
      await apiClient.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('이미지 업로드 성공!');
    } catch (error) {
      setError('이미지 업로드에 실패했습니다.');
      console.error('Error uploading images:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>틀린그림찾기 게임</h1>
        {token && <button className="logout-button" onClick={handleLogout}>로그아웃</button>}
      </header>
      <main>
        {error && <div className="error-message">{error}</div>}
        {!token ? (
          <div className="auth-form">
            <input 
              type="text" 
              placeholder="사용자 이름" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="비밀번호" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <button onClick={handleRegister}>회원가입</button>
            <button onClick={handleLogin}>로그인</button>
          </div>
        ) : (
          <>
            {gameState === 'ready' && (
              <div className="game-setup">
                <select value={difficulty} onChange={handleDifficultyChange}>
                  <option value="easy">쉬움</option>
                  <option value="medium">보통</option>
                  <option value="hard">어려움</option>
                </select>
                <button onClick={startGame}>게임 시작</button>
              </div>
            )}
            {gameState === 'playing' && gameData && (
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
            <form onSubmit={handleImageUpload}>
              <h2>이미지 업로드</h2>
              <input type="file" onChange={(e) => setImage1(e.target.files[0])} />
              <input type="file" onChange={(e) => setImage2(e.target.files[0])} />
              <button type="submit">업로드</button>
            </form>
          </>
        )}
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
  );
}

export default App;
