const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store active rooms and their participants
const rooms = new Map();

// Store socket to room mapping for easy cleanup
const socketRooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('create-room', (roomId) => {
    // Clean up any existing rooms this socket might have created
    const existingRoomId = socketRooms.get(socket.id);
    if (existingRoomId && existingRoomId !== roomId) {
      rooms.delete(existingRoomId);
      console.log(`Cleaned up old room ${existingRoomId} for socket ${socket.id}`);
    }
    
    const existingRoom = rooms.get(roomId);
    
    // If room exists but has no active users, clean it up and recreate
    if (existingRoom && !existingRoom.creator && !existingRoom.joiner) {
      rooms.delete(roomId);
      console.log(`Cleaned up empty room ${roomId}`);
    }
    
    // If room exists with active users and different creator, reject
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      // Allow if it's the same socket reconnecting
      if (room.creator === socket.id) {
        socket.join(roomId);
        socket.emit('room-created', { roomId });
        console.log(`Room ${roomId} rejoined by creator ${socket.id}`);
        return;
      }
      socket.emit('room-exists', { error: 'Room already exists' });
      return;
    }

    // Create new room
    rooms.set(roomId, { creator: socket.id, joiner: null });
    socketRooms.set(socket.id, roomId);
    socket.join(roomId);
    socket.emit('room-created', { roomId });
    console.log(`Room created: ${roomId} by ${socket.id}`);
  });

  // Join an existing room
  socket.on('join-room', (roomId) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('room-not-found', { error: 'Room does not exist' });
      return;
    }

    // If this socket is already the creator, don't let them join as joiner
    if (room.creator === socket.id) {
      socket.emit('room-full', { error: 'You are already in this room as creator' });
      return;
    }

    // If joiner exists and it's the same socket, allow reconnection
    if (room.joiner === socket.id) {
      socket.join(roomId);
      socket.emit('room-joined', { roomId });
      console.log(`User ${socket.id} rejoined room: ${roomId}`);
      return;
    }

    // If joiner exists and it's a different socket, room is full
    if (room.joiner && room.joiner !== socket.id) {
      socket.emit('room-full', { error: 'Room is full' });
      return;
    }

    // Join as new joiner
    room.joiner = socket.id;
    socketRooms.set(socket.id, roomId);
    socket.join(roomId);
    
    // Notify the creator that someone joined
    socket.to(room.creator).emit('user-joined', { userId: socket.id });
    socket.emit('room-joined', { roomId });
    
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // Forward WebRTC offer
  socket.on('offer', ({ offer, roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Send offer to the other user in the room
    const targetId = room.creator === socket.id ? room.joiner : room.creator;
    if (targetId) {
      io.to(targetId).emit('offer', { offer, from: socket.id });
      console.log(`Offer sent from ${socket.id} to ${targetId}`);
    }
  });

  // Forward WebRTC answer
  socket.on('answer', ({ answer, roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Send answer to the other user in the room
    const targetId = room.creator === socket.id ? room.joiner : room.creator;
    if (targetId) {
      io.to(targetId).emit('answer', { answer, from: socket.id });
      console.log(`Answer sent from ${socket.id} to ${targetId}`);
    }
  });

  // Forward ICE candidates
  socket.on('ice-candidate', ({ candidate, roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Send ICE candidate to the other user in the room
    const targetId = room.creator === socket.id ? room.joiner : room.creator;
    if (targetId) {
      io.to(targetId).emit('ice-candidate', { candidate, from: socket.id });
      console.log(`ICE candidate sent from ${socket.id} to ${targetId}`);
    }
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Clean up socket room mapping
    socketRooms.delete(socket.id);

    // Find and clean up rooms where this user was present
    for (const [roomId, room] of rooms.entries()) {
      if (room.creator === socket.id || room.joiner === socket.id) {
        // Notify the other user
        const otherUser = room.creator === socket.id ? room.joiner : room.creator;
        if (otherUser) {
          io.to(otherUser).emit('user-disconnected');
        }
        
        // Remove the room
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted`);
      }
    }
  });

  // Handle explicit leave room
  socket.on('leave-room', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;

    // Notify the other user
    const otherUser = room.creator === socket.id ? room.joiner : room.creator;
    if (otherUser) {
      io.to(otherUser).emit('user-disconnected');
    }

    // Remove the room
    rooms.delete(roomId);
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
