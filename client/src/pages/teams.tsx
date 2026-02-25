import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Crown,
  Shield,
  Eye,
  Loader2,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TeamMember {
  userId: string;
  role: "owner" | "admin" | "member" | "viewer";
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
}

const roleConfig: Record<string, { icon: typeof Crown; color: string }> = {
  owner: { icon: Crown, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  admin: { icon: Crown, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  member: { icon: Shield, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  viewer: { icon: Eye, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

export default function Teams() {
  usePageTitle("Team Management");
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [addMemberForms, setAddMemberForms] = useState<Record<string, { userId: string; role: string }>>({});

  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const createTeamMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/teams", { name });
      return res.json();
    },
    onSuccess: () => {
      setTeamName("");
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team Created", description: "Your new team has been created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      await apiRequest("DELETE", `/api/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team Deleted", description: "The team has been removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId, role }: { teamId: string; userId: string; role: string }) => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/members`, { userId, role });
      return res.json();
    },
    onSuccess: (_, variables) => {
      setAddMemberForms((prev) => {
        const next = { ...prev };
        delete next[variables.teamId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Member Added", description: "New member has been added to the team" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      await apiRequest("DELETE", `/api/teams/${teamId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Member Removed", description: "Member has been removed from the team" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const getMemberForm = (teamId: string) => {
    return addMemberForms[teamId] || { userId: "", role: "member" };
  };

  const updateMemberForm = (teamId: string, field: "userId" | "role", value: string) => {
    setAddMemberForms((prev) => ({
      ...prev,
      [teamId]: { ...getMemberForm(teamId), [field]: value },
    }));
  };

  const handleAddMember = (teamId: string) => {
    const form = getMemberForm(teamId);
    if (!form.userId.trim()) return;
    addMemberMutation.mutate({ teamId, userId: form.userId, role: form.role });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-page-title">Teams</h1>
                <p className="text-sm text-muted-foreground">Manage your teams and members</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5" data-testid="badge-team-count">
              <Users className="h-3 w-3" />
              {teams?.length ?? 0} Teams
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        <Card data-testid="card-create-team">
          <CardHeader>
            <CardTitle className="text-base">Create Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && teamName.trim()) createTeamMutation.mutate(teamName);
                }}
                data-testid="input-team-name"
              />
              <Button
                onClick={() => createTeamMutation.mutate(teamName)}
                disabled={!teamName.trim() || createTeamMutation.isPending}
                data-testid="button-create-team"
              >
                {createTeamMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : teams && teams.length > 0 ? (
            teams.map((team) => {
              const isExpanded = expandedTeams.has(team.id);
              const memberForm = getMemberForm(team.id);

              return (
                <Card key={team.id} data-testid={`card-team-${team.id}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleTeam(team.id)}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 cursor-pointer flex-1" data-testid={`button-toggle-team-${team.id}`}>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <h3 className="font-semibold" data-testid={`text-team-name-${team.id}`}>{team.name}</h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {team.members?.length ?? 0} members
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(team.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTeamMutation.mutate(team.id)}
                          disabled={deleteTeamMutation.isPending}
                          data-testid={`button-delete-team-${team.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>

                      <CollapsibleContent className="mt-4">
                        <div className="border-t pt-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <UserPlus className="h-4 w-4" />
                              Add Member
                            </h4>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="User ID"
                                value={memberForm.userId}
                                onChange={(e) => updateMemberForm(team.id, "userId", e.target.value)}
                                className="flex-1"
                                data-testid={`input-member-userid-${team.id}`}
                              />
                              <Select
                                value={memberForm.role}
                                onValueChange={(v) => updateMemberForm(team.id, "role", v)}
                              >
                                <SelectTrigger className="w-32" data-testid={`select-member-role-${team.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => handleAddMember(team.id)}
                                disabled={!memberForm.userId.trim() || addMemberMutation.isPending}
                                data-testid={`button-add-member-${team.id}`}
                              >
                                {addMemberMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Plus className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-3">Members</h4>
                            {team.members && team.members.length > 0 ? (
                              <div className="space-y-2">
                                {team.members.map((member) => {
                                  const cfg = roleConfig[member.role] || roleConfig.viewer;
                                  const RoleIcon = cfg.icon;
                                  return (
                                    <div
                                      key={member.userId}
                                      className="flex items-center justify-between gap-2 py-2 px-3 rounded-md bg-muted/30"
                                      data-testid={`member-${team.id}-${member.userId}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <RoleIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-mono" data-testid={`text-member-id-${member.userId}`}>
                                          {member.userId}
                                        </span>
                                        <Badge variant="outline" className={`text-xs ${cfg.color}`} data-testid={`badge-member-role-${member.userId}`}>
                                          {member.role}
                                        </Badge>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeMemberMutation.mutate({ teamId: team.id, userId: member.userId })}
                                        disabled={removeMemberMutation.isPending}
                                        data-testid={`button-remove-member-${team.id}-${member.userId}`}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground" data-testid={`text-no-members-${team.id}`}>
                                No members yet
                              </p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Collapsible>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-teams">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No teams created yet</p>
                <p className="text-xs mt-1">Create a team to get started</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
