# WebRTC Video Call Application Assignment

## Project Overview
Build a peer-to-peer video calling application using React and WebRTC that allows two users to connect and communicate via video and audio.

## Objective
Develop a real-time video calling application where users can create a video call room, join an existing room using a room ID, establish peer-to-peer connection between two users, stream video and audio between participants, and control audio or video settings during the call.

## Technical Requirements

### Core Technologies
- Frontend Framework: React with hooks
- WebRTC: For peer-to-peer video and audio streaming
- Signaling Server: use any signaling mechanism
- Styling: CSS or Tailwind CSS or Material-UI

### Additional Libraries and Tools
- socket.io-client for client-side real-time communication
- uuid optional for generating unique room IDs
- STUN and TURN servers use public STUN servers for NAT traversal
- Example STUN server: stun:stun.l.google.com:19302

## Functional Requirements

### User Interface

#### Home Page
- Button to Create Room
- Input field and button to Join Room with room ID
- Display instructions for using the application

#### Video Call Page
- Display local video showing user's own camera
- Display remote video showing other participant's camera
- Show room ID with copy-to-clipboard functionality
- Control buttons for mute or unmute microphone, turn video on or off, end call or leave room
- Display connection status like connecting, connected, or disconnected

### Core Features

#### Create Room Feature
- Generate a unique room ID when user clicks Create Room
- Request camera and microphone permissions
- Display local video stream
- Wait for another user to join
- Display the room ID prominently for sharing

#### Join Room Feature
- Accept room ID input from user
- Validate room ID exists
- Request camera and microphone permissions
- Establish WebRTC connection with the room creator
- Display both local and remote video streams

#### WebRTC Connection
- Implement proper WebRTC peer connection flow
- Exchange SDP offers and answers
- Exchange ICE candidates
- Establish peer-to-peer connection
- Handle connection states: new, connecting, connected, disconnected, failed

#### Media Controls
- Mute or Unmute to toggle audio track on or off
- Video On or Off to toggle video track on or off
- End Call to stop all media tracks, close peer connection, disconnect from signaling server, and return to home page

### Signaling Server Requirements
- Candidates are free to use any signaling mechanism they prefer (Socket.io, WebSockets, HTTP polling, Firebase Realtime Database, PeerJS, or any other real-time communication method)
- The signaling solution must handle the following exchanges between peers:
  - Room creation and user assignment
  - Room joining functionality
  - SDP offer forwarding to the other peer
  - SDP answer forwarding to the other peer
  - ICE candidate exchange between peers
  - User disconnection handling
- Implement room management to track active rooms and participants
- Note: While Socket.io with Node.js is recommended for simplicity, candidates can choose any technology stack they are comfortable with for signaling

## Technical Implementation Guidelines

### WebRTC Flow

#### Initiator Room Creator
- Create RTCPeerConnection
- Add local media tracks
- Wait for joiner

#### Joiner
- Create RTCPeerConnection
- Add local media tracks
- Create and send offer
- Wait for answer

#### ICE Candidate Exchange
- Both peers exchange ICE candidates through signaling server
- Add received candidates to peer connection

#### Media Streaming
- Handle ontrack event to receive remote stream
- Display remote video in video element

### Error Handling
- Handle camera or microphone permission denials
- Handle network connection failures
- Handle peer disconnection scenarios
- Display user-friendly error messages

## Deliverables

### Source Code
- React application for frontend
- Signaling server for backend
- README.md with setup instructions
- Package.json with all dependencies

### Documentation
- Setup and installation guide
- How to run the application locally
- Architecture explanation
- API and Socket events documentation

### Features Checklist
- Room creation with unique ID
- Room joining functionality
- Local video stream display
- Remote video stream display
- Audio mute and unmute
- Video on and off toggle
- End call functionality
- Copy room ID feature
- Connection status indicator
- Responsive UI design
- Error handling

## Bonus Features Optional
- Screen sharing capability
- Chat functionality alongside video
- Support for more than 2 participants
- Recording functionality
- Background blur or replacement
- Network quality indicator
- Reconnection logic on connection drop

## Evaluation Criteria

### Code Quality 30 percent
- Clean, readable, and well-organized code
- Proper component structure
- Meaningful variable and function names
- Code comments where necessary

### Functionality 40 percent
- All core features working correctly
- Proper WebRTC implementation
- Stable peer-to-peer connection
- Reliable signaling mechanism

### User Experience 20 percent
- Intuitive and responsive UI
- Smooth user flow
- Proper error messages and feedback
- Loading states and indicators

### Documentation 10 percent
- Clear setup instructions
- Well-documented code
- Architecture explanation

## Submission Guidelines
- Host code on GitHub as public or private repository
- Include comprehensive README.md
- Provide clear instructions to run locally
- Optional: Deploy to Heroku or Vercel or Netlify and provide live demo link

## Resources

### WebRTC Documentation
- https://webrtc.org/getting-started/overview
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API

### Socket.io Documentation
- https://socket.io/docs/v4/

### React Documentation
- https://react.dev/

## Time Estimate
Recommended Duration: 2 to 3 days.

## Questions
If you have any questions about the requirements or need clarification, please reach out before starting the assignment.

Good luck with your assignment!