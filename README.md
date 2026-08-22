# Coaching Tree

A graph-native explorer of football coaching lineages — who coached whom, who
managed which club when, and how influence (tactical and personal) propagates
through the game — backed by CognoDB.

## Status: work in progress

This is a mid-build checkpoint, not the final submission. Built so far:

- [x] CognoDB connection layer (`lib/db.ts`) — pooled driver, parameterized
      query helper, connectivity check
- [x] Data model finalized — see below
- [x] Seed script with real coaching history (`scripts/seed.ts`)
- [ ] API routes (`app/api/...`)
- [ ] UI (`app/...`) — tactics-board network visualization, Barça/Real Madrid themed
- [ ] README sections: "Why a graph database?", data model diagram, query walkthroughs, screenshots
- [ ] Deployment + demo recording

## Data model

**Nodes**
- `Person` — everyone: players and managers alike
- `Manager` — an additional label (not a separate node) on any `Person` who
  has managed a club. A person can hold both labels at once.
- `Club`
- `Tactic`

**Relationships**
- `(Manager)-[:COACHED]->(Person)` — directed coach → protege. Whether someone
  "is a coach" falls out of whether they have outgoing `COACHED` edges, not a
  stored flag — this is what lets a pure player (e.g. Messi) sit in the same
  graph with only incoming edges.
- `(Manager)-[:MANAGED_AT {years}]->(Club)`
- `(Manager)-[:ASSISTANT_TO]->(Manager)` — a genuine staff appointment,
  distinct from `COACHED` (which represents a playing-career relationship)
- `(Manager)-[:EMPLOYS_TACTIC]->(Tactic)`
- `(Club)-[:RIVAL_OF]->(Club)`

## Setup

1. Create a free CognoDB instance at [console.cognodb.com](https://console.cognodb.com/signup)
2. Copy `.env.example` to `.env.local` and fill in your URI, username, and password
3. `npm install`
4. `npm run seed` — loads the dataset (idempotent, safe to re-run)
5. `npm run dev`

## Why a graph database?

*(to be expanded — draft points below)*

The interesting questions here are relational by nature: "who is connected to
whom, through how many hops, via what kind of relationship" — not "what rows
match this filter." A recursive lineage like `cruyff → guardiola → xavi` is a
join of unknown, variable depth in SQL (recursive CTEs, one per direction for
a two-sided query), but a single variable-length pattern in Cypher. The
"coaching cousins" query — two managers connected through shared coaching
influence who never worked at the same club — is the clearest example: it
needs a bidirectional variable-length traversal plus a negative existence
check, which is exactly the kind of query relational engines handle poorly
past a couple of hops.
