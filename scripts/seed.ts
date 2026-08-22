/**
 * Seeds CognoDB with a real (if simplified) slice of football coaching history.
 * Run with `npm run seed` after .env.local is set up.
 *
 * Re-running this script is safe — every write uses MERGE, so it's idempotent
 * rather than duplicating nodes on a second run.
 *
 * Node model: everyone is a :Person. Anyone who has managed a club also gets
 * a second :Manager label (Neo4j nodes can carry multiple labels at once) —
 * that's what lets Messi be a normal Person with no Manager label, while
 * Guardiola is both. Whether someone "is a coach" falls out of whether they
 * have outgoing COACHED edges, not a stored flag.
 */
// dotenv/config on its own only reads a file literally named ".env" — it has
// no idea about Next.js's ".env.local" convention. This script runs via tsx,
// outside Next's request pipeline, so nothing else loads .env.local for us;
// we have to point dotenv at it explicitly.
import { config } from "dotenv";
config({ path: ".env.local" });

import { getDriver } from "../lib/db";

type PersonSeed = {
  id: string;
  name: string;
  nationality: string;
  bornYear: number;
};

type ClubSeed = { id: string; name: string; country: string };
type TacticSeed = { id: string; name: string };

// Everyone who has managed a club at some point — gets both :Person and :Manager labels.
const managers: PersonSeed[] = [
  { id: "cruyff", name: "Johan Cruyff", nationality: "Netherlands", bornYear: 1947 },
  { id: "guardiola", name: "Pep Guardiola", nationality: "Spain", bornYear: 1971 },
  { id: "mourinho", name: "Jose Mourinho", nationality: "Portugal", bornYear: 1963 },
  { id: "rijkaard", name: "Frank Rijkaard", nationality: "Netherlands", bornYear: 1962 },
  { id: "vangaal", name: "Louis van Gaal", nationality: "Netherlands", bornYear: 1951 },
  { id: "tito", name: "Tito Vilanova", nationality: "Spain", bornYear: 1968 },
  { id: "luisenrique", name: "Luis Enrique", nationality: "Spain", bornYear: 1970 },
  { id: "xavi", name: "Xavi Hernandez", nationality: "Spain", bornYear: 1980 },
  { id: "ancelotti", name: "Carlo Ancelotti", nationality: "Italy", bornYear: 1959 },
  { id: "zidane", name: "Zinedine Zidane", nationality: "France", bornYear: 1972 },
  { id: "capello", name: "Fabio Capello", nationality: "Italy", bornYear: 1946 },
];

// People who were coached but never managed a club themselves — :Person only,
// so they end up with only incoming COACHED edges.
const players: PersonSeed[] = [
  { id: "messi", name: "Lionel Messi", nationality: "Argentina", bornYear: 1987 },
  { id: "iniesta", name: "Andres Iniesta", nationality: "Spain", bornYear: 1984 },
];

const clubs: ClubSeed[] = [
  { id: "barcelona", name: "FC Barcelona", country: "Spain" },
  { id: "realmadrid", name: "Real Madrid", country: "Spain" },
  { id: "ajax", name: "AFC Ajax", country: "Netherlands" },
  { id: "bayern", name: "Bayern Munich", country: "Germany" },
  { id: "chelsea", name: "Chelsea", country: "England" },
  { id: "mancity", name: "Manchester City", country: "England" },
  { id: "intermilan", name: "Inter Milan", country: "Italy" },
];

const tactics: TacticSeed[] = [
  { id: "tikitaka", name: "Tiki-taka" },
  { id: "totalfootball", name: "Total Football" },
  { id: "gegenpressing", name: "Gegenpressing" },
  { id: "parkthebus", name: "Low Block / Counter" },
];

/** [managerId, clubId, years] — a manager can appear more than once if they had multiple spells */
const managedAt: [string, string, string][] = [
  ["cruyff", "barcelona", "1988-1996"],
  ["cruyff", "ajax", "1985-1988"],
  ["guardiola", "barcelona", "2008-2012"],
  ["guardiola", "bayern", "2013-2016"],
  ["guardiola", "mancity", "2016-present"],
  ["mourinho", "chelsea", "2004-2007"],
  ["mourinho", "intermilan", "2008-2010"],
  ["mourinho", "realmadrid", "2010-2013"],
  ["rijkaard", "barcelona", "2003-2008"],
  ["vangaal", "barcelona", "1997-2000"],
  ["vangaal", "ajax", "1991-1997"],
  ["vangaal", "bayern", "2009-2011"],
  ["tito", "barcelona", "2012-2013"],
  ["luisenrique", "barcelona", "2014-2017"],
  ["xavi", "barcelona", "2021-2024"],
  ["ancelotti", "realmadrid", "2013-2015"],
  ["ancelotti", "bayern", "2016-2017"],
  ["ancelotti", "chelsea", "2009-2011"],
  ["zidane", "realmadrid", "2016-2018"],
  ["capello", "realmadrid", "1996-1997"],
  ["capello", "realmadrid", "2006-2007"],
];

/**
 * [coachId, protegeId] — directed from the coach to whoever they coached.
 * This is the one relationship that drives the whole "coaching tree": if the
 * protege later manages a club himself, this same edge type is what lets the
 * lineage chain forward (e.g. cruyff -> guardiola -> xavi). If the protege
 * never manages anyone, the chain simply stops there — no separate flag needed.
 */
const coached: [string, string][] = [
  ["cruyff", "guardiola"], // Guardiola played in Cruyff's Barca Dream Team, 1988-1996
  ["cruyff", "luisenrique"], // Luis Enrique played under Cruyff at Barca, 1989-1996
  ["guardiola", "xavi"], // Xavi played under Guardiola at Barca, 2008-2012
  ["guardiola", "messi"], // Messi played under Guardiola at Barca, 2008-2012
  ["luisenrique", "messi"], // Messi played under Luis Enrique at Barca, 2014-2017
  ["guardiola", "iniesta"], // Iniesta played under Guardiola at Barca, 2008-2012
  ["vangaal", "iniesta"], // Iniesta broke into the first team under van Gaal, 1997-2000
];

/**
 * [assistantId, headCoachId] — a genuine staff appointment (assistant/reserve
 * team coach), kept as its own relationship type since it's a different kind
 * of influence from being coached as a player.
 */
const assistantTo: [string, string][] = [
  ["tito", "guardiola"], // Vilanova was Guardiola's assistant at Barca, 2008-2012, before succeeding him
  ["zidane", "ancelotti"], // was Ancelotti's assistant/reserve-team coach at Real Madrid before taking over
];

/** [managerId, tacticId] */
const employsTactic: [string, string][] = [
  ["cruyff", "totalfootball"],
  ["cruyff", "tikitaka"],
  ["guardiola", "tikitaka"],
  ["guardiola", "gegenpressing"],
  ["vangaal", "totalfootball"],
  ["rijkaard", "tikitaka"],
  ["luisenrique", "tikitaka"],
  ["xavi", "tikitaka"],
  ["mourinho", "parkthebus"],
  ["ancelotti", "parkthebus"],
  ["capello", "parkthebus"],
];

async function seed() {
  const driver = getDriver();
  const session = driver.session();

  try {
    console.log("Clearing existing graph...");
    await session.run("MATCH (n) DETACH DELETE n");

    console.log(`Seeding ${managers.length} managers (Person + Manager labels)...`);
    for (const m of managers) {
      await session.run(
        `MERGE (p:Person {id: $id})
         SET p.name = $name, p.nationality = $nationality, p.bornYear = $bornYear
         SET p:Manager`,
        m
      );
    }

    console.log(`Seeding ${players.length} players (Person label only)...`);
    for (const p of players) {
      await session.run(
        `MERGE (p:Person {id: $id})
         SET p.name = $name, p.nationality = $nationality, p.bornYear = $bornYear`,
        p
      );
    }

    console.log(`Seeding ${clubs.length} clubs...`);
    for (const c of clubs) {
      await session.run(
        `MERGE (c:Club {id: $id}) SET c.name = $name, c.country = $country`,
        c
      );
    }

    console.log(`Seeding ${tactics.length} tactical systems...`);
    for (const t of tactics) {
      await session.run(`MERGE (t:Tactic {id: $id}) SET t.name = $name`, t);
    }

    console.log(`Linking ${managedAt.length} MANAGED_AT relationships...`);
    for (const [managerId, clubId, years] of managedAt) {
      // years is part of the merge key so a manager's separate spells at the
      // same club (e.g. Capello at Real Madrid, twice) create distinct edges
      await session.run(
        `MATCH (m:Manager {id: $managerId}), (c:Club {id: $clubId})
         MERGE (m)-[r:MANAGED_AT {years: $years}]->(c)`,
        { managerId, clubId, years }
      );
    }

    console.log(`Linking ${coached.length} COACHED relationships...`);
    for (const [coachId, protegeId] of coached) {
      await session.run(
        `MATCH (coach:Manager {id: $coachId}), (protege:Person {id: $protegeId})
         MERGE (coach)-[:COACHED]->(protege)`,
        { coachId, protegeId }
      );
    }

    console.log(`Linking ${assistantTo.length} ASSISTANT_TO relationships...`);
    for (const [assistantId, headCoachId] of assistantTo) {
      await session.run(
        `MATCH (a:Manager {id: $assistantId}), (h:Manager {id: $headCoachId})
         MERGE (a)-[:ASSISTANT_TO]->(h)`,
        { assistantId, headCoachId }
      );
    }

    console.log(`Linking ${employsTactic.length} EMPLOYS_TACTIC relationships...`);
    for (const [managerId, tacticId] of employsTactic) {
      await session.run(
        `MATCH (m:Manager {id: $managerId}), (t:Tactic {id: $tacticId})
         MERGE (m)-[:EMPLOYS_TACTIC]->(t)`,
        { managerId, tacticId }
      );
    }

    console.log("Linking Barcelona-Real Madrid rivalry...");
    await session.run(
      `MATCH (a:Club {id: "barcelona"}), (b:Club {id: "realmadrid"})
       MERGE (a)-[:RIVAL_OF]->(b)
       MERGE (b)-[:RIVAL_OF]->(a)`
    );

    console.log("Seed complete.");
  } finally {
    await session.close();
    await driver.close();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});