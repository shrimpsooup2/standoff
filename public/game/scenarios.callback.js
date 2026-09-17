// Jobs that know what you did.
//
// When two people who have history get put back in a room together, the game
// reaches into the record and builds the job out of it. Slots: {A} is the one
// with something to answer for, {B} is the other one, {lastJob} is the actual
// title of the job it happened on, {lastRound} the round number.

export const CALLBACK_SCENARIOS = [
  // ---------------------------------------------------------------- grudge --
  {
    id: 'cb_car',
    kind: 'grudge',
    title: 'The Drive Out To {place}',
    setup: [
      'It is a ninety minute drive and there is one car.',
      '{A} folded on {B} at {lastJob}. Round {lastRound}. Neither of them has said the word "{lastJob}" out loud since, and they are about to spend ninety minutes not saying it again.',
      'The job at the other end is simple. The drive is not the simple part.',
    ],
    pressure: 'Whatever gets decided out there gets decided by two people who already know exactly what the other one is capable of, because one of them has already done it.',
    stand: { label: 'DRIVE, DON’T TALK', blurb: 'Hold the line for somebody who did not hold it for you. Or for somebody you did that to. Either way, {them} is in the passenger seat.' },
    fold: { label: 'SETTLE IT OUT THERE', blurb: 'There is a version of tonight where this gets evened up, and {them} is not driving home.' },
    did: {
      stand: 'drove, and did not bring it up',
      fold: 'settled it out there',
    },
    extra: [
      {
        archetype: 'half',
        label: 'SAY IT ONCE, AT THE LIGHTS',
        blurb: 'One sentence about {lastJob}, at a red light, without looking over. Then ninety minutes of nothing. It does not settle anything and it means it has been said.',
        did: 'said it once, at a red light, and then nothing for ninety minutes',
      },
      {
        archetype: 'chance',
        label: 'ASK HIM WHY',
        blurb: 'Ask the question directly and take whatever comes back. He might explain himself. He might explain himself in a way that is worse than the silence was.',
        did: 'asked, directly, why, and got an answer that took the rest of the drive',
      },
    ],
    closers: {
      murky: 'One sentence was said somewhere around the halfway mark and neither of them has repeated it since. They took different routes home.',
    },
    outcomes: {
      bothStand: 'Ninety minutes each way and neither of them brought it up. They held the line together anyway, which is not forgiveness, but is the closest thing available at this speed.',
      bothFold: 'They both settled it out there, simultaneously, which means neither of them got to say the speech. Two men drove home separately in one car, somehow.',
      betray: '{traitor} settled it. {victim} had spent the entire drive deciding not to, and had genuinely decided, and was about to say so when they arrived.',
    },
  },
  {
    id: 'cb_dinner',
    kind: 'grudge',
    title: 'Sunday Dinner, Same Table',
    setup: [
      'Nobody reseats anybody at this table. The seats were decided in 1994 and that is the end of it.',
      'So {A}, who folded on {B} at {lastJob}, is sitting directly across from {B}, passing {B} the bread, for the fourth week running.',
      'Tonight there is business to discuss over the bread.',
    ],
    pressure: 'Eleven relatives, one table, and two people who have not mentioned a thing that everybody at this table already knows about.',
    stand: { label: 'PASS THE BREAD', blurb: 'Say nothing, do the job straight, and let the seating arrangement do the talking. If {them} does the same, that is almost a conversation.' },
    fold: { label: 'SAY IT AT THE TABLE', blurb: 'In front of everybody, finally. {them} will not be ready for it, and that is most of the appeal.' },
    did: {
      stand: 'passed the bread and said nothing',
      fold: 'said it at the table',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'EAT SOMEWHERE ELSE',
        blurb: 'Do not come. It has been the same seats since 1994 and one of them being empty says more than anything either of you could have said over the bread.',
        did: 'did not come, which said more than anything over the bread could have',
      },
      {
        archetype: 'half',
        label: 'SAY IT IN THE KITCHEN',
        blurb: 'Not at the table — in the kitchen, to one person, quietly, where an aunt can hear it. It will be at the table within the hour anyway and you will not have been the one who said it there.',
        did: 'said it in the kitchen, quietly, where an aunt could hear',
      },
    ],
    closers: {
      murky: 'An aunt heard something in the kitchen. A seat that has been occupied since 1994 was empty. Nobody at that table discussed either fact and everybody went home knowing.',
    },
    outcomes: {
      bothStand: 'Nobody said anything. The bread went round twice. An aunt asked if everything was alright and both of them said it was, at the same time, in the same tone, and then did not look at each other for the rest of the meal.',
      bothFold: 'It came out at the table, from both directions, over dessert. Two people said the quiet thing simultaneously and then had to sit there for another hour because leaving early would have been rude.',
      betray: '{traitor} said it at the table. {victim} had, earlier that week, told three separate people that the {lastJob} business was over and nobody should bring it up again.',
    },
  },
  {
    id: 'cb_hospital',
    kind: 'grudge',
    title: 'Visiting Hours',
    setup: [
      'Aunt Rosaria is in for her hip and everybody has to visit, which means everybody has to sign the book at the desk, which means everybody can see who else has been.',
      '{B} signs in at four. {A} — who folded on {B} at {lastJob} — signs in at four fifteen. There is one waiting room and it has eight chairs.',
    ],
    pressure: 'There is a thing that needs doing for the family this week and the two people who are going to do it are currently sharing a waiting room and a vending machine.',
    stand: { label: 'SIT IN THE ROOM', blurb: 'Take the chair, do the job right, and let {them} decide what {them} is. You have already decided what you are.' },
    fold: { label: 'FINISH IT HERE', blurb: 'Eight chairs, two people, one open matter. {them} is not expecting it in a hospital.' },
    did: {
      stand: 'took a chair and split a bag of chips',
      fold: 'finished it in the waiting room',
    },
    extra: [
      {
        archetype: 'half',
        label: 'SIGN THE BOOK AND GO',
        blurb: 'Ten minutes, the flowers, the book, out. You have visited an aunt and you have not been in a room with anybody, and the desk has the times.',
        did: 'signed the book, left the flowers, and was gone in ten minutes',
      },
      {
        archetype: 'gamble',
        label: 'WAIT FOR HIM OUTSIDE',
        blurb: 'Not in the waiting room. In the car park, where there is no nurse. It either ends the whole thing tonight or it ends something else.',
        did: 'waited in the car park instead, where there is no nurse',
      },
    ],
    closers: {
      murky: 'Aunt Rosaria got flowers from two people who were there ten minutes apart. She has worked out most of it from the visiting book and has said nothing to anybody.',
    },
    outcomes: {
      bothStand: 'They sat in the same waiting room for fifty minutes and split a bag of chips from the machine because neither had change. Whatever {lastJob} was, it is now a thing that happened to two people who split a bag of chips.',
      bothFold: 'Both of them chose a hospital waiting room as the venue, which a nurse had to intervene in, and which Aunt Rosaria heard about within the hour and has opinions on.',
      betray: '{traitor} finished it in the waiting room. {victim} had brought flowers for an aunt who is not even {victim}’s aunt, because {victim} knew {traitor} would forget.',
    },
  },
  {
    id: 'cb_vouch',
    kind: 'grudge',
    title: 'Somebody Has To Vouch',
    setup: [
      'A man upstairs wants a name vouched for before the next piece of work goes out. One person has to stand up and say: this one is solid.',
      'The name is {B}’s. The only person in the room who has worked with {B} closely enough to vouch is {A}, who folded on {B} at {lastJob} and has never explained it.',
    ],
    pressure: 'A vouch is not a favour. A vouch means that if the person you vouched for talks, you go down with them, which is why almost nobody does it.',
    stand: { label: 'STAND UP AND SAY IT', blurb: 'Vouch, and tie yourself to {them} for whatever comes next. It is not an apology. It costs more than one.' },
    fold: { label: 'STAY IN YOUR CHAIR', blurb: 'Nobody is obliged to vouch for anybody. Let {them} find somebody else, if there is anybody else.' },
    did: {
      stand: 'stood up and vouched',
      fold: 'stayed in his chair',
    },
    extra: [
      {
        archetype: 'half',
        label: 'VOUCH WITH A CONDITION',
        blurb: 'Stand up and say he is solid for this piece of work and no other. It is a vouch with a fence round it, and everybody in that room hears the fence.',
        did: 'vouched for this one job only, which everybody in the room heard as a fence',
      },
      {
        archetype: 'shield',
        label: 'ASK FOR SOMEBODY ELSE TO DO IT',
        blurb: 'Say you are too close to it. It is transparently untrue and it is the kind of untrue that a room lets pass, and the work goes to another crew.',
        did: 'said he was too close to it, which the room let pass and nobody believed',
      },
    ],
    closers: {
      murky: 'The work went out with half a vouch on it. It is in the minutes, with the condition, and the man upstairs has read the minutes.',
    },
    outcomes: {
      bothStand: 'Both stood up, for each other, in the same room, about eleven minutes apart, without having discussed it. Neither has mentioned it since and both of them think about it more than they would admit.',
      bothFold: 'Neither stood. The work went to somebody else’s people and both of them lost the month, and the man upstairs noted, in the way he notes things, that these two do not vouch.',
      betray: '{traitor} stayed in the chair. {victim} had stood up for {traitor} first, before anybody asked, which is now in the minutes of a meeting that has minutes.',
    },
  },

  // ------------------------------------------------------------------ feud --
  {
    id: 'cb_feud_wall',
    kind: 'feud',
    title: 'Two Men Who Have Already Done This',
    setup: [
      '{A} and {B} have folded on each other. Not once each, in the heat of a bad night — properly, both directions, with intent, at {lastJob} and since.',
      'Whoever assigns the work knows this. Whoever assigns the work has put them together again anyway, which is either a test or a punishment and is very possibly both.',
    ],
    pressure: 'Two people with nothing left to protect. There is no trust here to spend, which means the only thing either of them can do is guess.',
    stand: { label: 'HOLD ANYWAY', blurb: 'There is no reason to. That is exactly why it would mean something, if {them} did it too.' },
    fold: { label: 'OF COURSE YOU FOLD', blurb: 'You have both already shown each other what you are. Act accordingly and stop pretending.' },
    did: {
      stand: 'held anyway, after everything',
      fold: 'folded again, as expected',
    },
    extra: [
      {
        archetype: 'muscle',
        label: 'SETTLE THE WHOLE ACCOUNT',
        blurb: 'Do not choose — collect. Whatever has been taken from you across all of it comes back tonight, from whoever kept it. If nothing has, you have escalated a thing that had finally gone quiet.',
        did: 'settled the whole account tonight, from whoever was holding any of it',
      },
      {
        archetype: 'chance',
        label: 'SAY WHAT IT WAS ABOUT',
        blurb: 'Nobody has ever said the actual reason out loud. Say it. It either ends the thing completely or it turns out you were wrong about what it was.',
        did: 'said out loud what it had actually been about, which nobody had ever done',
      },
    ],
    closers: {
      murky: 'Something was said that neither of them expected and neither has repeated. Whatever the thing between them is, it is a different thing now.',
    },
    outcomes: {
      bothStand: 'Neither of them folded. After everything. Two people with every reason to expect the worst held the line for each other and now have to work out what that means, which is a harder problem than the job was.',
      bothFold: 'Both folded, instantly, without hesitation or surprise, and afterwards agreed that it had been the correct call. This is the most companionable either of them has been all night.',
      betray: '{traitor} folded again. {victim} — who has folded on {traitor} before, who had every reason — held the line this time, and now has to live with having been the one who tried.',
    },
  },
  {
    id: 'cb_feud_split',
    kind: 'feud',
    title: 'The Arbitration',
    setup: [
      'The thing between {A} and {B} has now been noticed by people who do not like noticing things.',
      'It has cost money twice. A man has been sent to sit in on the next job and report back on whether these two can work, which they will both be told is a formality and which neither of them believes.',
    ],
    pressure: 'The man in the corner is not writing anything down. Men like that never write anything down.',
    stand: { label: 'PUT IT AWAY', blurb: 'One clean job in front of a witness and the whole thing goes away — if {them} can do the same for one hour.' },
    fold: { label: 'LET HIM SEE IT', blurb: 'If it is going to end, let it end in front of somebody who matters, with {them} on the wrong side of it.' },
    did: {
      stand: 'put it away for an hour in front of a witness',
      fold: 'let the man in the corner see it',
    },
    extra: [
      {
        archetype: 'half',
        label: 'BE CIVIL AND NOTHING MORE',
        blurb: 'Work the job, say nothing, and make the civility obviously deliberate. He will report exactly that, which is not what he was sent to find and is not nothing either.',
        did: 'was conspicuously, deliberately civil, which the man in the corner also noted',
      },
      {
        archetype: 'shield',
        label: 'REFUSE THE JOB',
        blurb: 'Tell them you will not work with him and take whatever that costs. Nothing happens in front of the witness because you are not there, and everybody upstairs now has it in writing.',
        did: 'refused the job outright and put it on the record rather than perform for a witness',
      },
    ],
    closers: {
      murky: 'The man in the corner wrote nothing down and reported something anyway. One of them was not there. Neither is being given much to do.',
    },
    outcomes: {
      bothStand: 'One clean job in front of a witness who wrote nothing down and reported back that there was nothing to report. The matter is closed, officially. Officially.',
      bothFold: 'They showed him exactly what he was sent to see, both of them, enthusiastically. He left early. Neither of them is being given anything to do for a while.',
      betray: '{traitor} let him see it. {victim} spent the whole job performing normality for a man in a corner, which the man in the corner also noted.',
    },
  },

  // ----------------------------------------------------------------- clean --
  {
    id: 'cb_clean_test',
    kind: 'clean',
    title: 'The Only Two Who Never Have',
    setup: [
      '{A} and {B} have been put together before and have never once let each other down. This is now a known fact at this table and, more importantly, outside it.',
      'Which is why this particular job was offered to these two particular people, by somebody who wanted to find out whether it was true or just a run of luck.',
    ],
    pressure: 'The offer on the table is the biggest either of them has been made. It has been sized, deliberately, to be worth more than the thing it would break.',
    stand: { label: 'KEEP IT PERFECT', blurb: 'You have never folded on {them}. That record is the only thing either of you has that nobody can take.' },
    fold: { label: 'CASH IT IN', blurb: 'A clean record is worth exactly one betrayal, and it is worth the most on the round where nobody expects it.' },
    did: {
      stand: 'kept it perfect',
      fold: 'cashed it in',
    },
    extra: [
      {
        archetype: 'gamble',
        label: 'TAKE IT TOGETHER',
        blurb: 'Do not hold and do not betray — take the whole offer jointly and split it down the middle, out loud, in front of the person who sized it. It is enormous if he goes along and it is nothing at all if he doesn’t.',
        did: 'took the whole offer jointly and split it down the middle in front of everybody',
      },
      {
        archetype: 'half',
        label: 'TAKE HALF EACH AND SAY SO',
        blurb: 'Accept a piece of it, declare the piece, and leave the record intact but no longer perfect. It was always going to end. This is the least ugly way.',
        did: 'took a declared half and left the record intact but no longer perfect',
      },
    ],
    closers: {
      murky: 'The record is not perfect any more. It ended in a way that both of them had agreed to out loud, which is not nothing and is not what it was.',
    },
    outcomes: {
      bothStand: 'Still perfect. The person who sized the offer has gone quiet about it. Two people at this table have something nobody else has and every single person here knows what it is.',
      bothFold: 'Both of them cashed it in on the same night, at the same hour, in separate rooms, each believing they were the only one capable of it. The record is gone twice over.',
      betray: '{traitor} cashed it in. It was worth exactly what they said it would be worth, and it will be the only thing anybody remembers about {traitor} and {victim} for the rest of the night.',
    },
  },
  {
    id: 'cb_clean_wedding',
    kind: 'clean',
    title: 'Best Man',
    setup: [
      '{A} is standing up at {B}’s cousin’s wedding in three weeks, which is a thing you only ask of somebody you have never had a reason to doubt.',
      'They have never had a reason to doubt each other. That is not sentiment; it is in the record, job after job.',
      'The speech is written. The suit is paid for. And there is one more piece of work before the wedding.',
    ],
    pressure: 'Everything either of them does tonight will be in the room in three weeks, in front of four hundred people, whether or not anybody mentions it.',
    stand: { label: 'THINK ABOUT THE SPEECH', blurb: 'Three weeks from now you have to stand up and say something true about {them} with a microphone in your hand.' },
    fold: { label: 'THE SPEECH CAN BE REWRITTEN', blurb: 'It is a long time until the wedding and money is money and {them} will get over it, probably, eventually.' },
    did: {
      stand: 'thought about the speech and held',
      fold: 'folded, three weeks before a wedding',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'TAKE IT ALL YOURSELF',
        blurb: 'Whatever is coming, put it on your own name so that nobody standing up in three weeks has anything hanging over them. It costs you the year and the speech still happens.',
        did: 'put the whole thing on his own name so the wedding would be clean',
      },
      {
        archetype: 'shield',
        label: 'STAND DOWN FROM THE SPEECH',
        blurb: 'Pull out now, quietly, family reasons. You protect yourself completely and somebody has to explain a reassignment to a bride three weeks out.',
        did: 'quietly pulled out of the speech, three weeks out, for family reasons',
      },
    ],
    closers: {
      murky: 'The speech was given. It was slightly shorter than the one that had been written, and one table noticed, and that table has never mentioned it.',
    },
    outcomes: {
      bothStand: 'Neither of them wobbled. The speech, three weeks later, went on slightly too long and made two separate tables cry, and every word of it was true.',
      bothFold: 'Both of them folded, three weeks before a wedding, on each other. The speech was given by a cousin. It was fine. It was not the speech.',
      betray: '{traitor} folded. The speech has been reassigned. Nobody has told the bride why, and the official reason involves a work commitment.',
    },
  },

  // ---------------------------------------------------------------- repeat --
  {
    id: 'cb_repeat',
    kind: 'repeat',
    title: 'The Third Time',
    setup: [
      'This is not a pattern any more. A pattern is two. {A} has folded on {B} more than that.',
      'Everybody at this table has now watched it happen enough times to have stopped being surprised, which is the part {B} finds hardest.',
    ],
    pressure: 'Nobody is asking {B} why {B} keeps ending up here. Several people have asked each other.',
    stand: { label: 'STAND THERE AGAIN', blurb: 'Do it again. Hold the line for {them}, again, and find out if it was ever about you.' },
    fold: { label: 'LEARN THE LESSON', blurb: 'Everybody at this table has already worked out what is going on here. Catch up.' },
    did: {
      stand: 'stood there again',
      fold: 'did it again',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'STOP WORKING WITH HIM',
        blurb: 'Say, out loud, to whoever assigns the work, that you will not be put in a room with him again. It protects you and it is the first time anybody has admitted the pattern exists.',
        did: 'told whoever assigns the work not to put them in a room together again',
      },
      {
        archetype: 'chance',
        label: 'ASK FOR ONE MORE',
        blurb: 'Ask to be put together again, deliberately, one more time, and see. It is either the round it finally holds or it is the round everybody stops being surprised.',
        did: 'asked to be put together one more time, deliberately, to see',
      },
    ],
    closers: {
      murky: 'Somebody finally said out loud that this keeps happening. That is new. Nothing else about it is new.',
    },
    outcomes: {
      bothStand: 'It held. After all of it, it held, and nobody at this table quite knows what to do with that, least of all the two of them.',
      bothFold: 'Both folded, and the strange thing is that it felt like progress. At least it was even this time.',
      betray: '{traitor} did it again. At this point it is no longer news, and the only remarkable thing left in the story is that {victim} keeps showing up.',
    },
  },
];

export const CALLBACKS_BY_KIND = CALLBACK_SCENARIOS.reduce((acc, s) => {
  (acc[s.kind] ??= []).push(s);
  return acc;
}, {});
