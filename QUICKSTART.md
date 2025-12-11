# Quick Start Guide

## Installation (One-time setup)

Run these commands once to install all dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## Running the Application

### Option 1: Using Two Terminals (Recommended)

**Terminal 1 - Start Server:**
```bash
cd server
npm start
```
Wait for "Signaling server running on port 5000"

**Terminal 2 - Start Client:**
```bash
cd client
npm start
```
The app will open automatically in your browser at http://localhost:3000

### Option 2: Testing with Multiple Browsers

1. Start the server and client as shown above
2. Open http://localhost:3000 in Chrome
3. Click "Create Room" and copy the Room ID
4. Open http://localhost:3000 in Firefox (or another Chrome window/incognito)
5. Paste the Room ID and click "Join Room"
6. Grant camera/mic permissions in both browsers
7. You should now see both video feeds!

## Troubleshooting

**Port already in use?**
- Kill the process using port 5000: `lsof -ti:5000 | xargs kill -9`
- Kill the process using port 3000: `lsof -ti:3000 | xargs kill -9`

**Camera not working?**
- Check browser permissions (usually shows icon in address bar)
- Close other apps using camera (Zoom, Teams, etc.)

**Cannot connect?**
- Make sure both server and client are running
- Check console for errors (F12 in browser)
- Try refreshing the page

## Testing Checklist

- [ ] Create a room successfully
- [ ] Copy Room ID works
- [ ] Join room with valid ID
- [ ] See your own video (local)
- [ ] See other person's video (remote)
- [ ] Mute/unmute audio works
- [ ] Turn video on/off works
- [ ] End call returns to home page
- [ ] Connection status shows correct state

Enjoy testing your WebRTC Video Call application! 🎉
