import { randomUUID } from "crypto";

type MemberRole = "owner" | "admin" | "member" | "viewer";

interface TeamMember {
  userId: string;
  role: MemberRole;
  joinedAt: Date;
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: Date;
}

const teams = new Map<string, Team>();

export function createTeam(name: string, ownerId: string): Team {
  if (!name || !name.trim()) {
    throw new Error("Team name is required");
  }

  const team: Team = {
    id: randomUUID(),
    name: name.trim(),
    ownerId,
    members: [
      {
        userId: ownerId,
        role: "owner",
        joinedAt: new Date(),
      },
    ],
    createdAt: new Date(),
  };

  teams.set(team.id, team);
  return team;
}

export function getTeam(id: string): Team | undefined {
  return teams.get(id);
}

export function listTeams(): Team[] {
  return Array.from(teams.values());
}

export function deleteTeam(id: string): boolean {
  return teams.delete(id);
}

export function addMember(
  teamId: string,
  userId: string,
  role: MemberRole = "member"
): TeamMember {
  const team = teams.get(teamId);
  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  const existing = team.members.find((m) => m.userId === userId);
  if (existing) {
    throw new Error(`User ${userId} is already a member of this team`);
  }

  const member: TeamMember = {
    userId,
    role,
    joinedAt: new Date(),
  };
  team.members.push(member);
  return member;
}

export function removeMember(teamId: string, userId: string): boolean {
  const team = teams.get(teamId);
  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  if (team.ownerId === userId) {
    throw new Error("Cannot remove the team owner");
  }

  const index = team.members.findIndex((m) => m.userId === userId);
  if (index === -1) return false;

  team.members.splice(index, 1);
  return true;
}

export function updateMemberRole(
  teamId: string,
  userId: string,
  role: MemberRole
): TeamMember {
  const team = teams.get(teamId);
  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  const member = team.members.find((m) => m.userId === userId);
  if (!member) {
    throw new Error(`User ${userId} is not a member of this team`);
  }

  if (team.ownerId === userId && role !== "owner") {
    throw new Error("Cannot change the owner's role");
  }

  member.role = role;
  return member;
}

export function getTeamMembers(teamId: string): TeamMember[] {
  const team = teams.get(teamId);
  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }
  return team.members;
}

export function getTeamsForUser(userId: string): Team[] {
  return Array.from(teams.values()).filter((t) =>
    t.members.some((m) => m.userId === userId)
  );
}
