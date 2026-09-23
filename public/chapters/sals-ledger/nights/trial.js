// Monday. Courtroom 4B. Nonna wants a name, Prout calls his witnesses, and
// the jury comes back.

import { money, biggestGiver } from '../common.js';
import { clamp } from '../../../engine/util.js';
import { suspicion, friendOf, enemyOf } from '../../../engine/bots.js';

/**
 * How far the Bag moves the Verdict: one for every tenth of Morty's number
 * it's over or short, up to three either way.
 */
export function bagShift(c) {
  const target = Math.max(1, c.bag.target);
  const frac = (c.bag.total - target) / target;
  if (frac >= 0) return -Math.min(3, Math.floor(frac * 10 + 1e-9));
  return Math.min(3, Math.ceil(-frac * 10 - 1e-9));
}

/** What the Verdict needs: four plus the Case File, bent by the Bag. */
export function verdictTarget(c) {
  let t = 4 + c.caseFileValue + bagShift(c);
  if (c.flag('ring') === 'fake-caught') t += 1;
  return clamp(t, 3, 12);
}

export function verdictParts(c) {
  const over = c.bag.total - c.bag.target;
  const shift = bagShift(c);
  const parts = [`4, plus the Case File (${c.caseFileValue})`];
  if (shift < 0) parts.push(`minus ${-shift} for the ${money(over)} Morty didn’t need`);
  else if (shift > 0) parts.push(`plus ${shift}, because the Bag is ${money(-over)} short and Morty phoned some of it in`);
  if (c.flag('ring') === 'fake-caught') parts.push('plus 1 for Nonna’s curse');
  return parts;
}

function gallery(c) {
  const out = [];
  if (c.flag('waltSaw')) out.push('Walt Kowalski, in his good suit, with a thermos');
  if (c.flag('pruittSaw')) out.push('Harold Pruitt, retired since Friday, taking notes');
  if (c.flag('nickySaw')) out.push('Nicky Castellano, glaring');
  if (c.flag('lennySaw')) out.push('Lenny Russo from Pier 9, in a Giants jersey under his jacket');
  if (c.flag('war') && c.flag('truce') !== 'accept') out.push(c.flag('insultedVinnie') ? 'Vinnie Castellano, front row, smiling' : 'two Castellano brothers near the back');
  if (c.flag('consuela')) out.push('Consuela the cleaner, who wants to be kept informed');
  out.push('Father Dominic');
  out.push('Dolores, who closed the diner for this');
  return out;
}

export default {
  id: 'trial', title: 'The Trial', interlude: true, act: 3, day: 'MONDAY, 9:00 A.M.', kicker: 'MONDAY',
  beats: ['courtroom', 'jury', 'witnesses', 'verdict'],
  defs: {
    courtroom: {
      engine: 'story', time: '9:00 A.M.', place: 'Courtroom 4B', title: 'Courtroom 4B', kicker: 'MONDAY',
      text(c) {
        const g = gallery(c);
        const ring = c.flag('ring') === 'real' ? ' Nonna is in the second row with her ring on, turning it round and round.'
          : c.flag('ring') === 'fake' ? ' Nonna is in the second row, wearing a ring that she keeps holding up to the light.'
            : ' Nonna is in the second row with her handbag on her knees like a shield.';
        return [
          `Sal is at the defence table in the suit he was married in. Morty Klein is beside him, sweating through a very expensive shirt. Prout is across the aisle with the folder, which is ${c.caseFileValue >= 6 ? 'enormous' : c.caseFileValue >= 4 ? 'thick' : 'thinner than he would like'}.${ring}`,
          `In the gallery: ${g.slice(0, -1).join(', ')} and ${g[g.length - 1]}.`,
          `Morty has the Bag: ${money(c.bag.total)} of the ${money(c.bag.target)} he asked for. The Case File stands at ${c.caseFileValue}. When the jury comes back, Sal walks on ${verdictTarget(c)} or more.`,
        ];
      },
    },

    jury: {
      engine: 'vote', time: '11:20 A.M.', place: 'The corridor outside 4B', title: 'Nonna Wants a Name', kicker: 'WHO TALKED?',
      noSelf: true,
      text: (c) => [
        'The jury goes out. Nonna takes you all into the corridor by the water fountain and looks at you one at a time, which takes a long time, because she means it.',
        '“Somebody at this table has been talking to Prout. I have known it since Wednesday. Give me a name.”',
        'Name the rat and Prout’s case falls apart: the Case File drops by three. Name somebody who took his deal and it drops by one, and Nonna takes what Prout paid them. Name somebody innocent and Nonna pays them for the insult, out of the Bag, and they will not forget who pointed.',
      ],
      options: (c) => [
        ...c.players.map((p) => ({ id: p.id, label: p.name, player: true })),
        { id: 'nobody', label: 'Nobody here talked', blurb: 'If it’s true, Prout’s case is thinner than he thinks.' },
      ],
      bot(c, p, options) {
        const rat = p.secret?.id === 'rat';
        const pool = options.filter((o) => o.player && o.id !== p.id);
        if (!pool.length) return 'nobody';
        // somebody who knows — a Wiretap, a Dolores secret, a lockup phone call — says so
        const known = pool.find((o) => p.notes.some((n) => n.text?.includes(`${c.name(o.id)}'s secret`) && n.text.includes('The Rat')) || p.notes.some((n) => n.text?.startsWith(`${c.name(o.id)}:`) && n.text.includes('The Rat')));
        if (known && !rat) return known.id;
        const friend = friendOf(c.g, p);
        const scored = pool.filter((o) => o.id !== friend).map((o) => ({ id: o.id, s: suspicion(c.g, p, c.p(o.id)) }));
        if (rat) {
          // the rat points at whoever looks worst, and never at nobody
          const enemy = enemyOf(c.g, p);
          if (enemy && c.rng.chance(0.5)) return enemy;
          return scored.sort((a, b) => b.s - a.s)[0]?.id ?? 'nobody';
        }
        const best = scored.sort((a, b) => b.s - a.s)[0];
        if (!best || best.s < 2.2) return 'nobody';
        return best.id;
      },
      resolve(c, { choice, votes }) {
        const pointers = Object.entries(votes).filter(([, v]) => v === choice).map(([pid]) => pid);
        if (choice === 'nobody') {
          c.set('trialNamed', null);
          const rat = c.players.find((p) => p.secret?.id === 'rat');
          const dealt = c.players.filter((p) => p.deal);
          if (!rat && !dealt.length) {
            c.line('“Good,” says Nonna. “Good.” She kisses each of you on the forehead, hard. Nobody at this table talked, and Prout is about to find out what that means.');
            c.caseFile(-1, 'a crew that didn’t talk');
          } else {
            c.line('Nonna looks at you for a long time. “Somebody here is lying to me,” she says, “and I am ninety-four, and I have heard better.” She goes back into court.');
          }
          return;
        }
        const t = c.p(choice);
        c.set('trialNamed', choice);
        if (t.secret?.id === 'rat') {
          c.stamp(t.id, 'RAT');
          c.line(`${t.name}. Nonna holds out her hand, and ${t.name} takes the wire out of their shirt and puts it in her palm. She drops it in the water fountain.`);
          c.caseFile(-3, `${t.name} was wearing a wire, and Prout’s best witness is now useless`);
          c.remember(`${t.name} was the rat, and the crew caught them.`, { who: t.id, kind: 'rat-caught' });
          for (const pid of pointers) c.g.bond(pid, t.id, 'caught');
          return;
        }
        if (t.deal) {
          c.stamp(t.id, 'RAT');
          c.set(`dealForfeit:${t.id}`, true);
          c.line(`${t.name}. Nonna doesn’t even have to ask. ${t.name} took Prout’s deal, and it’s written all over them. Whatever Prout was paying, Nonna takes.`);
          c.caseFile(-1, `${t.name} is a witness nobody will believe now`);
          for (const pid of pointers) c.g.bond(pid, t.id, 'caught');
          return;
        }
        if (t.stats.named.length) {
          const n = c.charge(t.id, c.scale(20000));
          c.bagAdd(n, t.id);
          c.line(`${t.name}. It isn’t quite right — ${t.name} never took the deal — but ${t.name} did give Prout a name in the Room, and Nonna knows it. ${money(n)} goes in the Bag as an apology.`);
          return;
        }
        const pay = c.bagTake(25000);
        c.give(t.id, pay, 'Nonna');
        c.line(`${t.name}. Nonna looks at ${t.name} for a long moment, then opens her handbag and gives them ${money(pay)} out of the Bag. “For the insult,” she says. ${t.name} was clean.`);
        for (const pid of pointers) if (pid !== t.id) c.grudge(t.id, pid, 'pointed at you in front of Nonna');
      },
    },

    witnesses: {
      engine: 'story', time: '2:00 P.M.', place: 'Courtroom 4B', title: 'Prout Calls His Witnesses', kicker: 'THE PEOPLE’S CASE',
      run(c) {
        if (c.flag('gary') === 'prout') c.set('garyTestifies', true);
        for (const p of c.players.filter((q) => q.deal)) {
          for (const q of c.players) if (q.id !== p.id) c.g.bond(p.id, q.id, 'testified');
        }
      },
      text(c) {
        const out = [];
        const dealt = c.players.filter((p) => p.deal).sort((a, b) => a.deal.order - b.deal.order);
        if (!dealt.length) out.push('Prout stands up to call his first witness, looks at his list, and sits down again. Nobody at your table took his deal. It shows on his face.');
        else {
          out.push(`Prout calls his first witness: ${dealt[0].name}.`);
          if (dealt.length > 1) out.push(`Then ${dealt.slice(1).map((p) => p.name).join(', then ')}. Prout only ever needed one.`);
          out.push(dealt.length === 1 ? `${dealt[0].name} doesn’t look at the table. The table looks at ${dealt[0].name}.` : 'None of them look at the table.');
        }
        if (c.flag('garyTestifies')) out.push('Then Gary Feld, in a borrowed suit, reads thirty-one years of the ledger into the record, and cries twice.');
        else if (c.flag('gary') === 'arizona') out.push('Prout calls Gary Feld. There is no Gary Feld. There is a postcard from Tucson.');
        const seen = ['walt', 'pruitt', 'nicky', 'lenny'].filter((w) => c.flag(`${w}Saw`));
        if (seen.length) out.push(`${seen.length === 1 ? 'A witness from the week' : 'Witnesses from the week'} ${seen.length === 1 ? 'points' : 'point'} at people in the gallery. Morty objects to all of it, loudly, and some of it sticks.`);
        return out;
      },
    },

    verdict: {
      engine: 'roll', time: '4:45 P.M.', place: 'Courtroom 4B', title: 'The Verdict', kicker: 'THE JURY IS BACK', always: true,
      text: (c) => [
        'The jury files back in. Juror number four is holding a folded piece of paper and not looking at anybody. Sal has his hands flat on the table. Nonna has her eyes closed.',
        `Two dice. Sal walks on ${verdictTarget(c)} or more: ${verdictParts(c).join(', ')}.`,
      ],
      target: (c) => verdictTarget(c),
      who: (c) => c.free.map((p) => p.id),
      roller: (c) => {
        const top = biggestGiver(c);
        return top && !c.isAway(top) ? top : null;
      },
      label: (c) => {
        const top = biggestGiver(c);
        return top ? `Nonna hands the dice to ${c.name(top)}, who put the most in the Bag.` : 'Nonna hands the dice to whoever is nearest.';
      },
      stakes: 'Sal walks, and everybody is paid. Or Sal goes down, names names, and everybody without a deal loses half.',
      again(c, r) {
        if (c.flag('ring') === 'real' && !c.flag('ringUsed')) {
          c.set('ringUsed', true);
          return `The dice say ${r.total}. Nonna stands up, holds up her hand with the ring on it, and says one word in Sicilian. The judge, for reasons nobody can explain, lets the jury think again.`;
        }
        return null;
      },
      resolve(c, r) {
        c.set('salWalks', !!r.success);
        c.set('verdict', { total: r.total, target: r.target, dice: r.dice });
        if (r.success) {
          c.line(c.rng.pick([
            '“Not guilty.” Sal doesn’t move. Morty Klein faints, briefly. Nonna opens her eyes, says “good,” and asks who is driving her home.',
            '“Not guilty.” Sal stands up and hugs Morty, then Prout, who didn’t see it coming. Nonna is already putting her coat on.',
          ]));
          c.remember('Sal walked.', { kind: 'verdict' });
        } else {
          c.line(c.rng.pick([
            '“Guilty.” Sal nods, like a man hearing the weather. On the way out he stops at the gallery rail and starts, very quietly, to say names.',
            '“Guilty.” Nonna doesn’t open her eyes. Sal turns to Prout and says, “Fine. Get a pen.”',
          ]));
          c.remember('Sal went down.', { kind: 'verdict' });
        }
      },
    },
  },
};
