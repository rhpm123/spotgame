import './AdminPage.css';

import React, { useState } from 'react';
import axios from 'axios';

function AdminPage() {
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [error, setError] = useState('');

  const handleImageUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (image1) formData.append('image', image1);
    if (image2) formData.append('image', image2);
  
    try {
      const response = await axios.post('/api/upload', formData);  // axios 직접 사용
      console.log('Upload response:', response.data);
      alert('이미지 업로드 성공!');
    } catch (error) {
      console.error('Error uploading images:', error.response?.data || error.message);
      setError('이미지 업로드에 실패했습니다: ' + (error.response?.data?.message || error.message));
    }
  };
  
  return (
    <div className="admin-page">
      <h2>관리자 페이지</h2>
      <form onSubmit={handleImageUpload}>
        <h3>이미지 업로드</h3>
        <div>
          <label htmlFor="image1">원본 이미지: </label>
          <input 
            type="file" 
            id="image1"
            onChange={(e) => setImage1(e.target.files[0])} 
            accept="image/*"
          />
        </div>
        <div>
          <label htmlFor="image2">수정된 이미지: </label>
          <input 
            type="file" 
            id="image2"
            onChange={(e) => setImage2(e.target.files[0])} 
            accept="image/*"
          />
        </div>
        <button type="submit">업로드</button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default AdminPage;
