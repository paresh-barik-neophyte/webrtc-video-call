import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import io from 'socket.io-client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Free TURN server for better NAT traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
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
    const stream = localVideoRef.current?.srcObject;
    if (stream) {
      console.log('Adding local tracks to peer connection:', stream.getTracks().length);
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
        console.log('Added track:', track.kind);
      });
    } else {
      console.error('No local stream available!');
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
        console.log('Generated ICE candidate:', event.candidate.type);
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          roomId,
        });
        console.log('Sent ICE candidate to server');
      } else {
        console.log('All ICE candidates have been sent');
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

    // Add ICE connection state logging
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
    };

    // Add ICE gathering state logging
    peerConnection.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', peerConnection.iceGatheringState);
    };

    // Add signaling state logging
    peerConnection.onsignalingstatechange = () => {
      console.log('Signaling state:', peerConnection.signalingState);
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
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col p-5">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
        <div className="flex items-center gap-2.5 bg-white/10 px-5 py-3 rounded-[10px] text-white">
          <span className="font-semibold text-[#b8b8b8]">Room ID:</span>
          <span className="font-mono bg-white/10 px-2.5 py-1 rounded-[5px] text-sm">{roomId}</span>
          <button 
            className="bg-primary text-white border-none px-4 py-2 rounded-[5px] cursor-pointer text-sm transition-all duration-300 hover:bg-[#5568d3]" 
            onClick={copyRoomId}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className={`px-5 py-3 rounded-[10px] font-semibold text-white ${
          connectionStatus.toLowerCase() === 'connected' ? 'bg-green-600/20 text-green-400' :
          connectionStatus.toLowerCase().includes('connecting') || connectionStatus.toLowerCase().includes('initializing') ? 'bg-yellow-500/20 text-yellow-400' :
          connectionStatus.toLowerCase().includes('disconnected') || connectionStatus.toLowerCase().includes('failed') ? 'bg-red-600/20 text-red-400' :
          'bg-white/10'
        }`}>
          Status: {connectionStatus}
        </div>
      </div>

      {error && (
        <div className="bg-red-600 text-white px-5 py-4 rounded-[10px] mb-5 flex justify-between items-center">
          {error}
          <button 
            className="bg-white/20 border-none text-white text-2xl cursor-pointer w-[30px] h-[30px] rounded-full flex items-center justify-center p-0 hover:bg-white/30" 
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 mb-5">
        <div className="relative bg-black rounded-[15px] overflow-hidden aspect-video shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            You
          </div>
          {!isVideoEnabled && (
            <div className="absolute top-0 left-0 w-full h-full bg-black/80 flex items-center justify-center text-white text-xl">
              Video Off
            </div>
          )}
        </div>

        <div className="relative bg-black rounded-[15px] overflow-hidden aspect-video shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            {remoteStream ? 'Remote User' : 'Waiting for participant...'}
          </div>
          {!remoteStream && (
            <div className="absolute top-0 left-0 w-full h-full bg-black/80 flex flex-col items-center justify-center text-white">
              <div className="w-[50px] h-[50px] border-4 border-white/30 border-t-primary rounded-full animate-spin mb-5"></div>
              <p className="text-center px-5">{isCreator ? 'Share the Room ID to invite someone' : 'Connecting...'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-5 p-5 bg-white/5 rounded-[15px]">
        <button
          className={`w-[60px] h-[60px] border-none rounded-full text-3xl cursor-pointer transition-all duration-300 flex items-center justify-center ${
            !isAudioEnabled ? 'bg-red-600/30 hover:bg-red-600/40' : 'bg-white/10 hover:bg-white/20'
          } text-white hover:scale-110`}
          onClick={toggleAudio}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>

        <button
          className={`w-[60px] h-[60px] border-none rounded-full text-3xl cursor-pointer transition-all duration-300 flex items-center justify-center ${
            !isVideoEnabled ? 'bg-red-600/30 hover:bg-red-600/40' : 'bg-white/10 hover:bg-white/20'
          } text-white hover:scale-110`}
          onClick={toggleVideo}
          title={isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
        >
          {isVideoEnabled ? '📹' : '📷'}
        </button>

        <button 
          className="w-[60px] h-[60px] border-none rounded-full text-3xl cursor-pointer bg-red-600 text-white transition-all duration-300 flex items-center justify-center hover:bg-red-700 hover:scale-110" 
          onClick={endCall} 
          title="End Call"
        >
          📞
        </button>
      </div>
    </div>
  );
}

export default VideoCall;
