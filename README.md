# STANDOFF

A multiplayer game of trust, betrayal and organised crime, for a group of friends
who would like to find out some things about each other.

It is a prisoner's dilemma wearing a very nice suit and holding a hand of cards.

## Play it

**Three ways, and they all use the same game.**

| | |
|---|---|
| **New table** | Everybody on their own phone. One person runs the server, reads four letters out loud, everybody else types them in. |
| **One device** | Pass the phone around the table. It hides everybody's business between turns with a "hand it to Mo" card. |
| **Against the ghosts** | On your own, against bots with fixed, legible habits. |

```
node server.js      # then open http://localhost:8787
```

The server prints your LAN address on boot so people on the same wifi can just type
it in. No dependencies, no build step, no accounts.

**On GitHub Pages** (or any static host) there is no server to keep a socket open,
so the client runs the whole engine in the browser: *one device* and *against the
ghosts* work exactly as they do locally, and the online option hides itself when
nobody answers. `.github/workflows/pages.yml` publishes `public/` on every push to
`main`; turn on Pages → Source: GitHub Actions and it deploys itself.

---

## What happens

The night runs in **three acts**. Act One is small stuff and everybody still being
polite. Act Two is when somebody has been talking and the theories start costing
money. Act Three is one room, one door, everything paying triple.

Each round, the table is cut into pairs — sometimes threes, every third job the
whole table at once — and each pair gets a **job**: a short, specific, generated
piece of organised-crime trouble you are both already in.

A truck of haddock that is not haddock. A second set of books piped in blue gel
onto sheet cakes, one of which went to a christening. A confession sung to the tune
of *New York, New York* at somebody's fiftieth. Eleven years of the same alibi in
the same eleven words, which the cell tower data has just contradicted. A tunnel
that is forty-one feet long and stops eleven feet short of anything.

### Every job offers its own way out

There is no "cooperate" button. Each job offers the two, three or four things
actually available to somebody standing in that particular room, and they are
different every time. At the christening you can say baskets are baskets, quietly
make up the missing number out of your own pocket, blame the function-room staff
and cost a banqueting manager his job, or point at the eleven feet of driveway
that only your friend walked down. On the ferry you can insist it is sports
equipment, disclaim the tarp entirely and lose the load, or claim it loudly and
demand a warrant — which either makes everything inside inadmissible forever or
signs your name to it.

None of them is the decent option. Every one of them costs somebody something,
and what is *worth* doing depends entirely on what you think everybody else is
about to do:

| | |
|---|---|
| **hold the line** | Everything in. Best for the room, worst for you if the room does not do the same. |
| **give them something** | Half in, half kept. Costs you if the room holds, covers you if it doesn't. |
| **cover yourself** | Almost nothing in, and a floor under you. You will not do well. You cannot do badly. |
| **bet on the room** | Pays far above anything else — but only if everybody genuinely holds. |
| **make it cost them** | Strips most of what anybody who kept theirs was keeping. Costs you if nobody did. |
| **take the weight** | More than your share goes in. It costs you and it makes everybody else richer. |

Betting on the room wins when the room holds. Covering yourself wins when it
doesn't. Nothing wins both ways, so every round is a read on the people in it.

Roughly one round in six goes **loud**. Same dilemma, no chairs: a prison wall
and two hundred feet of knotted bedsheet that holds one man at a time; a freight
car with no brakes and a handbrake wheel that needs two people; nine feet between
two roofs and a plank that takes a man at each end. Cooperating costs you your body
instead of your freedom — hold the door, take your end, lie flat and crawl — and
defecting is just running. Loud rounds pay more, run on a shorter clock, and get
likelier as the night goes on.

Then:

1. **The job** — everyone reads the dossier and the night's twist.
2. **Table talk** — a private whisper to your partner, the option to formally
   **give your word**, and one card from your hand.
3. **The squeeze** — separately, alone, you choose. **Hold the line**, or **take
   the deal**. No take-backs.
4. **The reckoning** — everything revealed and narrated: who held, who folded, who
   swore on it first.
5. **Between jobs** — an event lands on the table. Sometimes the table has to vote.

After the last job the **ledger** opens: the money, the secret cards, what actually
happened versus what the table was told, and a web of every bond at the table drawn
in green and red.

## Where it stops being a prisoner's dilemma

The base game is the real thing: `T > R > P > S`, `2R > T + S`, generated fresh per
job so the size of the temptation keeps moving. On top of that:

**The hand.** Everybody holds cards and may play one a round, before choosing.
**Face-up** cards are announced the moment they hit the table — *The Muscle* ("fold
on me and you forfeit the lot"), *The Shakedown*, *The Godfather*, *The Loan Shark*.
**Face-down** cards stay secret until the reckoning — *The Alibi* (you fold and the
table is shown you holding, and the record agrees), *Insurance*, *The Lookout*,
*The Set-Up*, *The Priest*, which quietly cancels whatever was aimed at you.

**Heat.** A table-wide meter. Every fold makes noise, every held line quiets it
down. The louder the table gets, the sweeter the DA's offers become — and at
boiling point the vans arrive at six in the morning and everybody pays.

**The loud ones.** 18 action jobs that show up rarely and mix in with everything
else — a ladder in a prison yard that somebody has to foot, a lifeboat rated for
six with more than six of you at the davits, a twin-engine plane four hundred
pounds over on a short strip where four hundred pounds is either the bags or two
people. These get their own ways out too: on the burning stairwell you can hold
the door, wedge it with a fire bucket and go, or run *down* through the smoke on
the theory that only the ground floor is alight.

**Callbacks.** The game remembers. Put two people back in a room and the job is
built out of what they actually did to each other: a ninety-minute drive with the
person who folded on you at the haddock thing, a Sunday dinner where the seats were
decided in 1994, a vouch that ties you to somebody who has already sold you once.

**Events and votes.** Between jobs: funerals everybody pays into, audits that go
straight for whoever is winning, amnesties, leaks, a phone call somebody took that
nobody can identify. With five or more, the table votes out loud, with their names
on it: who takes the fall, who gets made, who has to sit the next one out.

**Secret cards.** Dealt at the start, turned over at the ledger. The Rat is paid by
the DA per betrayal. The Saint only profits by never folding once. The Widow
profits from being betrayed. The Bookkeeper skims the whole table and therefore
quietly needs everyone to get along.

**Markers.** Fold on somebody who held and they walk away holding a marker. Call it
in later and their next betrayal costs them the entire take.

**Twists.** Announced before anyone talks. *Honour Among Thieves* triples mutual
loyalty and turns the round into a stag hunt. *The Wire* leaks whoever locks in
first. *Blind Alley* seals the whole round until the ledger. *The Switcheroo*
re-cuts the pairs **after** table talk, so your promise ends up in somebody else's
hands.

## It changes shape with the table

The night is dealt differently depending on who turned up, and the lobby shows you
the shape before you start:

| | |
|---|---|
| **2 — The Two-Hander** | Every job is the two of you, with a full memory of it. No rat, no votes, nowhere to hide. Seven rounds. |
| **3 — The Three-Hander** | Pairs and three-handed rooms where the arithmetic of loyalty turns cruel. The Rat arrives. |
| **4–6 — The Crew** | Whole-table jobs every third round, events between them, and votes with everybody's name attached. |
| **7–10 — The Family** | The table splits into two crews with a shared purse. More events, bigger votes, four cards in hand. |

## The bonds

The point of the ledger isn't the money. It's the record: who held for whom, how
many times, and who was first to stop. Every pair who were ever in a room together
gets a line — green if it stayed clean, red if it didn't — plus the awards nobody
wants (THE MARK, OATHBREAKER, JUDAS) and the ones people are oddly proud of (BLOOD
BROTHERS, THE MAGICIAN: folded, and the table never found out).

## Running it

| | |
|---|---|
| `npm start` | serve on `http://localhost:8787` |
| `PORT=3000 npm start` | serve somewhere else |
| `npm test` | 59 tests: the balance of every move, that the books add up, card rules, seizure ordering, every mix of moves narrating at every table size, information hiding, and a full night over real sockets |
| `npm run dev` | restart on save |

Sessions survive a dropped connection — reopen the page and you get your seat, your
card, your hand and your job back.

## Layout

```
server.js              http + static files + the socket upgrade
src/net/wss.js         a small RFC 6455 server, no dependencies
src/room.js            rooms, seats, reconnection tokens, the tick loop
public/game/           the engine — plain ES modules, so it runs on both sides
  engine.js            the state machine: act, deal, talk, squeeze, reckoning, event, vote, ledger
  scenarios.*.js       the writing — desk jobs, the loud ones, callbacks, and the grammar that varies them
  cards.js             the hand
  events.js            what happens between jobs
  director.js          acts, crews, heat, and how the night scales with the table
  options.js           the moves, what they trade off, and one resolver for any room size
  payoffs.js           the size of the stake
  roles.js twists.js bots.js
public/net/local.js    the engine running in the page: pass-and-play and solo
public/app.js          one page, one render function, three transports
```

## A note on playing it

Nobody has ever enjoyed this game less for having talked more. The whisper box is
the good part. Lie in it.
