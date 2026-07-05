import { Notification, type NotificationType } from '../models/Notification.js';
import { getIO } from '../sockets/io.js';

interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/** Persist a notification and push it to the user's live sockets. */
export async function createNotification(userId: string, input: NotifyInput) {
  const doc = await Notification.create({ user: userId, ...input });
  const io = getIO();
  io?.of('/app').to(`user:${userId}`).emit('notification', {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    body: doc.body,
    link: doc.link,
    read: false,
    createdAt: doc.createdAt,
  });
  return doc;
}
