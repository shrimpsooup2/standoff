// FIRST NIGHT — the tutorial.
//
// Three short jobs that teach the whole game by playing it, with somebody
// talking you through it in character rather than a wall of rules. It takes
// about five minutes and it is a real game: real choices, real money, a real
// little ledger at the end.
//
// Three variations so the second group you teach does not sit through the same
// script, each with small details that move. The beats are fixed on purpose —
// a tutorial that improvises is a tutorial that forgets to teach something.

export const TUTORIAL_VARIATIONS = [
  {
    id: 'bakery',
    name: 'The Bakery',
    coachName: 'Aunt Gilda',
    coachRole: 'who has been doing this since before your parents met',
    opening: 'Sit down. Eat something. I am going to walk you through one night, small, where nothing that happens counts — and then you are going to do it for real and it will all count.',
    closing: 'That is the whole game. The real one is longer, the money is bigger, and there is one person at the table being paid to ruin it. Everything else you have just done.',
    beats: [
      {
        teach: 'the choice',
        coach: {
          deal: 'Two things you can do. Everybody picks without seeing what anybody else picked, and that is the entire game — everything else is decoration.',
          squeeze: 'Look at the two numbers under each one. The first is what you get if the room holds with you. The second is what you get if it does not. Now choose.',
          reckoning: 'There it is. Holding together pays everybody more than anything else on that card. Folding on somebody who held pays you the most of all. Both of those are true at once, and that is the problem.',
        },
        job: {
          id: 'tut_bakery_1',
          title: 'Two Boxes Of Cannoli',
          setup: [
            'The two of you took two boxes out of the back of the shop on Sunday. Nobody would have noticed two boxes.',
            'Somebody noticed two boxes. {don} is in the front, drinking coffee, asking everybody the same easy question in the same easy voice.',
          ],
          pressure: '"Somebody took two boxes," {don} says, to each of you, separately, with a smile on. "It is two boxes. I am not going to do anything about two boxes. I would just like to know."',
          stand: { label: 'IT WAS NOBODY', blurb: 'Two boxes went missing. Shops lose things. Say that, and hope {them} says it too.' },
          fold: { label: 'IT WAS HIM', blurb: 'Give {don} the other name. It is two boxes. What is he going to do about two boxes?' },
          did: { stand: 'said shops lose things', fold: 'gave the other name' },
          closers: { murky: 'Two boxes. {don} finished his coffee and did not mention it again, which is not the same as forgetting it.' },
          outcomes: {
            bothStand: 'Nobody took anything and the shop simply loses things sometimes. {don} finished his coffee, said the coffee was good, and went upstairs. The matter is closed because two people closed it.',
            bothFold: 'They named each other over two boxes of cannoli, in a bakery, at nine in the morning. {don} looked from one to the other for a while. Then he said, "Two boxes," and went upstairs, and the way he said it will be remembered by both of them for a long time.',
            betray: '{traitor} gave the name. {victim} was still explaining that shops lose things when {don} put his cup down. Two boxes. That is what it took.',
          },
        },
      },
      {
        teach: 'the third way',
        coach: {
          deal: 'Now look properly. Four things you can do. One is loyalty, one is selling somebody, and the two in between are what people actually do.',
          talk: 'You can talk first. Say anything you like — it does not bind you to a thing. You can also give your word, which does not bind you either, except that breaking it goes in the book with your name on it.',
          squeeze: 'Read the two columns again. Something in there is very good if the room holds. Something else is very good if it does not. Decide which one you think this is.',
          reckoning: 'Nothing in that list was the decent thing. That is not an accident. Whatever you picked, somebody paid for it — they just were not all at this table.',
        },
        job: {
          id: 'tut_bakery_2',
          title: 'The Order Book',
          setup: [
            'The order book has names in it that are not customers and quantities that are not cake. It has been that way for eleven years and it goes in the safe every night.',
            'It did not go in the safe last night. A man from the city has it in a folder and would like somebody to explain the handwriting.',
          ],
          pressure: 'He is not in a hurry. He has the book, he has the two of you, and he has a whole afternoon.',
          stand: { label: 'IT IS AN ORDER BOOK', blurb: 'It is a book of orders. People order things. Say that, all afternoon, and hope {them} has the patience.' },
          fold: { label: 'EXPLAIN THE HANDWRITING', blurb: 'Whose hand, whose names, whose eleven years. He will be very pleased with you.' },
          did: { stand: 'said people order things, all afternoon', fold: 'explained the handwriting, and the names, and the eleven years' },
          extra: [
            {
              archetype: 'half',
              label: 'GIVE HIM THE OLD PAGES',
              blurb: 'Hand over the first four years, which are so old that nobody in them is alive or interested. It is cooperation, it is real, and it costs almost nobody anything.',
              did: 'gave him four years of dead men',
            },
            {
              archetype: 'gamble',
              label: 'SAY IT IS A CODE FOR CAKE',
              blurb: 'Insist the names are cake names and the quantities are trays. If {them} tells it the same way it is unbreakable and you both walk. If {them} says anything else at all, you are a person who lied to the city about cake.',
              did: 'swore the whole thing was a cake code, with examples',
            },
          ],
          closers: { murky: 'The man from the city went back to his office with four years of dead men and a theory about cake. He has not closed the file and he has not opened it either.' },
          outcomes: {
            allStand: 'It is a book of orders. People order things. He read it for two hours and then put it back in the folder and left.',
            bothStand: 'It is a book of orders. People order things. He read it for two hours, put it back in the folder, and left without saying goodbye to anybody.',
            allFold: 'Everybody explained the handwriting. He now has eleven years, annotated, by the people who wrote it.',
            bothFold: 'They both explained the handwriting, at length, in separate rooms. He has eleven years of it now, annotated by the two people who wrote it.',
            betray: '{traitor} explained the handwriting. {victim} was on hour two of "people order things" and had started to believe it.',
            mixed: '{standerNames} held. {folderNames} explained it. The book is in a folder in an office now, with one set of notes in the margin.',
          },
        },
      },
      {
        teach: 'the table and the cards',
        coach: {
          deal: 'Everybody at once now. Everything that goes in the pot grows and gets split evenly — including with whoever did not put anything in. That is not a bug. Everybody sees that at the same moment and it ruins them.',
          talk: 'You are all holding cards. One a round. The red ones get announced the second you play them, which makes them threats. The gold ones nobody sees until the end, which makes them worse.',
          squeeze: 'Last one. Whatever you have been learning about these people, this is where you use it.',
          reckoning: 'And that is the ledger. It counts the money, but the part people argue about on the way home is the other bit — who held for whom, and who was first to stop.',
        },
        job: {
          id: 'tut_bakery_3',
          title: 'The Sunday Float',
          setup: [
            'Every Sunday everybody puts their takings into one tin, the tin goes upstairs, and what comes back down is bigger and split evenly between everybody.',
            'Nobody has ever counted what anybody put in. That is not an oversight. That is the entire arrangement, and it has worked for a very long time.',
          ],
          pressure: 'The tin is on the counter. There are {n} of you and one tin and nobody is watching anybody.',
          stand: { label: 'EVERYTHING IN THE TIN', blurb: 'All of it. The tin comes back bigger and gets cut evenly, including with whoever kept theirs.' },
          fold: { label: 'KEEP YOURS', blurb: 'Nobody counts the tin. The tin still comes back bigger and it still gets cut evenly.' },
          did: { stand: 'put the whole till in the tin', fold: 'kept the till and took a share anyway' },
          extra: [
            {
              archetype: 'half',
              label: 'HALF IN THE TIN',
              blurb: 'Half up, half in your pocket. It is less than anybody asked for and more than most people manage.',
              did: 'put half in the tin',
            },
            {
              archetype: 'muscle',
              label: 'COUNT THE TIN ON THE COUNTER',
              blurb: 'Tip it out and count it in front of everybody. Anybody who came in light loses most of what they kept and half of it comes to you. If everybody was straight, you have just done that to your friends for nothing.',
              did: 'tipped the tin out on the counter and counted it in front of everybody',
            },
          ],
          closers: { murky: 'The tin went upstairs at something other than the full amount, came back bigger anyway, and got cut evenly, which is what everybody was counting on and what nobody will say out loud.' },
          outcomes: {
            allStand: 'Every till went in. The tin came back heavier than it has in months and got cut {n} ways, and everybody walked out with more than they put in, which is the boring miracle the whole arrangement runs on.',
            bothStand: 'Both tills went in. The tin came back heavier than it has in months and was split down the middle, and both of them walked out with more than they put in.',
            allFold: 'Nobody put anything in. The tin went upstairs almost empty and came back almost empty, split {n} ways, and everybody got a share of nothing and knew exactly why.',
            bothFold: 'Neither of them put anything in. The tin went upstairs almost empty and came back almost empty and was split down the middle, and they both knew exactly why.',
            betray: '{traitor} kept the till. {victim} put the whole thing in and got half of a tin that {traitor} had already been paid out of.',
            mixed: '{standerNames} put in. {folderNames} did not. The tin was split evenly on the counter in front of everybody, which took about a minute and felt longer.',
          },
        },
      },
    ],
  },

  {
    id: 'docks',
    name: 'The Docks',
    coachName: 'Sheepdog',
    coachRole: 'who has been on this pier since he was fourteen',
    opening: 'Right. One night, small, nothing counts. Then you do it properly and all of it counts. Pay attention to the numbers and stop looking at me.',
    closing: 'That is it. The real one runs longer, the money gets serious, and somebody at that table is on the payroll the whole time. The rest you already know.',
    beats: [
      {
        teach: 'the choice',
        coach: {
          deal: 'Two doors, two things you can say, and nobody sees anybody else pick. That is the game. Everything on top of it is decoration.',
          squeeze: 'Two numbers under each one. What you get if the room holds. What you get if it does not. Pick.',
          reckoning: 'Holding together pays everybody better than anything else. Folding on a man who held pays you better still. Both true at once, and now you know why nobody on this pier sleeps well.',
        },
        job: {
          id: 'tut_docks_1',
          title: 'One Crate Off The Back',
          setup: [
            'One crate came off the back of a container that was supposed to arrive sealed. One crate. Nobody counts to four hundred and nineteen.',
            'Somebody counted to four hundred and nineteen. The foreman is in the office asking everybody the same easy question.',
          ],
          pressure: '"One crate," the foreman says, to each of you, alone. "I am not going to make a thing of one crate. I would just like to know whose hands."',
          stand: { label: 'CONTAINERS COME UP SHORT', blurb: 'They do. They always have. Say it and hope {them} says it too.' },
          fold: { label: 'GIVE HIM THE NAME', blurb: 'One name and you are back on the crane before lunch. It is one crate.' },
          did: { stand: 'said containers come up short', fold: 'gave the foreman the name' },
          closers: { murky: 'One crate. The foreman wrote something down that was not a name and everybody went back to work.' },
          outcomes: {
            bothStand: 'Containers come up short. They always have. The foreman said "they do" and went back to his paperwork, and the matter was closed by two people closing it.',
            bothFold: 'They named each other over one crate, in an office, before nine. The foreman looked at his two notes for a while and put them both in a drawer that he is going to open again one day.',
            betray: '{traitor} gave the name. {victim} was still on "containers come up short" when the office door opened and it was somebody coming to get him.',
          },
        },
      },
      {
        teach: 'the third way',
        coach: {
          deal: 'Four things now. One is loyalty, one is selling him, and the two in the middle are what people on this pier actually do at two in the morning.',
          talk: 'Talk first if you want. It binds you to nothing. You can also give your word, which also binds you to nothing, except that breaking it goes in the book under your name.',
          squeeze: 'One of those is very good if the room holds. A different one is very good if it does not. Work out which night you think this is.',
          reckoning: 'None of those was the honest option. That is deliberate. Whatever you picked, somebody paid — they just were not standing here.',
        },
        job: {
          id: 'tut_docks_2',
          title: 'The Manifest',
          setup: [
            'The manifest says sports equipment. Customs has the manifest, the container, and a dog that has made its position clear.',
            'They have separated you. Same room, same table, same question, twice.',
          ],
          pressure: 'They have all night, a warm office, and a printer that produces the same form over and over.',
          stand: { label: 'IT IS SPORTS EQUIPMENT', blurb: 'It is what the paper says it is. Hold that, for as long as it takes, and hope {them} can too.' },
          fold: { label: 'TELL THEM WHAT IT IS', blurb: 'What is in it, where it came from, and who wrote the manifest. You will be home by midnight.' },
          did: { stand: 'said sports equipment until they stopped asking', fold: 'told them what was in it and who wrote the manifest' },
          extra: [
            {
              archetype: 'half',
              label: 'GIVE THEM THE SHIPPER',
              blurb: 'Hand over the company at the far end, which is three countries away and has never heard of any of you. It is genuinely useful to them and it costs nobody in this building anything.',
              did: 'gave them a shipping company three countries away',
            },
            {
              archetype: 'shield',
              label: 'DISCLAIM THE CONTAINER',
              blurb: 'It is not yours, you have never seen it, you are a man who was walking past. You lose the whole load and there is nothing on any form with your name on it.',
              did: 'disclaimed the container entirely and lost the load',
            },
          ],
          closers: { murky: 'Customs has a shipping company in another hemisphere, a container nobody admits to, and a dog that is still extremely interested. The 6:10 has come off the schedule.' },
          outcomes: {
            allStand: 'It remained, officially and permanently, sports equipment.',
            bothStand: 'It remained, officially and permanently, sports equipment. The dog disagreed, but the dog does not fill out forms.',
            allFold: 'Everybody explained it. They have the contents, the origin and the handwriting, twice over.',
            bothFold: 'They both explained it, separately, within the same hour, and the two accounts agree on everything including the parts that were not asked about.',
            betray: '{traitor} told them what it was. {victim} was on hour four of sports equipment and had genuinely started to find it funny.',
            mixed: '{standerNames} held the line. {folderNames} did not. The container has been opened and the paperwork now has one set of notes on it.',
          },
        },
      },
      {
        teach: 'the table and the cards',
        coach: {
          deal: 'All of you at once. Everything that goes in the pot grows and gets split evenly — including with whoever put nothing in. Everybody works that out at the same moment, and that is the fun.',
          talk: 'You are holding cards. One a round. Red ones are announced the instant you play them, so they are threats. Gold ones nobody sees until it is over, so they are worse.',
          squeeze: 'Last one. Use whatever you have learned about these people in the last four minutes.',
          reckoning: 'That is the ledger. It counts money. The part that gets argued about in the car is the other half — who held for whom, and who stopped first.',
        },
        job: {
          id: 'tut_docks_3',
          title: 'The Whole Pier',
          setup: [
            'Every man on this pier puts his week into one envelope, the envelopes go up together, and what comes back is bigger and split evenly across all {n} of you.',
            'Nobody opens anybody’s envelope. That is not sloppiness. That is the arrangement, and it has fed families since before any of you were here.',
          ],
          pressure: 'The envelopes are on the table. There are {n} of you. Nobody is watching anybody.',
          stand: { label: 'FULL ENVELOPE', blurb: 'Everything in. It comes back bigger and gets cut evenly, including with whoever kept theirs.' },
          fold: { label: 'KEEP MOST OF IT', blurb: 'Nobody opens them. It still comes back bigger and it still gets cut evenly.' },
          did: { stand: 'sent his envelope up full', fold: 'sent his up nearly empty and took a full share' },
          extra: [
            {
              archetype: 'half',
              label: 'HALF IN',
              blurb: 'Half up, half in your pocket. Less than was asked and more than most manage.',
              did: 'sent half of it up',
            },
            {
              archetype: 'gamble',
              label: 'PUT IN YOURS AND NEXT WEEK’S',
              blurb: 'Double up. If this pier holds, it comes back enormous. If it does not, you have given away two weeks for a share of almost nothing.',
              did: 'put in this week and next week',
            },
          ],
          closers: { murky: 'The envelopes went up at something other than the full amount, came back bigger anyway, and were cut evenly on the table, which is what everybody was relying on and nobody will say.' },
          outcomes: {
            allStand: 'Every envelope was full. What came back was heavier than it has been in years and it was cut {n} ways, and every man walked off that pier with more than he brought.',
            bothStand: 'Both envelopes were full. What came back was heavier than it has been in years and was split between them, and both walked off that pier with more than they brought.',
            allFold: 'Almost nothing went up. Almost nothing came back. It was still divided evenly, in silence, on a folding table, and everybody knew exactly what they were looking at.',
            bothFold: 'Almost nothing went up and almost nothing came back, and it was still split down the middle, in silence, on a folding table.',
            betray: '{traitor} sent his up nearly empty. {victim} sent his up full, and then watched it come back and get halved.',
            mixed: '{standerNames} sent theirs up full. {folderNames} did not. It was cut evenly in front of everybody, which took about a minute and is going to take considerably longer to forget.',
          },
        },
      },
    ],
  },

  {
    id: 'club',
    name: 'The Social Club',
    coachName: 'The Notary',
    coachRole: 'who has never played a hand and has watched every one of them',
    opening: 'One practice night. Nothing on it. Watch what the numbers do and watch what the faces do, and try to notice which one you are actually reading.',
    closing: 'Now you know the shape of it. The real night is longer, the stakes climb, and one of you will have been working for the other side the entire time.',
    beats: [
      {
        teach: 'the choice',
        coach: {
          deal: 'Two things you can do, and nobody sees anybody else decide. That is the whole of it. Everything after this is trimming.',
          squeeze: 'Under each one: what it pays if the room holds, what it pays if it does not. Choose.',
          reckoning: 'Everybody holding pays everybody well. Folding on somebody who held pays you better. Both sentences are true at the same time and they are what this entire evening is built on.',
        },
        job: {
          id: 'tut_club_1',
          title: 'The Float Is Light',
          setup: [
            'The float behind the bar is light by a number small enough that nobody should have noticed.',
            '{don} noticed. He is at the end of the bar with a coffee, asking everybody the same easy question with the same easy face on.',
          ],
          pressure: '"It is not about the money," {don} says, to each of you, alone, which means it is not about the money.',
          stand: { label: 'THE FLOAT IS ALWAYS LIGHT', blurb: 'Bars lose money. This one always has. Say it, and hope {them} says it too.' },
          fold: { label: 'SAY WHO WAS ON THE BAR', blurb: 'One shift, one name, and you are out of this conversation in ten seconds.' },
          did: { stand: 'said bars lose money', fold: 'gave up the shift and the name' },
          closers: { murky: '{don} drank his coffee, said something about the weather, and has not raised it since, which is not the same as being finished with it.' },
          outcomes: {
            bothStand: 'Bars lose money. This one always has. {don} agreed that bars lose money and went back to his coffee, and the matter was closed by two people closing it.',
            bothFold: 'They gave up each other’s shifts inside a minute of each other, at a bar, over a number you could fit in a jacket pocket. {don} has not mentioned it since and has not forgotten a second of it.',
            betray: '{traitor} gave up the shift. {victim} was still explaining that bars lose money, warmly, to a man who had already been told otherwise.',
          },
        },
      },
      {
        teach: 'the third way',
        coach: {
          deal: 'Four now. One is loyalty, one is selling him, and the two in the middle are the ones people actually reach for.',
          talk: 'You get to talk first. It commits you to nothing at all. You can give your word too, which also commits you to nothing, except that breaking it is written down under your name.',
          squeeze: 'One of those is excellent if the room holds. A different one is excellent if it does not. That is the only question here.',
          reckoning: 'Not one of those was the decent option. That is on purpose. Somebody paid for whichever one you took; they were just not in the room.',
        },
        job: {
          id: 'tut_club_2',
          title: 'The Machine In The Back',
          setup: [
            'There is a machine behind the pie case that pays out too often to people who know to press twice. Everybody in this club knows. Nobody in this club has ever said so out loud.',
            'Gaming enforcement has the machine on a truck and has mentioned, twice, that they have not opened it yet.',
          ],
          pressure: 'They do not need much. They need one person in this club to be tired.',
          stand: { label: 'IT IS A MACHINE', blurb: 'Machines pay out. That is the concept of machines. Hold that with {them} and they have a truck and a theory.' },
          fold: { label: 'GIVE THEM THE LIST', blurb: 'Thirty-one names, the board, and the man who built it. You will not be on the list afterwards.' },
          did: { stand: 'said machines pay out, which is the concept of machines', fold: 'handed over all thirty-one names and the man who built it' },
          extra: [
            {
              archetype: 'half',
              label: 'GIVE THEM THE BOARD',
              blurb: 'Hand over the hardware and keep every name. They get a modified machine and no people at all, and you are now a man who handed something over.',
              did: 'handed over the board and kept all thirty-one names'
            },
            {
              archetype: 'muscle',
              label: 'GO AT WHOEVER TALKED',
              blurb: 'Somebody told them where to look. Find them. Anybody who has been quietly taking from that machine gives most of it back and half comes to you. If nobody talked, you have turned over your own club for nothing.',
              did: 'went looking for whoever talked, through his own club',
            },
          ],
          closers: { murky: 'Enforcement has a board with no names on it and a club that has spent a fortnight looking at itself. The machine is in an evidence garage paying out to nobody.' },
          outcomes: {
            allStand: 'Machines pay out. Nobody said anything else.',
            bothStand: 'Machines pay out. That is the concept of machines. Neither of them said another word and the truck went away with a box on it.',
            allFold: 'Everybody gave them everything. There are now more names on that list than there were.',
            bothFold: 'They both gave up the list, separately, and the two copies are identical, which proves rather more than either confession does on its own.',
            betray: '{traitor} produced the list. {victim} is on it at number four, where {traitor} put him years ago, as a favour.',
            mixed: '{standerNames} said nothing. {folderNames} said plenty. The list exists in an office now, partially.',
          },
        },
      },
      {
        teach: 'the table and the cards',
        coach: {
          deal: 'Everybody at once. What goes in the pot grows and is split evenly — with everybody, including whoever put in nothing. You will all realise that at the same moment.',
          talk: 'Cards. One each per round. The red ones announce themselves the moment you play them, which makes them threats. The gold ones stay hidden until the end, which makes them considerably worse.',
          squeeze: 'Last one. Whatever you think you have learned about these people, spend it now.',
          reckoning: 'That is the ledger. It counts the money. The thing people actually take home is underneath it — who held for whom, and who stopped first.',
        },
        job: {
          id: 'tut_club_3',
          title: 'The Christmas Fund',
          setup: [
            'All {n} of you pay into the club fund. It goes up, it comes back bigger, and it is split evenly at the end of the year whatever anybody put in.',
            'It is kept in a tin behind a photograph of a boat that nobody owns, and it has never once been counted in front of anybody.',
          ],
          pressure: 'The tin is on the table. There are {n} of you. Nobody is watching anybody.',
          stand: { label: 'PAY IN FULL', blurb: 'All of it. It comes back bigger and gets cut evenly, including with whoever kept theirs.' },
          fold: { label: 'KEEP YOURS', blurb: 'Nobody has ever counted it. It still comes back bigger and it still gets split evenly.' },
          did: { stand: 'paid into the fund in full', fold: 'kept his and took an even share of everybody else\u2019s' },
          extra: [
            {
              archetype: 'half',
              label: 'PAY IN HALF',
              blurb: 'Half in, half in your pocket, and no explanation offered to anybody.',
              did: 'paid in half and explained nothing',
            },
            {
              archetype: 'martyr',
              label: 'COVER SOMEBODY ELSE',
              blurb: 'Pay yours and whoever you can see is not going to. It costs you twice and the fund is whole and nobody will ever know it was you.',
              did: 'quietly covered somebody else’s share as well as his own',
            },
          ],
          closers: { murky: 'The tin went behind the photograph at a number nobody has said out loud, came back bigger anyway, and was split evenly, which is exactly what everybody was counting on.' },
          outcomes: {
            allStand: 'Everybody paid in full. The tin came back heavier than anybody expected and was split {n} ways, and this is the single most functional thing this club has ever done.',
            bothStand: 'Both of them paid in full. The tin came back heavier than either expected and was split between them, which is the single most functional thing this club has ever managed.',
            allFold: 'Nobody paid in. The tin came back as thin as it went up and was still split {n} ways, in silence, behind a photograph of a boat that nobody owns.',
            bothFold: 'Neither of them paid in. The tin came back as thin as it went up and was still split between them, in silence, behind a photograph of a boat that nobody owns.',
            betray: '{traitor} kept his. {victim} paid in full and took half of a tin that {traitor} had already helped himself out of.',
            mixed: '{standerNames} paid in. {folderNames} did not. It was split evenly on the table in front of everybody, and the arithmetic of that is now a permanent fact in this club.',
          },
        },
      },
    ],
  },
];

/** Small details that move, so the second group does not get a rerun. */
export const TUTORIAL_WRINKLES = [
  'Somebody’s phone keeps going off and nobody is answering it.',
  'There is a man outside in a parked car who has been there since you arrived.',
  'It has started raining, which everybody is choosing to find significant.',
  'Nobody has touched the food, which is a first.',
  'The radio in the back is on and nobody can find the radio.',
  'Somebody has left a set of car keys on the table and will not say whose.',
];

export function pickVariation(rng, avoid = null) {
  const pool = TUTORIAL_VARIATIONS.filter((v) => v.id !== avoid);
  return rng.pick(pool.length ? pool : TUTORIAL_VARIATIONS);
}

/**
 * Which beats a given table plays. Two people never get a whole-table round,
 * because there is no table; a big group gets the pot round with everybody in
 * it, which is the one that teaches the most.
 */
export function beatsFor(variation, playerCount) {
  const [first, second, third] = variation.beats;
  if (playerCount <= 2) {
    return [
      { ...first, kind: 'pair' },
      { ...second, kind: 'pair' },
      { ...third, kind: 'pair', twoUp: true },
    ];
  }
  return [
    { ...first, kind: 'pair' },
    { ...second, kind: 'pair' },
    { ...third, kind: 'table' },
  ];
}
