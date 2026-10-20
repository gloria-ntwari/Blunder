/**
 * Socket.io event initialiser
 * Rooms: user:<userId>, track:<track>, mentor_group:<id>
 */
export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Client sends their userId after connecting for auth
    socket.on('join', ({ userId, track, mentorGroupId }) => {
      if (userId) socket.join(`user:${userId}`);
      if (track) socket.join(`track:${track}`);
      if (mentorGroupId) socket.join(`mentor_group:${mentorGroupId}`);
      socket.join('all'); // everyone
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emit a snack alert to all connected clients
 */
export const emitSnackAlert = (io, alert) => {
  io.to('all').emit('snack_alert', alert);
};

/**
 * Emit a new announcement to the appropriate room
 */
export const emitAnnouncement = (io, announcement) => {
  const { scope, target_track, target_mentor_group_id } = announcement;
  if (scope === 'school_wide') {
    io.to('all').emit('new_announcement', announcement);
  } else if (scope === 'academic_track' && target_track) {
    io.to(`track:${target_track}`).emit('new_announcement', announcement);
  } else if (scope === 'mentor_group' && target_mentor_group_id) {
    io.to(`mentor_group:${target_mentor_group_id}`).emit('new_announcement', announcement);
  }
};

/**
 * Emit a private notification to a specific user
 */
export const emitNotification = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * Emit a new event to relevant rooms
 */
export const emitEvent = (io, event) => {
  const { scope, target_track, target_mentor_group_id } = event;
  if (scope === 'school') {
    io.to('all').emit('new_event', event);
  } else if (scope === 'academic' && target_track) {
    io.to(`track:${target_track}`).emit('new_event', event);
  } else if (scope === 'mentor_group' && target_mentor_group_id) {
    io.to(`mentor_group:${target_mentor_group_id}`).emit('new_event', event);
  }
};
