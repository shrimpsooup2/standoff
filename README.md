# STANDOFF

A game of trust, betrayal and organised crime, told one night at a time. Bring
friends. Lose them.

STANDOFF is a game of chapters. Each chapter is one story — its own week, its own
people, its own ending — played over about an hour by two to ten people, each on
their own phone or passing one around.

## Chapter 1: Sal's Ledger

> Monday, 6:10 a.m. Salvatore "Sal" Benedetto — seventy-one, neighbourhood
> institution, three-time winner of the St. Anthony's tomato fair — is arrested in
> his bathrobe, in his own garden, holding a watering can.
>
> The charge is tax fraud. The problem is the ledger: thirty-one years of every
> favour, payoff and debt in this neighbourhood, in Sal's handwriting, and it is no
> longer where Sal left it.
>
> Assistant District Attorney Wendell Prout wants the ledger. The Castellanos across
> the river want the neighbourhood. Sal's lawyer wants money by next Monday.
>
> Sal wants you.

Two things sit in the middle of the table all week. **The Bag** — a 1994 Knicks gym
bag on Nonna's kitchen table — is money for Sal's lawyer. **The Case File** is
Prout's folder, and every mistake goes in it. On Monday the two of them set the odds
of one roll of two dice, the **Verdict**. If Sal walks, the crew is paid. If he goes
down, he names names, and everybody without a deal loses half.

Then the richest person at the table wins.

### Three things on your phone

- **A job.** The Talker, the Driver, the Numbers Guy, the Muscle, the Cousin, the
  Fixer, the Lookout, the Mechanic, the Altar Boy, the New Guy. Everybody knows
  yours. Each does one thing.
- **A secret.** What you want this week besides the obvious: skim the Bag and still
  see Sal walk, keep somebody out of jail who doesn't know you're trying, see
  somebody else finish last, get Nonna her ring back. From five players, one of you
  is wearing Prout's wire.
- **Cards.** Loaded Die, Black Cat, Snitch, Forgery, Fall Guy, Dirt, the Don's Ring,
  Musical Chairs and thirty-odd more. One sentence each. Face-up cards are
  announced; face-down ones come out on Monday.

### A night is a story

Every night is a short episode of four to six beats, each one a different kind of
decision, with a time and a place on it:

> **10:15 p.m. — The Napkin.** Three banks on a napkin. A vote, and some of you have
> a private reason to want one of them. A tie goes to a die that shows which faces
> mean which bank before it lands.
>
> **11:40 p.m. — The Door.** One of you talks to whoever's on the door. Everybody
> else holds one fact about them, and passes it on — as written, turned around, or
> not at all.
>
> **11:52 p.m. — The Vault.** Grab or go, round after round, while the alarm gets
> twitchier. The Driver decides when the car leaves.
>
> **12:04 a.m. — The Car.** Two dice on the felt, and a moment for anybody holding
> something that bends them.
>
> **12:40 a.m. — Counting It Out.** How much of what you took goes in the Bag.

After Night One the director picks what comes next from what already happened:
rob the Castellanos' own bank and the next night is their retaliation. Across the
week there are thirteen nights to draw from — a warehouse full of Sal's things on
Pier 9, a fight on a casino boat, a Castellano wedding, an accountant in room 14 of
a motel, Father Dominic's tapes, Nonna's ring in a pawn shop window, an armored car
and a gym bag on the hood of a car at the end of a pier — and every one of them
branches, picks complications at random, and changes its details, so no two weeks
play the same. Between nights: the morning paper, Sal calling from county, a card
each. Twice a week, Prout sees everybody alone.

### Who knows what

Your cash is exact on your screen; everybody else's shows as a band — *broke*,
*getting by*, *flush* — until something opens their pockets. The Bag's total is
public; who put in what is not, except to the Numbers Guy. Anything said out loud
can be a lie. A doctored note in the Whispers is caught when every card is shown
next to every note — unless you held a Forgery — and one card in six is simply
wrong, and marked as such, so nobody can hide behind it.

### Seven to ten: two families

From seven players the table splits in two. The **Benedettos** need Sal to walk;
the **Castellanos**, across the river, need him convicted so the neighbourhood is
theirs by Christmas. Most nights the families are apart at the same time, each in
its own story — the Castellanos run Vinnie's collections, a card room with a cop at
table four, a shoebox of ledger pages at the pawn shop and seven crates off a
ferry. Some nights they share: a Castellano wedding, and a dawn raid by the Feds
where the safest place for your money is in the hands of somebody from the other
family. The Castellanos fill Vinnie's Envelope while the Benedettos fill the Bag;
whichever out-spends the other moves the Verdict. Each side may be harbouring
somebody who belongs to the other. The richest person still wins, whichever side
they were on.

The design, and the reasons for it, are in [`docs/COMPASS.md`](docs/COMPASS.md).

## Play it

| | |
|---|---|
| **Host a table** | Everybody on their own phone. The lobby shows a QR code and a link; everybody else scans it and types a name. |
| **Pass one device around** | One phone or laptop for the whole table. Anything private asks to be handed to the right person first. |
| **Play solo** | You against a table of ghosts with their own habits. |

```
node server.js      # then open http://localhost:8787
```

No dependencies, no build step, no accounts. The host is somebody's laptop; the QR
code points at its address on the wifi rather than at localhost.

**On GitHub Pages** (or any static host) there is no server, so the whole engine
runs in the browser. Pass-and-play and solo work as they do anywhere. For phones on
different devices, the tab that opens the table becomes the table, and the others
reach it directly over WebRTC — they only need a small introduction service to
find each other, which is `/signal` on the Node server, or anywhere you deploy it
(`render.yaml` and a `Dockerfile` are included). Point `public/config.js` at it, or
add `?signal=wss://…` to the URL. Game traffic never touches it.

`.github/workflows/pages.yml` publishes `public/` on every push to the default
branch.

### Built to survive the evening

- **The week is on disk.** Every change is written atomically; a crash, a restart
  or a flat battery picks up the same beat, the same hands and the same money. The
  random generator is one 32-bit number, so a resumed game deals exactly the cards
  it was always going to deal.
- **Reconnection is automatic.** Reload, change wifi, lock the phone — you get your
  seat back, and anything you tapped while the connection was away is sent when it
  returns.
- **The host is whoever is in the room.** If the person who opened the table leaves,
  somebody else picks up the controls.
- **Nothing a client sends can take it down**, and one broken table can never stop
  the others.

## Running it

| | |
|---|---|
| `npm start` | serve on `http://localhost:8787` |
| `PORT=3000 npm start` | serve somewhere else |
| `npm test` | whole weeks played by bots at every table size and both lengths, state saved and restored mid-game, views that keep secrets, pass-and-play and solo driven like the screens drive them, a week over real sockets, and a host that gets restarted, killed, flooded and fed garbage |
| `npm run dev` | restart on save |

## Layout

```
server.js                   http, static files, the socket upgrade, and /signal
src/net/wss.js              a small RFC 6455 server, no dependencies
src/broker.js               introduces two browsers to each other, and never sees the game
src/persist.js              the week on disk, atomically

public/engine/              the rules, and nothing about banks or grudges
  game.js                   one table: the week, beats, dice windows, offers, views,
                            and two families' nights running side by side
  engines/                  one file per kind of beat: vote, choose, roll, whispers,
                            grab, plan, draft, report, sitdown, story
  cards.js bots.js dice.js rng.js util.js

public/chapters/            the stories
  index.js                  every chapter, and the ones still to come
  sals-ledger/              Chapter 1
    index.js                the director: the week's plan and what comes next
    nights/                 every night, beat by beat, including the Castellanos' own
    families.js             seven to ten: two families, nights apart, the Envelope
    jobs.js secrets.js calls.js complications.js ending.js common.js

public/net/room.js          tables, seats, tokens, host migration — the same file the server runs
public/net/local.js         pass-and-play and solo, in the page
public/net/peer.js          browser-hosted tables over WebRTC, for static hosting
public/ui/                  the screens: door, lobby, the table, every beat, the dossier, Monday
public/app.js               one page, four ways of playing
public/style.css            green baize, one hard light, and paper you could pick up
public/qr.js                a QR encoder, so joining is a scan instead of a spelling test
```

## Adding a chapter

A chapter is a folder under `public/chapters/` that exports the same shape as
`sals-ledger/index.js`: its jobs, how it deals the week, how it picks each night,
its nights and their beats, and how it ends. The engine runs any of them; register
it in `public/chapters/index.js` and it appears on the door.
