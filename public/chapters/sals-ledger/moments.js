// Twenty minutes before: everybody's own little scene, all at the same time.
//
// Before most jobs everybody is somewhere else for a while — waiting in the
// car, practising in a mirror, walking past Sal's garden. Each person gets a
// moment of their own, picked from what they do, what they want, who they are
// and how the week is going, and makes one small choice in it. Nobody sees
// anybody else's; what shows up afterwards is only what the rest of the
// table would actually notice.

import { money } from './common.js';
import { personOf, gossip } from './bios.js';

const edge = (p, label) => (p.edges ??= []).push({ label });
const benedetto = (c, p) => c.familyOf(p.id) !== 'c';

/**
 * A moment: when it can happen to somebody, how likely, what it says, and
 * what they can do about it. Each option's `run` returns what they see.
 */
export const MOMENTS = [
  {
    id: 'red-light', weight: 3, when: (c, p) => p.job === 'driver',
    text: () => 'You’re idling at the light on Water Street when a patrol car pulls up alongside. The cop in the passenger seat is eating a meatball hero and looking at your plate.',
    options: [
      { id: 'nod', label: 'Nod at him', blurb: 'Friendly. Normal. Normal people nod.', run: () => 'He nods back, with sauce on his chin. The light changes. That was the whole thing.' },
      { id: 'side', label: 'Turn off and take the side streets', blurb: 'You’ll know the back way tonight. (+1 on your next roll.)',
        run: (c, p) => { edge(p, 'the side streets'); return 'You learn every alley between Water Street and the river, twice. (+1 on your next roll.)'; } },
      { id: 'stare', label: 'Stare straight ahead', blurb: 'Don’t look at him. Don’t look at him.',
        run: (c, p) => (c.rng.chance(0.5) ? (c.heat(p.id, 1, 'a cop with a meatball hero'), 'He writes something on his napkin. Your plate, probably. One heat.') : 'He loses interest in you and gets interested in his hero. The light changes.') },
    ],
  },
  {
    id: 'mirror', weight: 3, when: (c, p) => p.job === 'talker',
    text: () => 'You’re in the washroom at the Starlite, practising what you’ll say tonight into the mirror. The bartender comes in, and stands there, and watches you do it.',
    options: [
      { id: 'again', label: 'Do it again, from the top', blurb: 'Let him watch. (+1 on your next roll.)', run: (c, p) => { edge(p, 'the rehearsal'); return 'By the fourth time the bartender is mouthing along. You’ve got it. (+1 on your next roll.)'; } },
      { id: 'drink', label: 'Buy him a drink to forget it', blurb: '$5k is a lot for a drink. He tells you something for it.',
        run: (c, p) => { c.charge(p.id, 5000); const g = gossip(c, p); return `$5k lighter. He leans in. ${g ?? 'He doesn’t know anything, it turns out. He just likes drinks.'}`; } },
      { id: 'leave', label: 'Leave without a word', blurb: 'Dignity.', run: () => 'You leave. He tells everybody at the bar anyway.' },
    ],
  },
  {
    id: 'roof', weight: 2.5, when: (c, p) => p.job === 'lookout',
    text: () => 'You’re on a roof across the street with binoculars and a thermos. Two floors down, in a parked car with the engine off, a man in a raincoat is watching the same building you are.',
    options: [
      { id: 'plate', label: 'Take down his plate', blurb: 'Know who he is.',
        run: (c) => { const hidden = (c.s.caseLog ?? []).filter((e) => e.hidden).reduce((a, e) => a + e.delta, 0); return `The plate comes back to the DA’s motor pool. Prout’s man. ${hidden > 0 ? `So somebody has been feeding Prout: ${hidden} of what’s in his folder, nobody at the table has seen go in.` : 'At least he doesn’t seem to know anything you don’t.'}`; } },
      { id: 'pot', label: 'Knock a flowerpot off the ledge', blurb: 'Near his car, not on it. He’ll move. He might look up.',
        run: (c, p) => { edge(p, 'a clear street'); if (c.rng.chance(0.4)) { c.heat(p.id, 1, 'a flowerpot'); return 'He moves the car. He also looks up, for a long time. One heat, and a clear street. (+1 on your next roll.)'; } return 'He moves the car without looking up. A clear street. (+1 on your next roll.)'; } },
      { id: 'wait', label: 'Drink your coffee and wait', blurb: 'He’s not your problem. Yet.', run: () => 'He leaves at ten past. You never find out who he was.' },
    ],
  },
  {
    id: 'rematch', weight: 2.5, when: (c, p) => p.job === 'muscle',
    text: () => 'A man at the end of the bar at the Starlite recognises you from a fight in 1994 that he says was not a fair fight. He’d like a rematch. Outside. Now.',
    options: [
      { id: 'walk', label: 'Walk away', blurb: 'You have somewhere to be.', run: () => 'He calls you something as you go. It doesn’t follow you out the door.' },
      { id: 'oblige', label: 'Oblige him', blurb: 'It won’t take long. It might cost you.',
        run: (c, p) => { if (c.rng.chance(0.55)) { c.heat(p.id, 1, 'a fight outside the Starlite'); const n = c.give(p.id, 5000, 'a bet'); return `It takes forty seconds. Somebody had money on it: ${money(n)} for you. Somebody else called it in. One heat.`; } return 'It was, in fact, not a fair fight. You go to work tonight with a fat lip and a story nobody believes.'; } },
      { id: 'buy', label: 'Buy him a drink instead', blurb: 'Old enemies know things. $5k.',
        run: (c, p) => { c.charge(p.id, 5000); const g = gossip(c, p); return `You end up laughing about 1994. ${g ? `Then, quieter: ${g}` : 'He knows nothing. He’s just lonely.'}`; } },
    ],
  },
  {
    id: 'payphone', weight: 1.5, when: () => true,
    text: () => 'The payphone on the corner of Ferry and Fifth starts ringing as you walk past it. It keeps ringing. There’s nobody else on the street.',
    options: [
      { id: 'answer', label: 'Answer it', blurb: 'Somebody wants somebody.',
        run: (c, p) => {
          const r = c.rng.pick(['sal', 'wrong', 'prout', 'gossip']);
          if (r === 'sal' && benedetto(c, p)) { edge(p, 'Sal on the payphone'); return 'It’s Sal, from county, on somebody else’s phone card. “Whoever this is: be careful tonight.” (+1 on your next roll.)'; }
          if (r === 'prout') return 'A man’s voice: “Is this the pay phone on Ferry and Fifth?” Then, after a pause, very politely: “Thank you.” He hangs up. You know that voice from the television.';
          const g = gossip(c, p);
          return g ? `A woman, fast, thinking you’re somebody else: ${g} Then she hangs up.` : 'It’s a wrong number. A woman wants to know if Tony is coming to dinner. You tell her yes.';
        } },
      { id: 'walk', label: 'Keep walking', blurb: 'It’s not for you. It’s never for you.', run: () => 'It rings until you turn the corner. Then it stops, which is worse.' },
    ],
  },
  {
    id: 'rain', weight: 1.5, when: () => true,
    text: () => 'It starts to rain, hard, all at once. You duck into St. Anthony’s. The church is empty except for Father Dominic, who is in the confessional with the little light on.',
    options: [
      { id: 'confess', label: 'Go in', blurb: 'He wipes a word off your seat, or he blesses you.',
        run: (c, p) => { if (p.stamps?.length) { const w = p.stamps.shift(); return `Father Dominic is very tired. He says it’s fine. The word “${w}” comes off your seat.`; } edge(p, 'a quick blessing'); return 'You have nothing much to confess. He blesses you anyway, for the practice. (+1 on your next roll.)'; } },
      { id: 'candle', label: 'Light a candle for Sal', blurb: 'A dollar in the box, a candle for Sal.', run: (c, p) => { edge(p, 'a candle for Sal'); return 'The candle takes on the second match. (+1 on your next roll.)'; } },
      { id: 'wait', label: 'Wait out the rain in the back pew', blurb: 'It’s warm, and nobody asks you anything.', run: () => 'The rain stops at the end of the fourth decade of somebody’s rosary.' },
    ],
  },
  {
    id: 'sfogliatelle', weight: 1.2, once: true, when: () => true,
    text: () => 'The bakery on Fifth is closing, and the baker, who owes Sal from years back, hands you the last tray of sfogliatelle through the door. “For the crew,” he says. “Don’t tell Nonna they’re from yesterday.”',
    options: [
      { id: 'share', label: 'Bring them to the crew', blurb: 'Everybody gets one. People remember who brought pastry.',
        run: (c, p) => {
          const held = c.players.filter((q) => (q.grudges?.[p.id] ?? 0) > 0);
          c.line(`${p.name} turned up with a tray of sfogliatelle. Everybody had one.`);
          if (held.length) { const q = c.rng.pick(held); q.grudges[p.id] -= 1; return `${q.name} eats two, and some of what they had against you goes with them. (One grudge against you is gone.)`; }
          return 'Nobody says thank you. Everybody has one. That’s thank you.';
        } },
      { id: 'eat', label: 'Eat them on the stoop', blurb: 'All of them. It’s been a week.', run: () => 'All six. On the stoop. In the dark. You regret nothing.' },
    ],
  },
  {
    id: 'wallet', weight: 1.2, once: true, when: () => true,
    text: () => 'There’s a wallet on the sidewalk outside the deli. Inside: a lot of cash, a Knicks season ticket, and no ID.',
    options: [
      { id: 'keep', label: 'Keep it', blurb: '$10k in it. Somebody will miss it.',
        run: (c, p) => { const n = c.give(p.id, 10000, 'a wallet'); if (c.rng.chance(0.35)) { c.heat(p.id, 1, 'a detective’s wallet'); return `${money(n)}. The season ticket has a precinct parking pass tucked behind it. It was a detective’s wallet. One heat.`; } return `${money(n)}, and a season ticket you will never use.`; } },
      { id: 'hand-in', label: 'Hand it in at the 9th Precinct', blurb: 'Somebody will notice. Maybe the right somebody.',
        run: (c, p) => { if (p.heat > 0) { p.heat -= 1; return 'The desk sergeant knows the wallet. It’s the lieutenant’s. He looks at you differently after that. One heat cools off.'; } return 'The desk sergeant writes down your name, for a thank-you letter. You would rather he hadn’t.'; } },
      { id: 'leave', label: 'Leave it where it is', blurb: 'Not your wallet. Not your problem.', run: () => 'When you walk back past an hour later, it’s gone. So is the deli guy.' },
    ],
  },
  {
    id: 'raincoats', weight: 3, when: (c, p) => p.heat >= 2,
    text: () => 'Your landlady catches you on the stairs. Two men in raincoats came asking for you this afternoon. She told them you’d moved to Florida. She wants you to know she lies very well.',
    options: [
      { id: 'sleep', label: 'Sleep somewhere else tonight', blurb: 'Your cousin’s couch. The springs are a story.', run: (c, p) => { p.heat = Math.max(0, p.heat - 1); return 'You don’t go home. The couch is awful. One heat cools off.'; } },
      { id: 'tip', label: 'Tip her $5k for Florida', blurb: 'Keep Florida going.', run: (c, p) => { c.charge(p.id, 5000); p.heat = Math.max(0, p.heat - 1); return 'She takes it without counting it. When they come back tomorrow you’ll be in Florida for good. One heat cools off.'; } },
      { id: 'shrug', label: 'Shrug it off', blurb: 'Raincoats come, raincoats go.', run: () => 'She shakes her head at you and goes back to her soap opera.' },
    ],
  },
  {
    id: 'garden', weight: 2, when: (c, p) => ['godchild', 'tomato'].includes(p.bio),
    text: (c, p) => `You walk past Sal’s garden on Mulberry Avenue. Nobody has watered the tomatoes since Monday. ${p.bio === 'tomato' ? 'They are, you have to admit, magnificent.' : 'Sal would be sick if he could see them.'}`,
    options: [
      { id: 'water', label: 'Water the tomatoes', blurb: 'Sal will hear about it. Sal hears about everything.', run: (c, p) => { edge(p, 'the tomatoes’ luck'); return 'You water every one of them. A neighbour watches from her window and nods. Sal will know by morning. (+1 on your next roll.)'; } },
      { id: 'pick', label: 'Pick one', blurb: 'Just one. For the road.', run: () => 'It is the best tomato you have ever eaten. You will never tell anybody.' },
      { id: 'walk', label: 'Keep walking', blurb: 'Tomatoes are not the point this week.', run: () => 'You keep walking. You think about the tomatoes all night.' },
    ],
  },
  {
    id: 'booth', weight: 2, when: (c, p) => p.bio === 'booth',
    text: () => 'Dolores waves you into the diner through the window, sits you in the back booth, and puts a plate of eggs in front of you without asking what you want.',
    options: [
      { id: 'eat', label: 'Eat', blurb: 'You don’t say no to Dolores.', run: (c, p) => { edge(p, 'Dolores’s eggs'); return 'She watches you eat every bite. “Now go.” (+1 on your next roll.)'; } },
      { id: 'ask', label: 'Ask her what she’s heard', blurb: 'She hears everything in that booth.', run: (c, p) => gossip(c, p) ?? 'She says it’s been quiet. It hasn’t. She just isn’t saying.' },
    ],
  },
  {
    id: 'precinct', weight: 2, when: (c, p) => p.bio === 'partner',
    text: () => 'Ray Mancuso’s car is parked outside the 9th Precinct with Ray in it, eating sunflower seeds. He sees you. He doesn’t wave. He rolls the window down two inches.',
    options: [
      { id: 'knock', label: 'Lean on the window', blurb: 'He owes you for 1989.', run: (c, p) => { if (p.heat > 0) { p.heat -= 1; return 'Ray spits a shell. “There was a sheet with your name on it. There isn’t now. We’re square for 1989.” (He will not think you’re square.) One heat off.'; } return `Ray spits a shell. “Prout’s folder is at ${c.caseFileValue}. Whatever you’re doing tonight, do it quietly.”`; } },
      { id: 'walk', label: 'Walk on', blurb: 'Not here. Not in front of the precinct.', run: () => 'You walk on. In the reflection of a shop window, you see him watch you all the way to the corner.' },
    ],
  },
  {
    id: 'gym', weight: 2, when: (c, p) => p.bio === 'boxer',
    text: () => 'Walt Kowalski is locking up the PAL gym when you pass. He tosses you the keys without looking. “Lock it after. And keep your left up.”',
    options: [
      { id: 'bag', label: 'Twenty minutes on the heavy bag', blurb: 'Like old times. (+1 on your next roll.)', run: (c, p) => { edge(p, 'twenty minutes on the bag'); return 'Your hands remember before you do. (+1 on your next roll.)'; } },
      { id: 'lock', label: 'Lock up and go', blurb: 'You have somewhere to be.', run: () => 'You lock up. You leave the keys where he’ll find them. He always does.' },
    ],
  },
  {
    id: 'homeroom', weight: 2, when: (c, p) => p.bio === 'homeroom',
    text: () => 'Wendell Prout jogs past you on Ferry Street in a tracksuit, turns round, jogs back, and stops. “I thought that was you.” He’s not out of breath. “If you ever want to talk. For old times’ sake.”',
    options: [
      { id: 'talk', label: 'Talk', blurb: 'He tells you something. He hears something. Nobody saw you, probably.',
        run: (c, p) => { c.caseFile(1, 'an old classmate, on Ferry Street', true); const g = gossip(c, p); return `You talk for five minutes. You tell him less than he wants and more than you meant to. ${g ?? ''} (The folder gets one thicker, and nobody sees it.)`; } },
      { id: 'no', label: '“Not tonight, Wendell.”', blurb: 'He hates Wendell.', run: () => 'He hates Wendell. He jogs off. You feel twelve years old, in a good way.' },
    ],
  },
  {
    id: 'student', weight: 2, when: (c, p) => p.bio === 'student',
    text: () => 'The payphone at the gas station rings as you fill up. It’s Gary. He’s whispering. He wants to know if you’re eating properly, and then he wants to talk about the ledger.',
    options: [
      { id: 'listen', label: 'Let him talk', blurb: 'He knows the book better than Sal does.', run: (c, p) => { const pages = c.others(p.id).filter((q) => q.cards.some((x) => x.id === 'ledger-page')); return pages.length ? `Gary: “Somebody asked me about page forty. ${c.rng.pick(pages).name} has it, I’d bet my life. I’m betting my life on a lot of things right now.”` : 'Gary talks about carrying the one for twenty minutes. By the end he sounds calmer. So do you.'; } },
      { id: 'hang', label: '“Not on this phone, Gary.”', blurb: 'Phones listen.', run: () => '“Right. Right. Sorry.” He hangs up. You feel bad about it for an hour.' },
    ],
  },
  {
    id: 'rosemarie', weight: 2, when: (c, p) => p.bio === 'ex',
    text: () => 'Rosemarie Castellano pulls up next to you in her father’s Lincoln, rolls down the window, and says your name like it’s 1996.',
    options: [
      { id: 'get-in', label: 'Get in', blurb: 'Twenty minutes around the block. She knows what her father’s planning.',
        run: (c, p) => { edge(p, 'Rosemarie’s warning'); return `Twenty minutes around the block with the radio on. “Be careful tonight,” she says, and drops you at the corner. ${c.flag('war') ? '“He hasn’t forgiven the credit union.”' : '“He likes your Nonna. He’d never say it.”'} (+1 on your next roll.)`; } },
      { id: 'wave', label: 'Wave her on', blurb: 'That was 1996.', run: () => 'She waves back with two fingers, like she used to, and drives off.' },
    ],
  },
  {
    id: 'rat-car', weight: 4, when: (c, p) => p.secret?.id === 'rat',
    text: () => 'A grey sedan pulls up beside you at the bus stop. The back window comes down two inches. Prout’s voice, polite and tired: “Anything for me tonight?”',
    options: [
      { id: 'small', label: 'Give him something small', blurb: '$10k from Prout. The folder gets thicker, and nobody sees it.',
        run: (c, p) => { const n = c.give(p.id, 10000, 'Prout'); c.caseFile(1, 'a word at a bus stop', true); return `An envelope comes out through the gap: ${money(n)}. The window goes up. (The folder gets one thicker, and nobody sees it.)`; } },
      { id: 'no', label: '“Not tonight.”', blurb: 'He’ll ask again.', run: () => '“Tomorrow, then.” The window goes up. The sedan pulls away at exactly the speed limit.' },
    ],
  },
  {
    id: 'nonna-phone', weight: 3, when: (c, p) => p.secret?.id === 'nonnas-favourite' || p.job === 'cousin',
    text: () => 'The phone in the phone box you’re walking past rings. It’s Nonna. She knows where you are. She always knows where you are. She wants to know if you’ve eaten.',
    options: [
      { id: 'plate', label: 'Go by for a plate', blurb: 'Twenty minutes. She’ll send you off with something.', run: (c, p) => { const n = c.give(p.id, 5000, 'Nonna'); edge(p, 'Nonna’s blessing'); return `Braciole, and ${money(n)} folded under the plate, and a kiss on the forehead at the door. (+1 on your next roll.)`; } },
      { id: 'lie', label: 'Tell her you’ve eaten', blurb: 'You haven’t.', run: () => '“You haven’t,” she says, and hangs up.' },
    ],
  },
  {
    id: 'cousin-bakery', weight: 3, when: (c, p) => p.secret?.id === 'cousins' && c.p(p.secret.partner) && !c.isAway(p.secret.partner),
    text: (c, p) => `You run into ${c.name(p.secret.partner)} outside the bakery on Fifth. Neither of you mentions your grandmother. Both of you are thinking about her.`,
    options: [
      { id: 'talk', label: 'Talk about her', blurb: 'For once. You both get something out of it.',
        run: (c, p) => { edge(p, 'Grandma’s picture'); c.note(p.secret.partner, `You ran into ${p.name} outside the bakery. You talked about your grandmother for the first time in years. It helped.`, 'the bakery'); return `You talk about her for twenty minutes. She would have liked tonight, you both decide. (+1 on your next roll.)`; } },
      { id: 'nod', label: 'Nod and keep walking', blurb: 'Nobody can know.', run: () => 'You nod. They nod. Nobody can know.' },
    ],
  },
  {
    id: 'vinnie-driver', weight: 2, when: (c, p) => c.familyOf(p.id) === 'c',
    text: () => 'Vinnie’s driver drops you at the corner, leans over, and says Vinnie says good luck tonight. Vinnie has never once said good luck.',
    options: [
      { id: 'ask', label: 'Ask what he meant', blurb: 'The driver knows things.', run: (c, p) => { const g = gossip(c, p); return g ? `The driver shrugs. Then: ${g}` : 'The driver shrugs. “He meant good luck.”'; } },
      { id: 'thanks', label: '“Tell him thank you.”', blurb: 'Manners.', run: (c, p) => { edge(p, 'Vinnie’s good luck'); return 'The driver smiles for the first time in the six years you’ve known him. (+1 on your next roll.)'; } },
    ],
  },
];

/**
 * Which moment each free person gets: never one they've had this week, never
 * the same as somebody else's tonight, and the one-offs (a wallet on the
 * sidewalk, a tray of pastry) only once a week for the whole table.
 */
export function dealMoments(c) {
  const out = {};
  const tonight = new Set();
  const week = new Set(c.flag('momentsOnce') ?? []);
  for (const p of c.rng.shuffle(c.free.slice())) {
    const had = new Set(p.moments ?? []);
    const pool = MOMENTS.filter((m) => !had.has(m.id) && !tonight.has(m.id) && !(m.once && week.has(m.id)) && m.when(c, p));
    if (!pool.length) continue;
    const total = pool.reduce((a, m) => a + m.weight, 0);
    let r = c.rng() * total;
    let pick = pool[pool.length - 1];
    for (const m of pool) { r -= m.weight; if (r <= 0) { pick = m; break; } }
    out[p.id] = pick.id;
    tonight.add(pick.id);
    if (pick.once) week.add(pick.id);
    (p.moments ??= []).push(pick.id);
  }
  c.set('momentsOnce', [...week]);
  return out;
}

const byId = Object.fromEntries(MOMENTS.map((m) => [m.id, m]));

export const MOMENT_BEAT = {
  engine: 'choose', title: 'Twenty Minutes', kicker: 'A MOMENT TO YOURSELF',
  time: 'Earlier', place: 'All over the neighbourhood',
  when: (c) => c.free.length > 0,
  enter(c) { c.memo.moments = dealMoments(c); },
  text: () => [
    'Before anything happens tonight, everybody is somewhere else for twenty minutes. Nobody sees what anybody else does with them.',
  ],
  who: (c) => Object.keys(c.memo.moments ?? {}).filter((id) => c.p(id) && !c.isAway(id)),
  intro: (c, pid) => {
    const m = byId[c.memo.moments?.[pid]];
    return m ? m.text(c, c.p(pid)) : null;
  },
  options: (c, pid) => {
    const m = byId[c.memo.moments?.[pid]];
    return m ? m.options.map((o) => ({ id: o.id, label: o.label, blurb: o.blurb, lean: o.lean })) : [];
  },
  resolve(c, { choices }) {
    for (const [pid, ch] of Object.entries(choices)) {
      const m = byId[c.memo.moments?.[pid]];
      const o = m?.options.find((x) => x.id === ch.option);
      if (!o) continue;
      const said = o.run(c, c.p(pid));
      if (said) c.note(pid, said, 'twenty minutes');
    }
    c.line('Twenty minutes later, everybody is where they’re supposed to be. More or less.');
  },
};

// ------------------------------------------------------------- after --
//
// Every night used to end on the count and cut to morning. Now it ends at the
// table it started from, with whoever made it back, and a question for the
// room to argue about out loud.

const PROMPTS = {
  b: [
    '“Who did what they said they’d do tonight?” Nonna asks. Say it out loud. Say it to their face.',
    '“Somebody at this table isn’t telling me something,” Nonna says, to nobody in particular. Talk.',
    '“Who do you trust tomorrow?” Nonna asks. Everybody says one name, out loud, round the table.',
    '“Tell me one thing that went wrong tonight, and whose fault it was,” Nonna says. She waits.',
    '“If Sal walked in right now,” Nonna says, “who would he thank, and who would he look at?” Answer her.',
  ],
  c: [
    '“Who earned their money tonight?” Vinnie asks. Say it out loud.',
    '“Somebody across the river knows more than they should,” Vinnie says. “Who have you talked to?” Talk.',
    '“Who do I send tomorrow?” Vinnie asks. Everybody says one name, out loud.',
  ],
};

const CLOSERS = {
  b: [
    'At four the radio plays Dean Martin. Nobody turns it off.',
    'Nonna falls asleep in her chair with the Bag on her lap. Nobody wakes her.',
    'Somebody does the dishes. Nobody sees who.',
    'Outside, the first bakery truck of the morning goes by, and the whole kitchen smells of bread for a minute.',
    'Sal’s chair is still empty. Nobody sits in it. The Bag sits in front of it instead.',
  ],
  c: [
    'Somebody racks the balls on the pool table and nobody plays.',
    'Vinnie reads the obituaries. He says he reads them for the competition.',
    'The photograph of Vinnie’s father with Sinatra watches everybody leave.',
  ],
};

/** Something from a list nobody has heard yet this week, until they all have. */
function fresh(c, key, list) {
  const used = new Set(c.flag(key) ?? []);
  const left = list.filter((x) => !used.has(x));
  const pick = c.rng.pick(left.length ? left : list);
  c.set(key, left.length ? [...used, pick] : [pick]);
  return pick;
}

function nonnaOnTheBag(c) {
  const start = c.s.night?.bagStart ?? c.bag.total;
  const delta = c.bag.total - start;
  const perNight = Math.max(1, c.bag.target / 6);
  if (delta <= 0) return 'Nonna looks at the Bag, then at each of you in turn, and says nothing at all, which is the worst thing she can say.';
  if (delta < perNight * 0.5) return `“It’s something,” Nonna says, about ${money(delta)}. It isn’t, and everybody at the table knows it.`;
  if (delta < perNight * 1.2) return `Nonna counts the ${money(delta)} twice and puts her hand flat on top of the Bag, like it might get away.`;
  return `${money(delta)}. Nonna pours everybody a grappa, including herself, which nobody has seen her do since 1994.`;
}

function vinnieOnTheEnvelope(c) {
  const start = c.s.night?.envStart ?? 0;
  const delta = (c.s.envelope?.total ?? 0) - start;
  if (delta <= 0) return 'Vinnie looks into the cigar box, closes it, and asks how everybody’s mothers are. It is not a question.';
  return `Vinnie weighs the Envelope in his hand — ${money(delta)} heavier — and nods once. From Vinnie, that is a parade.`;
}

export const AFTER_BEAT = {
  engine: 'story', title: 'Afterwards', kicker: 'BEFORE ANYBODY GOES HOME',
  time: 'Late',
  place: (c) => (c.track === 'c' ? 'The back room of Vinnie’s club' : 'Nonna’s kitchen'),
  text(c) {
    const side = c.track === 'c' ? 'c' : 'b';
    const mine = (p) => (side === 'c' ? c.familyOf(p.id) === 'c' : c.familyOf(p.id) !== 'c');
    const out = [];
    const inside = c.players.filter((p) => mine(p) && p.jailUntil != null && p.jailUntil >= c.s.week.n);
    const home = c.players.filter((p) => mine(p) && !inside.includes(p));
    out.push(side === 'c'
      ? `Back at the club, after hours: ${c.list(home.map((p) => p.name)) || 'nobody'}, and Vinnie, in his cardigan, at the card table.`
      : `Back in Nonna’s kitchen at the end of it: ${c.list(home.map((p) => p.name)) || 'nobody'}, and Nonna, who never went to bed.`);
    if (inside.length) {
      out.push(`${c.list(inside.map((p) => p.name))} ${inside.length === 1 ? 'isn’t' : 'aren’t'} coming back tonight. ${side === 'c' ? 'Vinnie has somebody call a lawyer who isn’t Morty.' : `Nonna sets ${inside.length === 1 ? 'a place' : 'places'} anyway.`}`);
    }
    out.push(side === 'c' ? vinnieOnTheEnvelope(c) : nonnaOnTheBag(c));
    const thicker = c.caseFileValue - (c.s.night?.fileStart ?? c.caseFileValue);
    if (thicker > 0) out.push(side === 'c' ? 'Across the river, Prout’s folder got thicker tonight. Vinnie smiles at nothing.' : `Across town, Prout’s folder got ${thicker === 1 ? 'a page' : `${thicker} pages`} thicker tonight. You can feel it from here.`);
    out.push(fresh(c, `closers:${side}`, CLOSERS[side]));
    out.push(fresh(c, `prompts:${side}`, PROMPTS[side]));
    return out;
  },
};

/** Where in each night the twenty minutes go: before the job starts. */
export const MOMENT_AT = {
  'three-banks': 1, 'night-guard': 1, 'bookies-box': 1, 'armored-car': 1, 'counting-house': 1,
  drop: 1, cleanup: 1, motel: 0, confessional: 1, retaliation: 2, ring: 1,
  'c-collection': 1, 'c-card-room': 1, 'c-pages': 1, 'c-bridge': 1,
};

export { personOf };
