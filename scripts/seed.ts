/**
 * Idempotent seed for Lattice → CognoDB (openCypher over Bolt).
 *
 * Usage:
 *   cp .env.example .env.local   # fill in CognoDB credentials
 *   npm run seed
 */
import { config } from "dotenv";
import neo4j from "neo4j-driver";
import path from "node:path";
import {
  companies,
  people,
  roleSkills,
  roles,
  skillRelations,
  skills,
  transitions,
} from "./data";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `Missing ${name}.\nCopy .env.example → .env.local and add your CognoDB credentials.`,
    );
    process.exit(1);
  }
  return value;
}

const uri = requireEnv("COGNODB_URI");
const user = process.env.COGNODB_USER || "cognodb";
const password = requireEnv("COGNODB_PASSWORD");

async function main() {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    connectionTimeout: 10_000,
  });

  const session = driver.session();
  try {
    console.log("Connecting to CognoDB…");
    await driver.verifyConnectivity();
    console.log("Connected. Seeding graph…");

    await session.run(`
      MATCH (n)
      DETACH DELETE n
    `);

    await session.run(
      `
      UNWIND $skills AS row
      MERGE (s:Skill {id: row.id})
      SET s.name = row.name,
          s.category = row.category,
          s.demand = row.demand
      `,
      { skills },
    );

    await session.run(
      `
      UNWIND $roles AS row
      MERGE (r:Role {id: row.id})
      SET r.name = row.name,
          r.level = row.level,
          r.domain = row.domain,
          r.description = row.description
      `,
      { roles },
    );

    await session.run(
      `
      UNWIND $companies AS row
      MERGE (c:Company {id: row.id})
      SET c.name = row.name,
          c.industry = row.industry,
          c.size = row.size
      `,
      { companies },
    );

    const requires = Object.entries(roleSkills).flatMap(([roleId, list]) =>
      list.map((item) => ({
        roleId,
        skillId: item.skillId,
        importance: item.importance,
      })),
    );

    await session.run(
      `
      UNWIND $requires AS row
      MATCH (r:Role {id: row.roleId})
      MATCH (s:Skill {id: row.skillId})
      MERGE (r)-[rel:REQUIRES]->(s)
      SET rel.importance = row.importance
      `,
      { requires },
    );

    await session.run(
      `
      UNWIND $transitions AS row
      MATCH (a:Role {id: row.from})
      MATCH (b:Role {id: row.to})
      MERGE (a)-[t:TRANSITIONS_TO]->(b)
      SET t.frequency = row.frequency,
          t.difficulty = row.difficulty
      `,
      { transitions },
    );

    await session.run(
      `
      UNWIND $rels AS row
      MATCH (a:Skill {id: row.from})
      MATCH (b:Skill {id: row.to})
      MERGE (a)-[r:RELATED_TO]->(b)
      SET r.strength = row.strength
      `,
      { rels: skillRelations },
    );

    for (const person of people) {
      await session.run(
        `
        MERGE (p:Person {id: $id})
        SET p.name = $name, p.headline = $headline
        WITH p
        MATCH (c:Company {id: $companyId})
        MERGE (p)-[:WORKED_AT]->(c)
        `,
        {
          id: person.id,
          name: person.name,
          headline: person.headline,
          companyId: person.companyId,
        },
      );

      await session.run(
        `
        UNWIND $roles AS row
        MATCH (p:Person {id: $personId})
        MATCH (r:Role {id: row.roleId})
        MERGE (p)-[w:WORKED_AS]->(r)
        SET w.years = row.years, w.order = row.order
        `,
        { personId: person.id, roles: person.roles },
      );

      await session.run(
        `
        UNWIND $skillIds AS skillId
        MATCH (p:Person {id: $personId})
        MATCH (s:Skill {id: skillId})
        MERGE (p)-[:HAS_SKILL]->(s)
        `,
        { personId: person.id, skillIds: person.skillIds },
      );
    }

    const counts = await session.run(`
      MATCH (n) WITH count(n) AS nodes
      MATCH ()-[r]->()
      RETURN nodes, count(r) AS relationships
    `);
    const row = counts.records[0];
    console.log(
      `Seed complete: ${row.get("nodes")} nodes, ${row.get("relationships")} relationships.`,
    );
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
