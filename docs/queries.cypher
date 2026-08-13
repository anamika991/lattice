// Reference Cypher used by Lattice (all application queries are parameterised
// in src/lib/queries.ts via the official neo4j-driver — never string-concatenated).

// ---------------------------------------------------------------------------
// 1. Multi-hop career path (shortestPath along TRANSITIONS_TO)
// ---------------------------------------------------------------------------
// MATCH (from:Role {id: $fromId}), (to:Role {id: $toId})
// MATCH path = shortestPath((from)-[:TRANSITIONS_TO*1..6]->(to))
// RETURN nodes(path), relationships(path), length(path);

// ---------------------------------------------------------------------------
// 2. Skill bridges — awkward in SQL (2-hop set intersection via mid Role)
// ---------------------------------------------------------------------------
// MATCH (from:Role {id: $fromId})-[:REQUIRES]->(s1:Skill)<-[:REQUIRES]-(mid:Role)
// WHERE mid.id <> $fromId AND mid.id <> $toId
// WITH mid, collect(DISTINCT s1.name) AS sharedWithFrom
// MATCH (mid)-[:REQUIRES]->(s2:Skill)<-[:REQUIRES]-(to:Role {id: $toId})
// WITH mid, sharedWithFrom, collect(DISTINCT s2.name) AS sharedWithTo
// RETURN mid, sharedWithFrom, sharedWithTo,
//        size(sharedWithFrom) + size(sharedWithTo) AS bridgeScore
// ORDER BY bridgeScore DESC;

// ---------------------------------------------------------------------------
// 3. Role neighborhood via shared skills
// ---------------------------------------------------------------------------
// MATCH (r:Role {id: $roleId})-[:REQUIRES]->(s:Skill)<-[:REQUIRES]-(other:Role)
// WHERE other.id <> $roleId
// RETURN other, collect(DISTINCT s.name) AS sharedSkills, count(DISTINCT s) AS score
// ORDER BY score DESC;

// ---------------------------------------------------------------------------
// 4. People who held a role (and optional company)
// ---------------------------------------------------------------------------
// MATCH (p:Person)-[:WORKED_AS]->(r:Role {id: $roleId})
// OPTIONAL MATCH (p)-[:WORKED_AT]->(c:Company)
// RETURN p, c.name AS company;
