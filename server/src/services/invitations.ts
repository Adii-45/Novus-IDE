import { Invitation } from '../models/Invitation.js';
import { Project } from '../models/Project.js';
import type { IUser } from '../models/User.js';
import { createNotification } from './notify.js';

/**
 * When a user registers (or signs in via OAuth for the first time), attach
 * them to any projects they were invited to by email.
 */
export async function claimInvitations(user: IUser) {
  const invites = await Invitation.find({ email: user.email, status: 'pending' });
  for (const invite of invites) {
    const project = await Project.findById(invite.project);
    if (!project) continue;
    const already = project.members.some((m) => String(m.user) === String(user._id));
    if (!already && String(project.owner) !== String(user._id)) {
      project.members.push({ user: user._id as never, role: invite.role, addedAt: new Date() });
      await project.save();
    }
    invite.status = 'accepted';
    await invite.save();
    await createNotification(String(user._id), {
      type: 'invite',
      title: `You joined ${project.name}`,
      body: 'An invitation was waiting for you and has been accepted automatically.',
      link: `/ide/${project._id}`,
    });
  }
}
