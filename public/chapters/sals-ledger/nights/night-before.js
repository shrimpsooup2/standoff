// The last night: dinner at Dolores's, Sal's last call, Prout's last offer,
// and the last count.

import { counting, money, nightDay, nightKicker, biggestGiver } from '../common.js';
import { roomBeat } from './the-room.js';

const SPECIALS = [
  'The special is veal parm, which Dolores only makes for funerals and acquittals.',
  'Dolores has made the lasagna. Nobody asked her to. Everybody understands what it means.',
  'There is a cake on the counter under a glass dome. Nobody knows who it’s for. Dolores isn’t saying.',
  'The jukebox is unplugged. Dolores says it’s broken. It isn’t broken.',
];

export default {
  id: 'night-before', title: 'The Night Before', act: 3, day: nightDay, kicker: nightKicker,
  beats: [
    'dinner',
    { oneOf: [
      { beat: 'bottle', weight: 3, when: (c) => c.flag('war') && c.flag('truce') !== 'accept' },
      { beat: 'gary-car', weight: 3, when: (c) => c.flag('gary') === 'basement' },
      { beat: 'ray', weight: 1.5 },
      { beat: 'lights', weight: 1 },
      { beat: null, weight: 0.6 },
    ] },
    'last-call',
    'room',
    'count',
  ],
  close(c) {
    const short = c.bag.target - c.bag.total;
    c.remember(
      short > 0
        ? `Salvatore Benedetto, 71, goes before Judge Albert Finnegan in courtroom 4B this morning. A source close to the family says his legal fees are “not entirely settled.” Morty Klein, for the defence, declined to comment, and then commented for twenty minutes.`
        : `Salvatore Benedetto, 71, goes before Judge Albert Finnegan in courtroom 4B this morning. His lawyer, Morty Klein, says his client is “an innocent gardener” and “fully paid up, which is more than I can say for most of you.”`,
      { courier: 'BENEDETTO TRIAL OPENS TODAY' },
    );
  },
  defs: {
    dinner: {
      engine: 'sitdown', time: '8:00 P.M.', place: 'Dolores’s diner, Ferry Street', title: 'Dinner at Dolores’s', kicker: 'EVERYTHING’S NEGOTIABLE',
      text(c) {
        const room = c.flag('war') && c.flag('truce') !== 'accept'
          ? 'The Castellanos have the booth by the window. Vinnie raises a glass to you and doesn’t drink from it.'
          : c.rng.pick([
            'Ray Mancuso is at the counter, pretending to read the paper. It’s upside down.',
            'Father Dominic is in the corner booth with a slice of pie and his eyes closed. He says he is praying. He is asleep.',
            'Nobody else is in. Dolores turned the sign round at seven.',
          ]);
        return [
          `Dolores closed early and pulled the blinds for you, which she has done for the Benedettos maybe four times in thirty years. ${c.rng.pick(SPECIALS)} ${room}`,
          'This is the last time you’ll all sit down before Monday. Make your deals now — an IOU, an oath, a trade. Anything signed on the screen, the game enforces. Anything said out loud is just said. Dolores is selling, too.',
        ];
      },
      resolve(c, { oaths, ious }) {
        if (oaths.length >= 2) c.line('Dolores watched the handshakes and poured everybody a grappa on the house. “To Monday,” she said. Nobody said it back.');
      },
    },

    bottle: {
      engine: 'vote', time: '9:40 P.M.', place: 'Dolores’s diner', title: 'A Bottle from Table Six', kicker: 'A VOTE',
      text: () => [
        'Dolores brings over a bottle of 1997 Barolo. “From the gentleman by the window,” she says, in a voice that means she’d rather not have carried it. Vinnie Castellano smiles and lifts his glass.',
        'Send it back, drink it, or send back something better. The whole diner is watching the bottle.',
      ],
      options: (c) => [
        { id: 'drink', label: 'Drink it', blurb: 'It’s a good bottle. It might also be a message.', risk: 0.5, reward: 0.4 },
        { id: 'return', label: 'Send it back', blurb: 'Unopened. Vinnie will take it the way Vinnie takes everything.', risk: 0.6, reward: 0.3 },
        { id: 'better', label: 'Send back something better', blurb: `${money(c.scale(20000))} of Dolores’s best out of the Bag. The kind of thing that gets remembered.`, risk: 0.2, reward: 0.6 },
      ],
      resolve(c, { choice }) {
        if (choice === 'drink') {
          if (c.rng.chance(0.6)) { c.line('It was just a very good bottle of wine. Vinnie nodded once when you drank it. Somehow that was worse.'); return; }
          c.line('There was a card tied to the neck. It said: “Prout says hello.” The Castellanos have been talking, and they want you to know it.');
          c.caseFile(1, 'the Castellanos have been talking to Prout');
          return;
        }
        if (choice === 'return') {
          c.set('insultedVinnie', true);
          c.line('Vinnie watched the bottle come back unopened, laughed, and said something to his brother that made his brother stop laughing. He’ll be in court tomorrow. Front row.');
          return;
        }
        const n = c.bagTake(c.scale(20000));
        const who = biggestGiver(c) ?? c.rng.pick(c.free).id;
        c.line(`${money(n)} out of the Bag, and a bottle of 1982 Brunello to table six. Vinnie read the label, stood up, and came over. He shook hands with ${c.name(who)} and left something in their palm.`);
        if (!c.flag('photoGiven')) {
          c.set('photoGiven', who);
          c.card(who, 'the-photo');
          c.note(who, 'Vinnie pressed a photograph into your hand: Prout at a Castellano wedding in 2019, holding a cannoli. “I never liked him either,” he said.', 'Vinnie Castellano');
        }
      },
    },

    'gary-car': {
      engine: 'vote', time: '9:40 P.M.', place: 'A payphone outside Dolores’s', title: 'Gary Wants a Car', kicker: 'A VOTE',
      text: () => [
        'The payphone outside rings. Dolores answers it, listens, and holds it out through the door. It’s Gary Feld, from the basement. He has eaten everything down there, including something he thinks might have been dog food, and he wants to go home.',
        '“Get me a car,” he says. “Get me a car and I’m in Arizona by Wednesday and I never read anything in my life.”',
      ],
      options: (c) => [
        { id: 'car', label: 'Get Gary a car', blurb: `${money(c.scale(30000))} out of the Bag. Gary goes to Arizona and never testifies.`, risk: 0.1, reward: 0.4 },
        { id: 'keep', label: 'Keep him in the basement', blurb: 'One more night. Gary is not good at one more night.', risk: 0.5, reward: 0.5 },
        { id: 'sister', label: 'Send him to his sister’s', blurb: 'Free. His sister lives four blocks from the courthouse.', risk: 0.7, reward: 0.5 },
      ],
      resolve(c, { choice }) {
        if (choice === 'car') {
          const n = c.bagTake(c.scale(30000));
          c.set('gary', 'arizona');
          c.line(`${money(n)} out of the Bag for a 2009 Corolla with Arizona plates. Gary cried a bit. He left a note for Nonna that said “thank you for the soup.”`);
          return;
        }
        if (choice === 'keep') {
          if (c.rng.chance(0.65)) { c.line('Gary stayed. He complained about it until two in the morning, then fell asleep on the washing machine.'); return; }
          c.set('gary', 'prout');
          c.line('Gary went out for cigarettes at midnight. He didn’t come back. He did turn up, eventually, at the District Attorney’s office.');
          c.caseFile(2, 'Gary Feld walked into Prout’s office');
          return;
        }
        if (c.rng.chance(0.5)) { c.set('gary', 'sister'); c.line('Gary went to his sister’s. She made him a sandwich and told him to keep his mouth shut, which is the best advice he’s had all week.'); return; }
        c.set('gary', 'prout');
        c.line('Gary’s sister made him a sandwich and then called Prout, because she is a responsible citizen and also still angry about 1996.');
        c.caseFile(2, 'Gary Feld is on the witness list');
      },
    },

    ray: {
      engine: 'choose', time: '9:40 P.M.', place: 'The counter at Dolores’s', title: 'Ray Mancuso’s Last Offer', kicker: 'YOUR CALL',
      text: () => [
        'Ray Mancuso finishes his coffee, leaves exactly no tip, and on his way out stops at each of your chairs. To each of you he says the same thing, quietly: for $15k, whatever’s been written down about you tonight goes missing.',
        'Ray has a lot of payrolls. Nobody sees what you decide.',
      ],
      who: (c) => c.free.map((p) => p.id),
      options: (c, pid) => [
        { id: 'pay', label: 'Pay Ray $15k', blurb: 'Every bit of your heat goes away. If Ray sells it on, it comes back as something worse.', disabled: c.p(pid).cash < 15000 ? 'You don’t have $15k.' : (c.p(pid).heat === 0 ? 'You have no heat for Ray to lose.' : null) },
        { id: 'no', label: 'No thanks, Ray', blurb: 'He shrugs. Ray always shrugs.', honest: true },
      ],
      fallback: () => ({ option: 'no' }),
      bot(c, p) { return p.heat >= 2 && p.cash >= 15000 && c.rng.chance(0.7) ? { option: 'pay' } : { option: 'no' }; },
      resolve(c, { choices }) {
        const payers = Object.entries(choices).filter(([, ch]) => ch.option === 'pay').map(([pid]) => pid);
        if (!payers.length) { c.line('Ray left with nothing but his coffee. He looked a little hurt.'); return; }
        for (const pid of payers) { c.charge(pid, 15000); c.p(pid).heat = 0; }
        c.line(payers.length === 1 ? 'Somebody paid Ray. Ray left whistling.' : `${payers.length} of you paid Ray. Ray left whistling, which is never good news.`);
        if (c.rng.chance(0.35)) {
          c.line('Ray has a lot of payrolls. Tomorrow Prout will have a very interesting list of people who paid a detective in cash.');
          c.caseFile(1, 'Ray Mancuso sold a list');
        }
      },
    },

    lights: {
      engine: 'roll', time: '10:15 P.M.', place: 'Ferry Street', title: 'The Lights Go Out', kicker: 'THE DICE',
      text: () => [
        'Every light on Ferry Street goes out at once. In the dark somebody tries the diner’s back door, very gently. Dolores reaches under the counter for something she has kept there since 1979.',
        'Whoever that is, they’ve come for the Bag.',
      ],
      target: () => 7,
      who: (c) => c.free.map((p) => p.id),
      label: 'Holding the back door',
      stakes: (c) => `Miss it and whoever is out there gets into the Bag — about ${money(c.scale(30000))}.`,
      resolve(c, r) {
        if (r.success) { c.line('Somebody held the door. Somebody else found a flashlight. Whoever was out there ran, and Dolores put the thing back under the counter, a little disappointed.'); return; }
        const n = c.bagTake(c.scale(30000));
        c.line(`When the lights came back the Bag was open on the table and ${money(n)} lighter. The back door was swinging. Nobody got a look at them.`);
      },
    },

    'last-call': {
      engine: 'story', time: '11:00 P.M.', place: 'The phone behind Dolores’s counter', title: 'Sal’s Last Call', kicker: 'THE WEEK',
      run(c) {
        if (!c.flag('seedTin')) {
          const who = c.byJob('cousin') && !c.isAway(c.byJob('cousin').id) ? c.byJob('cousin').id : biggestGiver(c) ?? c.rng.pick(c.free.length ? c.free : c.players).id;
          c.set('seedTinGiven', who);
          c.card(who, 'seed-tin');
          c.note(who, 'Sal told you where the seed tin is: under the third tomato plant, wrapped in a Knicks towel. You dug it up. It’s yours to give to Nonna.', 'Sal');
        }
      },
      text(c) {
        const out = [];
        const short = c.bag.target - c.bag.total;
        const open = c.rng.pick([
          'Dolores holds the phone out across the counter. “It’s him,” she says. Everybody knows who him is.',
          'The diner phone rings at eleven exactly. Dolores doesn’t even pick it up; she just hands the whole phone over the counter.',
        ]);
        out.push(open);
        if (short > 0) out.push(`“Morty tells me we’re ${money(short)} short. I’m not angry. I’m in prison, I can’t afford to be angry. But I want you to think about ${money(short)}.”`);
        else out.push('“Morty says he’s paid. He sounded surprised. Good. I like it when Morty is surprised.”');
        if (c.caseFileValue >= 6) out.push('“Prout’s folder. I saw him carry it past the window today. He needed two hands.”');
        else if (c.caseFileValue <= 2) out.push('“Prout walked past my cell today and didn’t even look in. That’s a man with nothing. I know the look. I’ve had the look.”');
        if (c.flag('ring') === 'real') out.push('“Ma wore the ring on the phone. You can’t see a ring on the phone. She wanted me to know anyway.”');
        const liar = c.players.find((p) => p.stamps.includes('LIAR'));
        if (liar && c.rng.chance(0.6)) out.push(`“And ${liar.name}. I hear things. I hear you tell stories. Tomorrow, no stories.”`);
        const tin = c.flag('seedTinGiven');
        if (tin && !c.flag('seedTinTold')) {
          c.set('seedTinTold', true);
          out.push(`Before he hangs up he asks for ${c.name(tin)}, and says something to them nobody else can hear.`);
        }
        out.push(c.rng.pick([
          '“Water the tomatoes. Tomorrow, whatever happens, somebody water the tomatoes.”',
          '“Whatever happens tomorrow, you were a good crew. Mostly. Some of you.”',
          '“I’ll see you in court. Wear a tie. Not you. You know who I mean.”',
        ]));
        return out;
      },
    },

    room: roomBeat({ final: true }),

    count: counting({
      time: '1:30 A.M.', title: 'The Last Count',
      text: (c) => [
        c.rng.pick([
          'Back at Nonna’s, for the last time this week. The Bag sits on the table. Nonna has put on her good cardigan, the one for court.',
          'Nonna’s kitchen at half past one. Nobody has sat down. Nonna is ironing Sal’s shirt for tomorrow on the kitchen table, next to the Bag.',
        ]),
        `Last chance. The Bag has ${money(c.bag.total)} of the ${money(c.bag.target)} Morty wants. Whatever you keep, you keep — unless Sal goes down, in which case you keep half.`,
      ],
    }),
  },
};
