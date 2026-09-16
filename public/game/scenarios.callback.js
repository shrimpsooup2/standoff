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
