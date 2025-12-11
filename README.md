# WebRTC Video Call Application

A peer-to-peer video calling application built with React and WebRTC that allows two users to connect and communicate via video and audio in real-time.

## Features

✅ **Core Features**
- Create unique video call rooms
- Join existing rooms using Room ID
- Real-time video and audio streaming
- Peer-to-peer WebRTC connection
- Mute/Unmute microphone
- Turn video on/off
- End call functionality
- Copy Room ID to clipboard
- Connection status indicator
- Responsive UI design
- Comprehensive error handling

## Technologies Used

### Frontend
- **React 18** with Hooks
- **React Router** for navigation
- **Socket.io Client** for real-time communication
- **WebRTC API** for peer-to-peer connections
- **UUID** for generating unique room IDs
- **Tailwind CSS** for styling

### Backend
- **Node.js** with Express
- **Socket.io** for signaling server
- **CORS** for cross-origin requests

### WebRTC Configuration
- **STUN Server**: `stun:stun.l.google.com:19302`

## Project Structure

```
Video call assignment/
├── client/                    # React frontend application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.js       # Home page component
│   │   │   ├── Home.css
│   │   │   ├── VideoCall.js  # Video call component with WebRTC logic
│   │   │   └── VideoCall.css
│   │   ├── App.js            # Main app component with routing
│   │   ├── App.css
│   │   ├── index.js          # React entry point
│   │   └── index.css
│   └── package.json
├── server/                    # Node.js signaling server
│   ├── server.js             # Socket.io signaling server
│   └── package.json
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser with WebRTC support (Chrome, Firefox, Safari, Edge)

### Step 1: Clone or Download the Project

```bash
cd "Video call assignment"
```

### Step 2: Install Server Dependencies

```bash
cd server
npm install
```

### Step 3: Install Client Dependencies

```bash
cd ../client
npm install
```

### Step 4: Environment Configuration (Optional)

The application uses environment variables for configuration. Default values work for local development, but you can customize them:

**Client Configuration:**
```bash
cd client
cp .env.example .env
# Edit .env to change REACT_APP_SOCKET_SERVER_URL if needed
```

**Server Configuration:**
```bash
cd server
cp .env.example .env
# Edit .env to change PORT or CORS_ORIGIN if needed
```

## Running the Application

You need to run both the server and client simultaneously.

### Terminal 1: Start the Signaling Server

```bash
cd server
npm start
```

The server will start on `http://localhost:5000`

### Terminal 2: Start the React Client

```bash
cd client
npm start
```

The client will start on `http://localhost:3000` and automatically open in your browser.

## How to Use

### Creating a Room

1. Open the application in your browser (`http://localhost:3000`)
2. Click the **"Create Room"** button
3. Grant camera and microphone permissions when prompted
4. You'll see your local video feed
5. Copy the Room ID displayed at the top
6. Share the Room ID with the person you want to call

### Joining a Room

1. Open the application in another browser window/tab or on another device
2. Enter the Room ID you received
3. Click **"Join Room"**
4. Grant camera and microphone permissions when prompted
5. The connection will be established automatically

### During the Call

- **Mute/Unmute**: Click the microphone button (🎤/🔇)
- **Video On/Off**: Click the video button (📹/📷)
- **End Call**: Click the red phone button (📞)
- **Copy Room ID**: Click the "Copy" button next to the Room ID

## Architecture

### WebRTC Connection Flow

```
User A (Creator)                 Signaling Server              User B (Joiner)
     |                                  |                             |
     |------ create-room -------------->|                             |
     |<----- room-created --------------|                             |
     |                                  |                             |
     |                                  |<----- join-room ------------|
     |<----- user-joined ---------------|------- room-joined -------->|
     |                                  |                             |
     |                                  |<----- offer ----------------|
     |<----- offer ---------------------|                             |
     |                                  |                             |
     |------ answer ------------------->|                             |
     |                                  |------- answer ------------->|
     |                                  |                             |
     |<===== ICE Candidates Exchange ==|===== ICE Candidates =======>|
     |                                  |                             |
     |<========== Peer-to-Peer Connection Established =============>|
     |                                  |                             |
     |<========== Audio/Video Streaming ==========================>|
```

### Key Components

#### 1. Signaling Server (`server/server.js`)
- Manages room creation and user assignment
- Facilitates exchange of SDP offers and answers
- Handles ICE candidate exchange
- Manages user disconnections
- Maintains active room state

#### 2. Home Component (`client/src/components/Home.js`)
- Landing page interface
- Room creation with UUID generation
- Room joining with validation
- User instructions

#### 3. VideoCall Component (`client/src/components/VideoCall.js`)
- WebRTC peer connection management
- Media stream handling (getUserMedia)
- Socket.io client integration
- UI controls for audio/video
- Connection state management
- Error handling

## Socket Events Documentation

### Client to Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | `roomId` (string) | Create a new room with specified ID |
| `join-room` | `roomId` (string) | Join an existing room |
| `offer` | `{ offer, roomId }` | Send WebRTC offer to peer |
| `answer` | `{ answer, roomId }` | Send WebRTC answer to peer |
| `ice-candidate` | `{ candidate, roomId }` | Send ICE candidate to peer |
| `leave-room` | `roomId` (string) | Leave the current room |

### Server to Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `room-created` | `{ roomId }` | Room successfully created |
| `room-joined` | `{ roomId }` | Successfully joined room |
| `room-exists` | `{ error }` | Room ID already exists |
| `room-not-found` | `{ error }` | Room doesn't exist |
| `room-full` | `{ error }` | Room already has 2 participants |
| `user-joined` | `{ userId }` | Another user joined the room |
| `offer` | `{ offer, from }` | Received WebRTC offer from peer |
| `answer` | `{ answer, from }` | Received WebRTC answer from peer |
| `ice-candidate` | `{ candidate, from }` | Received ICE candidate from peer |
| `user-disconnected` | - | The other user disconnected |

## WebRTC Implementation Details

### ICE Servers Configuration

```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
```

### Media Constraints

```javascript
{
  video: true,
  audio: true
}
```

### Connection States

- **Initializing**: Setting up media devices
- **Waiting**: Room created, waiting for peer
- **Connecting**: Establishing WebRTC connection
- **Connected**: Peer-to-peer connection active
- **Disconnected**: Peer disconnected
- **Failed**: Connection failed

## Error Handling

The application handles various error scenarios:

- Camera/microphone permission denied
- Room not found
- Room already full
- Invalid Room ID
- Connection failures
- Network issues
- Peer disconnection

## Browser Compatibility

- ✅ Chrome/Chromium (Recommended)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ✅ Edge
- ❌ Internet Explorer (Not supported)

## Security Considerations

- WebRTC connections are encrypted by default
- Room IDs are UUID v4 (cryptographically random)
- No media data passes through the server (peer-to-peer)
- STUN servers only help with NAT traversal

## Troubleshooting

### Camera/Microphone not working
- Check browser permissions
- Ensure no other application is using the devices
- Try using HTTPS (some browsers require it)

### Cannot connect to peer
- Check if both users are on the same network or behind restrictive NATs
- TURN server may be needed for some network configurations

### Video freezing or lagging
- Check network bandwidth
- Close other bandwidth-intensive applications
- Try a different browser

## Development

### Running in Development Mode

**Server:**
```bash
cd server
npm run dev  # Uses nodemon for auto-restart
```

**Client:**
```bash
cd client
npm start
```