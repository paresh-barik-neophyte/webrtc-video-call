import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

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
    <div className="flex justify-center items-center min-h-screen p-5">
      <div className="bg-white rounded-[20px] p-10 max-w-[500px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <h1 className="text-4xl text-primary text-center mb-2.5">WebRTC Video Call</h1>
        <p className="text-center text-gray-600 mb-7 text-lg">Connect with anyone, anywhere</p>

        <div className="bg-gray-50 rounded-[10px] p-5 mb-7">
          <h3 className="text-gray-800 mb-4 text-lg">How to use:</h3>
          <ol className="pl-5 list-decimal">
            <li className="text-gray-600 mb-2.5 leading-relaxed">Click "Create Room" to start a new video call</li>
            <li className="text-gray-600 mb-2.5 leading-relaxed">Share the Room ID with the person you want to call</li>
            <li className="text-gray-600 mb-2.5 leading-relaxed">They can join by entering the Room ID and clicking "Join Room"</li>
            <li className="text-gray-600 mb-2.5 leading-relaxed">Grant camera and microphone permissions when prompted</li>
          </ol>
        </div>

        <div className="mb-5">
          <button 
            className="w-full p-4 border-none rounded-[10px] text-lg font-semibold cursor-pointer transition-all duration-300 bg-gradient-to-br from-primary to-primary-dark text-white hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(102,126,234,0.4)]" 
            onClick={createRoom}
          >
            Create Room
          </button>
        </div>

        <div className="text-center my-5 relative">
          <span className="bg-white px-2.5 text-gray-400 text-sm">OR</span>
          <div className="absolute top-1/2 left-0 w-[40%] h-px bg-gray-300"></div>
          <div className="absolute top-1/2 right-0 w-[40%] h-px bg-gray-300"></div>
        </div>

        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            className="w-full p-4 border-2 border-gray-200 rounded-[10px] text-base transition-colors duration-300 focus:outline-none focus:border-primary"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {error && <p className="text-red-600 text-sm m-0">{error}</p>}
          <button 
            className="w-full p-4 border-none rounded-[10px] text-lg font-semibold cursor-pointer transition-all duration-300 bg-green-600 text-white hover:bg-green-700 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(40,167,69,0.4)]" 
            onClick={joinRoom}
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
