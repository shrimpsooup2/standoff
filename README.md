# STANDOFF

A multiplayer game of trust, betrayal and organised crime, for a group of friends
who would like to find out some things about each other.

It is a prisoner's dilemma wearing a very nice suit.

```
node server.js
```

Then open `http://localhost:8787`. One person hits **NEW TABLE** and reads the four
letters out loud; everybody else types them in. Works best with 3–10 people in the
same room, or on the same call, where you can hear the pause before somebody lies.

No dependencies. No build step. No accounts. One file to run.

---

## What happens

Every round, the table is cut into pairs — occasionally threes, and now and then
the whole table at once — and each pair is handed a **job**: a short, specific,
generated piece of organised-crime trouble that both of you are already in.

A truck of haddock that is not haddock. A ledger piped in blue gel onto sheet
cakes. A confession sung to the tune of *New York, New York* at somebody's
fiftieth. Eleven years of the same alibi, delivered in the same eleven words,
which the cell tower data has just contradicted.

Then:

1. **The job** — everyone reads the dossier, and the night's twist.
2. **Table talk** — you get a private whisper to your partner, and the option to
   formally **give your word**. Pledges are visible. Breaking one is recorded
   with your name on it.
3. **The squeeze** — separately, alone, you choose. **Hold the line**, or **take
   the deal**. No take-backs.
4. **The reckoning** — everything is revealed and narrated. Who held, who folded,
   who swore on it first.

After the last job — always the whole table, in one room, with one door — the
**ledger** opens: the money, the secret cards, the accusations, and a web of every
bond at the table drawn in green and red.

## Where it stops being a prisoner's dilemma

The base game is the real thing: `T > R > P > S`, `2R > T + S`, generated fresh
for every job so the size of the temptation keeps moving. On top of that:

**Secret cards.** Everyone is dealt one at the start, revealed only at the ledger.
The Rat is paid by the DA for every betrayal. The Saint collects a fortune only by
never folding once. The Widow profits from being betrayed. The Bookkeeper skims
the whole table and therefore quietly wants everyone to get along. At the end you
find out your friend wasn't a monster — he was contractually obligated.

**Twists.** Announced with the job, before anyone talks, so everyone is lying on
top of the same shared fact. *Honour Among Thieves* triples mutual loyalty and
turns the round into a stag hunt. *The Squeeze* makes mutual betrayal cost real
money. *The Wire* leaks the first player to lock in. *Blind Alley* tells you what
you earned and nothing else until the ledger. *The Switcheroo* re-cuts the pairs
**after** table talk, so your promise ends up in somebody else's hands.

**Markers.** Fold on somebody who held, and they walk away holding a marker. They
can call it in on a later round: if you fold on them again, you forfeit the entire
take and they collect half of it. Costly punishment, in an envelope.

**The whole table.** Every third round is a public-goods round — a tribute, a bail
fund, a widow's pension. Put in and the pot grows and is split evenly, including
with whoever didn't. Skim and you are richer than everyone. Both of those sentences
are true at once, which is the whole problem.

**Naming the rat.** Before the ledger, everyone points at who they think was on the
payroll. Right is worth money. Wrong pays the rat.

## The bonds

The point of the ledger isn't the money. It's the record: who held for whom, how
many times, and who was the first to stop. Every pair that was ever locked in a
room together gets a line — green if it stayed clean, red if it didn't — plus the
awards nobody wants (THE MARK, OATHBREAKER, JUDAS) and the one everybody does
(BLOOD BROTHERS).

## Ghosts

Short a player, or want to see how you play? The host can seat **ghosts** — bots
with fixed, legible habits. One gives back exactly what it gets. One forgives
nothing, ever, once. One has never folded in its life. One is already on the phone.

## Running it

| | |
|---|---|
| `npm start` | serve on `http://localhost:8787` |
| `PORT=3000 npm start` | serve somewhere else |
| `npm test` | 28 tests: payoff invariants, engine, and a full game over real sockets |
| `npm run dev` | restart on save |

The server prints your LAN address on boot, so people on the same wifi can just
type it into a phone. Sessions survive a dropped connection — reopen the page and
you get your seat, your card and your job back.

## Layout

```
server.js              http + static files + the socket upgrade
src/net/wss.js         a small RFC 6455 server, no dependencies
src/room.js            rooms, seats, reconnection tokens, the tick loop
src/game/engine.js     the state machine: deal, talk, squeeze, reckoning, ledger
src/game/scenarios.*   the writing, and the grammar that varies it
src/game/payoffs.js    matrix generation under real dilemma constraints
src/game/roles.js      the secret cards
src/game/twists.js     the rule changes
src/game/bots.js       the ghosts
public/                the client: one page, one socket, one render function
```

## A note on playing it

Nobody has ever enjoyed this game less for having talked more. The whisper box is
the good part. Lie in it.
