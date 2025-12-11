# Testing Guide for WebRTC Video Call Application

## Important Testing Notes

### ⚠️ How to Test Properly

This application is designed for **2 different users** to connect. Here are the correct ways to test:

#### ✅ Option 1: Two Different Browsers (Recommended)
1. **Browser 1** (e.g., Chrome): Create a room
2. **Browser 2** (e.g., Firefox): Join the room with the Room ID

#### ✅ Option 2: Incognito/Private Window
1. **Normal Window**: Create a room
2. **Incognito/Private Window** (same browser): Join the room with the Room ID

#### ✅ Option 3: Two Different Devices
1. **Device 1** (e.g., laptop): Create a room
2. **Device 2** (e.g., phone/tablet): Join with the Room ID
   - Make sure both devices are on the same network or accessible
   - Use your computer's IP address instead of `localhost` on mobile

### ❌ What NOT to Do

**DON'T open the same room in multiple tabs of the same browser**
- Each tab gets a different socket connection
- The server sees them as different users
- You'll get "Room is full" error because only 2 participants are allowed

## Step-by-Step Testing Instructions

### Test 1: Basic Room Creation and Joining

1. **Start the application**
   ```bash
   # Terminal 1 - Server
   cd server
   npm start
   
   # Terminal 2 - Client
   cd client
   npm start
   ```

2. **User A - Create Room**
   - Open Chrome: http://localhost:3000
   - Click "Create Room"
   - Grant camera/mic permissions
   - Copy the Room ID (click "Copy" button)
   - You should see your own video

3. **User B - Join Room**
   - Open Firefox: http://localhost:3000
   - Paste the Room ID in the input field
   - Click "Join Room"
   - Grant camera/mic permissions
   - Both users should now see each other!

### Test 2: Media Controls

Once connected, test each control:

- **Mute/Unmute**: Click the microphone button
  - The icon should change between 🎤 and 🔇
  - The other person shouldn't hear you when muted

- **Video On/Off**: Click the video button
  - The icon should change between 📹 and 📷
  - Your video should show "Video Off" overlay when disabled

- **End Call**: Click the red phone button
  - Should return to home page
  - Other user should see "User disconnected"

### Test 3: Connection Status

Watch the connection status indicator:
- "Initializing..." → Setting up
- "Requesting camera..." → Getting permissions
- "Media devices ready" → Camera/mic ready
- "Waiting for someone to join..." → Room created, waiting
- "Connecting..." → Establishing connection
- "Connected" → Successfully connected

### Test 4: Error Handling

**Test Room Not Found**
- User B enters a random Room ID
- Should show error: "Room not found"

**Test Room Full**
- User A creates room, User B joins
- User C tries to join the same room
- Should show error: "Room is full"

**Test Camera/Mic Denied**
- Deny camera/mic permissions
- Should show error message

## Common Issues and Solutions

### Issue: "Room already exists"
**Solution**: This happens if you try to create a room with a UUID that exists
- Simply click "Create Room" again (generates new UUID)
- Or restart the server to clear all rooms

### Issue: "Room is full"
**Solution**: Only 2 users can be in a room
- Make sure you're not opening multiple tabs
- Check if someone else is already in the room
- Create a new room instead

### Issue: Video not showing
**Solution**:
- Check browser permissions (camera icon in address bar)
- Close other apps using camera (Zoom, Teams, etc.)
- Try refreshing the page
- Check browser console for errors (F12)

### Issue: Can't connect between devices
**Solution**:
- Both devices must be able to reach the server
- On mobile, use your computer's local IP instead of localhost
  - Example: http://192.168.1.100:3000 (find your IP with `ifconfig` or `ipconfig`)
- Make sure firewall allows connections on ports 3000 and 5000

### Issue: Connection stuck on "Connecting..."
**Solution**:
- Check that STUN servers are accessible
- Some corporate networks block WebRTC
- Try on a different network
- Check browser console for errors

## Testing Checklist

Before submitting, verify all features work:

- [ ] Create room successfully
- [ ] Copy Room ID works
- [ ] Join room with valid Room ID
- [ ] See your own video (local feed)
- [ ] See other person's video (remote feed)
- [ ] Audio works (other person can hear you)
- [ ] Mute/unmute button works
- [ ] Video on/off button works
- [ ] End call returns to home
- [ ] Connection status updates correctly
- [ ] Error for invalid Room ID
- [ ] Error for full room
- [ ] Error for camera/mic denied
- [ ] Responsive design (test on mobile)

## Advanced Testing

### Test Network Conditions
- Try on different networks (WiFi, mobile data)
- Test with users in different locations
- Monitor browser console for ICE candidates

### Test Edge Cases
- Refresh page during call
- Close browser tab during call
- Disconnect internet briefly
- Switch between tabs

## Server Console Output

Watch the server console for debugging:
```
User connected: <socket-id>
Room created: <room-id> by <socket-id>
User <socket-id> joined room: <room-id>
Offer sent from <socket-id> to <socket-id>
Answer sent from <socket-id> to <socket-id>
User disconnected: <socket-id>
Room <room-id> deleted
```

## Browser Console Debugging

Open browser console (F12) to see:
- Connection state changes
- Media device access logs
- WebRTC connection logs
- Socket events
- Any errors

## Performance Tips

For smooth video calls:
- Use Chrome or Firefox (best WebRTC support)
- Close unnecessary tabs/applications
- Ensure good network bandwidth
- Keep distance from router reasonable
- Use wired connection if possible

Happy Testing! 🎉
