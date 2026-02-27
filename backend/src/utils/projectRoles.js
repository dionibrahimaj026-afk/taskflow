/** Project roles: owner (full control), editor (edit tasks/project), viewer (read-only) */

/**
 * Get a user's role in a project.
 * Handles both legacy format (members: [ObjectId]) and new format (members: [{ user, role }]).
 * @param {Object} project - Project doc (may have populated createdBy, members)
 * @param {string} userId - User ID to check
 * @returns {'owner'|'editor'|'viewer'|null}
 */
export function getProjectRole(project, userId) {
  if (!project || !userId) return null;
  const uid = String(userId);

  if (project.createdBy && String(project.createdBy._id ?? project.createdBy) === uid) {
    return 'owner';
  }

  const members = project.members || [];
  for (const m of members) {
    const memberId = m?.user?._id ?? m?.user ?? m?._id ?? m;
    if (memberId && String(memberId) === uid) {
      return (m.role && m.role !== 'owner') ? m.role : 'editor';
    }
  }
  return null;
}

/** Check if user can edit project (owner or editor) */
export function canEditProject(project, userId) {
  const role = getProjectRole(project, userId);
  return role === 'owner' || role === 'editor';
}

/** Check if user can manage members (owner only) */
export function canManageMembers(project, userId) {
  return getProjectRole(project, userId) === 'owner';
}

/** Check if user can delete project (owner or editor) */
export function canDeleteProject(project, userId) {
  return canEditProject(project, userId);
}

/** Check if user can permanently delete project (owner only) */
export function canPermanentDeleteProject(project, userId) {
  return getProjectRole(project, userId) === 'owner';
}

/** Check if user can create/edit/delete tasks (owner or editor) */
export function canEditTasks(project, userId) {
  return canEditProject(project, userId);
}

/** Check if user has any access (owner, editor, or viewer) */
export function hasProjectAccess(project, userId) {
  return getProjectRole(project, userId) != null;
}
