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
  // Premier League
  { id: "wenger", name: "Arsene Wenger", nationality: "France", bornYear: 1949 },
  { id: "ferguson", name: "Alex Ferguson", nationality: "Scotland", bornYear: 1941 },
  { id: "klopp", name: "Jurgen Klopp", nationality: "Germany", bornYear: 1967 },
  { id: "arteta", name: "Mikel Arteta", nationality: "Spain", bornYear: 1982 },
  { id: "kompany", name: "Vincent Kompany", nationality: "Belgium", bornYear: 1986 },
  // Serie A
  { id: "conte", name: "Antonio Conte", nationality: "Italy", bornYear: 1969 },
  { id: "allegri", name: "Massimiliano Allegri", nationality: "Italy", bornYear: 1967 },
  { id: "sacchi", name: "Arrigo Sacchi", nationality: "Italy", bornYear: 1946 },
];

// People who were coached but never managed a club themselves — :Person only,
// so they end up with only incoming COACHED edges.
const players: PersonSeed[] = [
  { id: "messi", name: "Lionel Messi", nationality: "Argentina", bornYear: 1987 },
  { id: "iniesta", name: "Andres Iniesta", nationality: "Spain", bornYear: 1984 },
  { id: "henry", name: "Thierry Henry", nationality: "France", bornYear: 1977 },
];

const clubs: ClubSeed[] = [
  { id: "barcelona", name: "FC Barcelona", country: "Spain" },
  { id: "realmadrid", name: "Real Madrid", country: "Spain" },
  { id: "ajax", name: "AFC Ajax", country: "Netherlands" },
  { id: "bayern", name: "Bayern Munich", country: "Germany" },
  { id: "chelsea", name: "Chelsea", country: "England" },
  { id: "mancity", name: "Manchester City", country: "England" },
  { id: "intermilan", name: "Inter Milan", country: "Italy" },
  // Premier League
  { id: "arsenal", name: "Arsenal", country: "England" },
  { id: "manutd", name: "Manchester United", country: "England" },
  { id: "liverpool", name: "Liverpool", country: "England" },
  { id: "tottenham", name: "Tottenham Hotspur", country: "England" },
  { id: "burnley", name: "Burnley", country: "England" },
  { id: "dortmund", name: "Borussia Dortmund", country: "Germany" },
  // Serie A
  { id: "juventus", name: "Juventus", country: "Italy" },
  { id: "acmilan", name: "AC Milan", country: "Italy" },
  { id: "roma", name: "AS Roma", country: "Italy" },
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
  // Premier League
  ["wenger", "arsenal", "1996-2018"],
  ["ferguson", "manutd", "1986-2013"],
  ["klopp", "dortmund", "2008-2015"],
  ["klopp", "liverpool", "2015-2024"],
  ["arteta", "arsenal", "2019-present"],
  ["kompany", "burnley", "2022-2023"],
  ["kompany", "bayern", "2024-present"],
  ["mourinho", "tottenham", "2019-2021"],
  ["mourinho", "roma", "2021-2024"],
  ["conte", "chelsea", "2016-2018"],
  // Serie A
  ["conte", "juventus", "2011-2014"],
  ["conte", "intermilan", "2019-2021"],
  ["allegri", "acmilan", "2010-2014"],
  ["allegri", "juventus", "2014-2019"],
  ["sacchi", "acmilan", "1987-1991"],
  ["ancelotti", "acmilan", "2001-2009"],
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
  // Premier League
  ["wenger", "henry"], // Henry played under Wenger at Arsenal, 1999-2007
  ["wenger", "arteta"], // Arteta played under Wenger at Arsenal, 2011-2016
  ["guardiola", "kompany"], // Kompany captained Guardiola's Man City, 2016-2019
  // Serie A -> bridges into the existing Real Madrid branch via Ancelotti
  ["sacchi", "ancelotti"], // Ancelotti played in Sacchi's Milan side, 1987-1991
];

/**
 * [assistantId, headCoachId] — a genuine staff appointment (assistant/reserve
 * team coach), kept as its own relationship type since it's a different kind
 * of influence from being coached as a player.
 */
const assistantTo: [string, string][] = [
  ["tito", "guardiola"], // Vilanova was Guardiola's assistant at Barca, 2008-2012, before succeeding him
  ["zidane", "ancelotti"], // was Ancelotti's assistant/reserve-team coach at Real Madrid before taking over
  ["arteta", "guardiola"], // was Guardiola's assistant coach at Man City, 2016-2019, before managing Arsenal
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
  ["klopp", "gegenpressing"],
  ["sacchi", "gegenpressing"], // Sacchi's high-pressing Milan is widely cited as a forefather of gegenpressing
  ["wenger", "tikitaka"], // "Wenger-ball" — fluid short passing, often compared stylistically to tiki-taka
  ["conte", "parkthebus"],
  ["allegri", "parkthebus"],
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

    console.log("Linking club rivalries...");
    await session.run(
      `MATCH (a:Club {id: "barcelona"}), (b:Club {id: "realmadrid"})
       MERGE (a)-[:RIVAL_OF]->(b)
       MERGE (b)-[:RIVAL_OF]->(a)`
    );
    await session.run(
      `MATCH (a:Club {id: "arsenal"}), (b:Club {id: "tottenham"})
       MERGE (a)-[:RIVAL_OF]->(b)
       MERGE (b)-[:RIVAL_OF]->(a)`
    );
    await session.run(
      `MATCH (a:Club {id: "manutd"}), (b:Club {id: "liverpool"})
       MERGE (a)-[:RIVAL_OF]->(b)
       MERGE (b)-[:RIVAL_OF]->(a)`
    );
    await session.run(
      `MATCH (a:Club {id: "juventus"}), (b:Club {id: "acmilan"})
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