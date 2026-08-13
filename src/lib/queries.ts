import type { Session } from "neo4j-driver";
import { toNumber } from "./neo4j";
import type {
  CareerPath,
  GraphStats,
  NeighborResult,
  Role,
  Skill,
  SkillBridge,
} from "./types";

function mapRole(raw: Record<string, unknown>): Role {
  return {
    id: String(raw.id),
    name: String(raw.name),
    level: String(raw.level),
    domain: String(raw.domain),
    description: String(raw.description ?? ""),
  };
}

function mapSkill(raw: Record<string, unknown>): Skill {
  return {
    id: String(raw.id),
    name: String(raw.name),
    category: String(raw.category),
    demand: toNumber(raw.demand),
  };
}

export async function getStats(session: Session): Promise<GraphStats> {
  const result = await session.run(`
    MATCH (r:Role) WITH count(r) AS roles
    MATCH (s:Skill) WITH roles, count(s) AS skills
    MATCH (p:Person) WITH roles, skills, count(p) AS people
    MATCH (c:Company) WITH roles, skills, people, count(c) AS companies
    MATCH ()-[rel]->()
    RETURN roles, skills, people, companies, count(rel) AS relationships
  `);
  const row = result.records[0];
  return {
    roles: toNumber(row.get("roles")),
    skills: toNumber(row.get("skills")),
    people: toNumber(row.get("people")),
    companies: toNumber(row.get("companies")),
    relationships: toNumber(row.get("relationships")),
  };
}

export async function listRoles(session: Session): Promise<Role[]> {
  const result = await session.run(`
    MATCH (r:Role)
    RETURN r { .* } AS role
    ORDER BY r.domain, r.level, r.name
  `);
  return result.records.map((rec) => mapRole(rec.get("role")));
}

export async function listSkills(session: Session): Promise<Skill[]> {
  const result = await session.run(`
    MATCH (s:Skill)
    RETURN s { .* } AS skill
    ORDER BY s.category, s.name
  `);
  return result.records.map((rec) => mapSkill(rec.get("skill")));
}

/**
 * Multi-hop traversal: shortest career path along TRANSITIONS_TO edges.
 * Relational SQL would need recursive CTEs + awkward join fan-out to reconstruct
 * ordered hop metadata and co-occurring skill overlap at each step.
 */
export async function findCareerPath(
  session: Session,
  fromId: string,
  toId: string,
): Promise<CareerPath | null> {
  if (fromId === toId) {
    const single = await session.run(
      `
      MATCH (r:Role {id: $fromId})
      RETURN r { .* } AS role
      `,
      { fromId },
    );
    if (single.records.length === 0) return null;
    return {
      hops: 0,
      steps: [{ role: mapRole(single.records[0].get("role")) }],
      transitionHints: [],
    };
  }

  const result = await session.run(
    `
    MATCH (from:Role {id: $fromId}), (to:Role {id: $toId})
    MATCH path = shortestPath((from)-[:TRANSITIONS_TO*1..6]->(to))
    WITH path, relationships(path) AS rels, nodes(path) AS roles
    UNWIND range(0, size(roles)-2) AS i
    WITH path, rels, roles, i,
         roles[i] AS a, roles[i+1] AS b, rels[i] AS rel
    OPTIONAL MATCH (a)-[:REQUIRES]->(shared:Skill)<-[:REQUIRES]-(b)
    WITH path, roles, i, a, b, rel, collect(DISTINCT shared.name) AS viaSkills
    ORDER BY i
    WITH path, roles,
         collect({
           from: a.name,
           to: b.name,
           frequency: rel.frequency,
           difficulty: rel.difficulty,
           viaSkills: viaSkills
         }) AS hints
    RETURN [node IN roles | node { .* }] AS steps, hints, length(path) AS hops
    `,
    { fromId, toId },
  );

  if (result.records.length === 0) return null;

  const record = result.records[0];
  const stepsRaw = record.get("steps") as Record<string, unknown>[];
  const hints = record.get("hints") as Array<{
    from: string;
    to: string;
    frequency: string;
    difficulty: string;
    viaSkills: string[];
  }>;

  return {
    hops: toNumber(record.get("hops")),
    steps: stepsRaw.map((role, index) => ({
      role: mapRole(role),
      viaSkills: hints[index]?.viaSkills ?? [],
    })),
    transitionHints: hints.map((h) => ({
      from: h.from,
      to: h.to,
      frequency: h.frequency,
      difficulty: h.difficulty,
    })),
  };
}

/**
 * Graph-native "awkward for SQL" query:
 * Find bridge roles that sit between two careers via overlapping skill sets
 * (from → skills → mid → skills → to). Ranking uses set intersection sizes
 * that would explode into self-joins and GROUP BY gymnastics in a relational schema.
 */
export async function findSkillBridges(
  session: Session,
  fromId: string,
  toId: string,
  limit = 8,
): Promise<SkillBridge[]> {
  const result = await session.run(
    `
    MATCH (from:Role {id: $fromId})-[:REQUIRES]->(s1:Skill)<-[:REQUIRES]-(mid:Role)
    WHERE mid.id <> $fromId AND mid.id <> $toId
    WITH from, mid, collect(DISTINCT s1.name) AS sharedWithFrom
    MATCH (mid)-[:REQUIRES]->(s2:Skill)<-[:REQUIRES]-(to:Role {id: $toId})
    WITH mid, sharedWithFrom, collect(DISTINCT s2.name) AS sharedWithTo
    WHERE size(sharedWithFrom) > 0 AND size(sharedWithTo) > 0
    WITH mid, sharedWithFrom, sharedWithTo,
         size(sharedWithFrom) + size(sharedWithTo) AS bridgeScore
    RETURN mid { .* } AS role, sharedWithFrom, sharedWithTo, bridgeScore
    ORDER BY bridgeScore DESC, mid.name
    LIMIT $limit
    `,
    { fromId, toId, limit },
  );

  return result.records.map((rec) => ({
    role: mapRole(rec.get("role")),
    sharedWithFrom: rec.get("sharedWithFrom") as string[],
    sharedWithTo: rec.get("sharedWithTo") as string[],
    bridgeScore: toNumber(rec.get("bridgeScore")),
  }));
}

export async function exploreRole(
  session: Session,
  roleId: string,
): Promise<NeighborResult | null> {
  const roleResult = await session.run(
    `
    MATCH (r:Role {id: $roleId})
    RETURN r { .* } AS role
    `,
    { roleId },
  );
  if (roleResult.records.length === 0) return null;

  const role = mapRole(roleResult.records[0].get("role"));

  const related = await session.run(
    `
    MATCH (r:Role {id: $roleId})-[:REQUIRES]->(s:Skill)<-[:REQUIRES]-(other:Role)
    WHERE other.id <> $roleId
    WITH other, collect(DISTINCT s.name) AS sharedSkills, count(DISTINCT s) AS score
    RETURN other { .* } AS role, sharedSkills, score
    ORDER BY score DESC, other.name
    LIMIT 8
    `,
    { roleId },
  );

  const skills = await session.run(
    `
    MATCH (r:Role {id: $roleId})-[req:REQUIRES]->(s:Skill)
    RETURN s { .* } AS skill, req.importance AS importance
    ORDER BY
      CASE req.importance WHEN 'core' THEN 0 WHEN 'strong' THEN 1 ELSE 2 END,
      s.name
    `,
    { roleId },
  );

  const people = await session.run(
    `
    MATCH (p:Person)-[:WORKED_AS]->(r:Role {id: $roleId})
    OPTIONAL MATCH (p)-[:WORKED_AT]->(c:Company)
    RETURN p { .* } AS person, c.name AS company
    ORDER BY p.name
    LIMIT 10
    `,
    { roleId },
  );

  return {
    role,
    relatedRoles: related.records.map((rec) => ({
      role: mapRole(rec.get("role")),
      sharedSkills: rec.get("sharedSkills") as string[],
      score: toNumber(rec.get("score")),
    })),
    topSkills: skills.records.map((rec) => ({
      skill: mapSkill(rec.get("skill")),
      importance: String(rec.get("importance")),
    })),
    people: people.records.map((rec) => ({
      person: {
        id: String(rec.get("person").id),
        name: String(rec.get("person").name),
        headline: String(rec.get("person").headline ?? ""),
      },
      company: rec.get("company") ? String(rec.get("company")) : undefined,
    })),
  };
}
