import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './Home.css';

function Home() {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const createRoom = () => {
    const newRoomId = uuidv4();
    navigate(`/room/${newRoomId}?create=true`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    setError('');
    navigate(`/room/${roomId}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      joinRoom();
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">WebRTC Video Call</h1>
        <p className="home-subtitle">Connect with anyone, anywhere</p>

        <div className="instructions">
          <h3>How to use:</h3>
          <ol>
            <li>Click "Create Room" to start a new video call</li>
            <li>Share the Room ID with the person you want to call</li>
            <li>They can join by entering the Room ID and clicking "Join Room"</li>
            <li>Grant camera and microphone permissions when prompted</li>
          </ol>
        </div>

        <div className="button-section">
          <button className="btn btn-primary" onClick={createRoom}>
            Create Room
          </button>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="join-section">
          <input
            type="text"
            className="input-field"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {error && <p className="error-message">{error}</p>}
          <button className="btn btn-secondary" onClick={joinRoom}>
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
