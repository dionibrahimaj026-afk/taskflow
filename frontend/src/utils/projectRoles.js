/**
 * Project roles: owner (full control), editor (edit tasks/project), viewer (read-only)
 * Handles both legacy format (members: [User]) and new format (members: [{ user, role }])
 */

export function getProjectRole(project, userId) {
  if (!project || !userId) return null;
  const uid = String(userId);

  if (project.createdBy && String(project.createdBy?._id ?? project.createdBy) === uid) {
    return 'owner';
  }

  const members = project.members || [];
  for (const m of members) {
    const memberId = m?.user?._id ?? m?.user ?? m?._id ?? m;
    if (memberId && String(memberId) === uid) {
      return m.role || 'editor';
    }
  }
  return null;
}

export function canEditProject(project, userId) {
  const role = getProjectRole(project, userId);
  return role === 'owner' || role === 'editor';
}

export function canManageMembers(project, userId) {
  return getProjectRole(project, userId) === 'owner';
}

export function canDeleteProject(project, userId) {
  return canEditProject(project, userId);
}

export function canPermanentDeleteProject(project, userId) {
  return getProjectRole(project, userId) === 'owner';
}

export function hasProjectAccess(project, userId) {
  return getProjectRole(project, userId) != null;
}
