import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';
import './VideoCall.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_SERVER_URL || 'http://localhost:5000';

function VideoCall() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Initializing...');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const isCreate = searchParams.get('create') === 'true';
    setIsCreator(isCreate);

    // Initialize socket connection
    socketRef.current = io(SOCKET_SERVER_URL);

    // Get user media
    initializeMedia();

    // Setup socket listeners
    setupSocketListeners();

    return () => {
      cleanup();
    };
  }, []);

  /**
   * Initializes media devices (camera and microphone) and joins/creates room
   * @async
   * @throws {Error} If media devices cannot be accessed
   */
  const initializeMedia = async () => {
    try {
      setConnectionStatus('Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setConnectionStatus('Media devices ready');

      // Create or join room after media is ready
      const isCreate = searchParams.get('create') === 'true';
      if (isCreate) {
        socketRef.current.emit('create-room', roomId);
      } else {
        socketRef.current.emit('join-room', roomId);
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera/microphone. Please grant permissions and try again.');
      setConnectionStatus('Failed');
    }
  };

  const setupSocketListeners = () => {
    const socket = socketRef.current;

    socket.on('room-created', () => {
      setConnectionStatus('Waiting for someone to join...');
    });

    socket.on('room-joined', () => {
      setConnectionStatus('Joined room. Connecting...');
      createOffer();
    });

    socket.on('user-joined', () => {
      setConnectionStatus('User joined. Preparing connection...');
    });

    socket.on('room-not-found', () => {
      setError('Room not found. Please check the Room ID.');
      setConnectionStatus('Failed');
    });

    socket.on('room-full', (data) => {
      const errorMsg = data?.error || 'Room is full. Only 2 participants allowed.';
      setError(`${errorMsg} Redirecting to home...`);
      setConnectionStatus('Failed');
      // Redirect to home after showing error
      setTimeout(() => {
        navigate('/');
      }, 3000);
    });

    socket.on('room-exists', () => {
      setError('Room already exists. Redirecting to home...');
      setConnectionStatus('Failed');
      // Redirect to home after showing error
      setTimeout(() => {
        navigate('/');
      }, 2000);
    });

    socket.on('offer', async ({ offer }) => {
      await handleOffer(offer);
    });

    socket.on('answer', async ({ answer }) => {
      await handleAnswer(answer);
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      await handleIceCandidate(candidate);
    });

    socket.on('user-disconnected', () => {
      setConnectionStatus('User disconnected');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setRemoteStream(null);
    });
  };

  /**
   * Creates and configures a new RTCPeerConnection with event handlers
   * Sets up media tracks, handles incoming streams, ICE candidates, and connection state changes
   * @returns {RTCPeerConnection} Configured peer connection instance
   */
  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
      setConnectionStatus('Connected');
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          roomId,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('Connection state:', state);
      
      switch (state) {
        case 'connecting':
          setConnectionStatus('Connecting...');
          break;
        case 'connected':
          setConnectionStatus('Connected');
          break;
        case 'disconnected':
          setConnectionStatus('Disconnected');
          break;
        case 'failed':
          setConnectionStatus('Connection failed');
          setError('Connection failed. Please try again.');
          break;
        default:
          break;
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  /**
   * Creates a WebRTC offer and sends it to the peer via signaling server
   * This is called by the joiner to initiate the connection
   * @async
   */
  const createOffer = async () => {
    try {
      setConnectionStatus('Creating offer...');
      
      // Step 1: Create peer connection with STUN servers
      const peerConnection = createPeerConnection();

      // Step 2: Create SDP offer describing our media capabilities
      const offer = await peerConnection.createOffer();
      
      // Step 3: Set as local description (starts ICE candidate gathering)
      await peerConnection.setLocalDescription(offer);

      // Step 4: Send offer to peer via signaling server
      socketRef.current.emit('offer', { offer, roomId });
    } catch (err) {
      console.error('Error creating offer:', err);
      setError('Failed to create connection offer.');
    }
  };

  /**
   * Handles incoming WebRTC offer from peer and creates an answer
   * This is called by the room creator when the joiner sends an offer
   * @async
   * @param {RTCSessionDescriptionInit} offer - The SDP offer from the peer
   */
  const handleOffer = async (offer) => {
    try {
      setConnectionStatus('Received offer. Creating answer...');
      
      // Step 1: Create peer connection
      const peerConnection = createPeerConnection();

      // Step 2: Set remote description from the offer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Step 3: Create answer to the offer
      const answer = await peerConnection.createAnswer();
      
      // Step 4: Set answer as our local description
      await peerConnection.setLocalDescription(answer);

      // Step 5: Send answer back via signaling server
      socketRef.current.emit('answer', { answer, roomId });
    } catch (err) {
      console.error('Error handling offer:', err);
      setError('Failed to handle connection offer.');
    }
  };

  /**
   * Handles incoming WebRTC answer from peer
   * Completes the connection establishment process
   * @async
   * @param {RTCSessionDescriptionInit} answer - The SDP answer from the peer
   */
  const handleAnswer = async (answer) => {
    try {
      setConnectionStatus('Received answer. Finalizing connection...');
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (err) {
      console.error('Error handling answer:', err);
      setError('Failed to handle connection answer.');
    }
  };

  /**
   * Handles incoming ICE candidate from peer
   * ICE candidates are used for NAT traversal to establish peer-to-peer connection
   * @async
   * @param {RTCIceCandidateInit} candidate - The ICE candidate from the peer
   */
  const handleIceCandidate = async (candidate) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    cleanup();
    navigate('/');
  };

  /**
   * Cleans up all resources including media tracks, peer connection, and socket
   * Called when ending the call or component unmounts
   */
  const cleanup = () => {
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('leave-room', roomId);
      socketRef.current.disconnect();
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="video-call-container">
      <div className="header">
        <div className="room-info">
          <span className="room-label">Room ID:</span>
          <span className="room-id">{roomId}</span>
          <button className="copy-btn" onClick={copyRoomId}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className={`status ${connectionStatus.toLowerCase().replace(' ', '-')}`}>
          Status: {connectionStatus}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button className="close-error" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}

      <div className="video-grid">
        <div className="video-container local">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video"
          />
          <div className="video-label">You</div>
          {!isVideoEnabled && <div className="video-off-overlay">Video Off</div>}
        </div>

        <div className="video-container remote">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video"
          />
          <div className="video-label">
            {remoteStream ? 'Remote User' : 'Waiting for participant...'}
          </div>
          {!remoteStream && (
            <div className="waiting-overlay">
              <div className="spinner"></div>
              <p>{isCreator ? 'Share the Room ID to invite someone' : 'Connecting...'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="controls">
        <button
          className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
          onClick={toggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>

        <button
          className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
          onClick={toggleVideo}
          title={isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
        >
          {isVideoEnabled ? '📹' : '📷'}
        </button>

        <button className="control-btn end-call" onClick={endCall} title="End Call">
          📞
        </button>
      </div>
    </div>
  );
}

export default VideoCall;
