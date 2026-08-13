export type Role = {
  id: string;
  name: string;
  level: string;
  domain: string;
  description: string;
};

export type Skill = {
  id: string;
  name: string;
  category: string;
  demand: number;
};

export type Person = {
  id: string;
  name: string;
  headline: string;
};

export type Company = {
  id: string;
  name: string;
  industry: string;
  size: string;
};

export type PathStep = {
  role: Role;
  viaSkills?: string[];
};

export type CareerPath = {
  hops: number;
  steps: PathStep[];
  transitionHints: Array<{
    from: string;
    to: string;
    frequency: string;
    difficulty: string;
  }>;
};

export type SkillBridge = {
  role: Role;
  sharedWithFrom: string[];
  sharedWithTo: string[];
  bridgeScore: number;
};

export type NeighborResult = {
  role: Role;
  relatedRoles: Array<{ role: Role; sharedSkills: string[]; score: number }>;
  topSkills: Array<{ skill: Skill; importance: string }>;
  people: Array<{ person: Person; company?: string }>;
};

export type GraphStats = {
  roles: number;
  skills: number;
  people: number;
  companies: number;
  relationships: number;
};

export type ApiErrorBody = {
  error: string;
  code?: "DB_UNREACHABLE" | "MISSING_CONFIG" | "BAD_REQUEST" | "NOT_FOUND";
};
