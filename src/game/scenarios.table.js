// Whole-table jobs. Same knife, bigger table: everyone who PUTS IN grows a pot
// that gets split evenly, everyone who SKIMS eats from the pot and keeps their
// share too. One defector is rich. Everyone defecting is a wake.
//
// Slots: {n}, {standCount}, {foldCount}, {standerNames}, {folderNames}.

export const TABLE_SCENARIOS = [
  {
    id: 'tribute',
    title: 'The Tribute',
    setup: [
      'First Sunday of the month. {n} envelopes go up to {don} in the back room of {bar}, and whatever goes up comes back down multiplied, because that is the arrangement and the arrangement has fed families for forty years.',
      'Nobody counts the envelopes in front of anybody. That is the entire architecture of the thing. It works because it has always worked, which is a sentence that has preceded every collapse in history.',
    ],
    pressure: '{don} is old now, and slower, and has stopped opening them at the table.',
    stand: { label: 'PUT IN FULL', blurb: 'Your whole share goes up. It comes back bigger and split between everyone — including whoever kept theirs.' },
    fold: { label: 'SKIM IT', blurb: 'Keep your share, take your cut of everyone else’s. Nobody counts. Nobody ever counts.' },
    outcomes: {
      allStand: 'Every envelope was full. {don} did not check, and did not need to, and that fact is worth more than the money in it. The back room stayed open an extra hour.',
      allFold: '{n} light envelopes arrived in the same bag. {don} finally opened one, then all of them, and then sat there for a while with his hands on the table. Nobody comes back down from that multiplied.',
      mixed: '{standCount} envelopes came in full — {standerNames}. {foldCount} came in light: {folderNames}. Everybody drank from the same pot afterwards, which is the part that stings.',
    },
  },
  {
    id: 'bail',
    title: 'The Bail Fund',
    setup: [
      'There is a coffee can. It has been a coffee can since before most of you were born, and it exists so that nobody in this crew ever spends a weekend inside for want of a few thousand dollars.',
      'The can is at {bar}, on a shelf, behind a picture of a boat nobody owns.',
    ],
    pressure: 'Three people are inside this weekend. The can is going to be opened Monday, in front of everybody, and it is going to be counted.',
    stand: { label: 'PAY IN', blurb: 'Your money goes in the can. The can is not for you. The can has never been for you specifically, which is the point.' },
    fold: { label: 'KEEP IT', blurb: 'The can gets counted Monday, not your pockets. And somebody else always pays in.' },
    outcomes: {
      allStand: 'The can was heavy. All three came out by Tuesday. Nobody said thank you because in forty years nobody ever has, and that is how you know it is real.',
      allFold: 'The can was opened Monday in front of everybody and it was almost empty. Nobody spoke. Three men stayed where they were, and everyone at this table knows exactly why.',
      mixed: 'The can held {standCount} contributions — {standerNames} put in. {folderNames} did not, and were present for the counting, which took a long time and was very quiet.',
    },
  },
  {
    id: 'wall',
    title: 'The Wall',
    setup: [
      'Grand jury. {n} subpoenas, {n} chairs outside the same door, one at a time, all day.',
      'Nobody hears what anybody else says in there. That is the design. The wall only exists if everybody decides, alone, in a chair, that it exists.',
    ],
    pressure: 'The prosecutor has said, to each of you separately, the exact same sentence: "You’d be amazed what I already have."',
    stand: { label: 'TAKE THE FIFTH', blurb: 'Say the words, sit down, say nothing else. The wall holds or it doesn’t.' },
    fold: { label: 'ANSWER THE QUESTION', blurb: 'One cooperative witness is a deal. Two is a case. Be the first one.' },
    outcomes: {
      allStand: '{n} witnesses, {n} refusals, one wall. The prosecutor thanked everyone for their time in a voice that meant something else entirely. Nothing was built that day, which was the whole objective.',
      allFold: 'Everybody answered. Everybody’s answer named somebody else in the hallway. The case was assembled that afternoon by {n} people who each believed they were the only one talking.',
      mixed: '{standCount} took the Fifth: {standerNames}. {foldCount} answered: {folderNames}. The wall does not work at {standCount} out of {n}. It never has. It is not that kind of wall.',
    },
  },
  {
    id: 'boiler',
    title: 'The Boiler At The Social Club',
    setup: [
      'The boiler at the social club has been making a sound since February. Everyone has heard the sound. Everyone has said "somebody should look at that" in a tone that clearly means somebody else.',
      'It is now November, and the card game has moved to the back because of the cold, and the back is where the phone is.',
    ],
    pressure: 'A man has quoted a price. The price divided by {n} is nothing. The price paid by one person is a grudge that outlives the boiler.',
    stand: { label: 'CHIP IN', blurb: 'Pay your share of the heat. Everyone sits in the same room either way.' },
    fold: { label: 'SOMEBODY ELSE WILL', blurb: 'The room gets heated whether or not your money heats it. That is how rooms work.' },
    outcomes: {
      allStand: 'It was fixed by Thursday. The card game came back to the front, the sound stopped, and nobody ever mentioned it again, which is the highest honour this club gives anything.',
      allFold: 'Nobody paid. The boiler stopped in the second week of December. The club is closed until spring, and everybody is playing cards at home, alone, warm and unhappy.',
      mixed: '{standerNames} paid. {folderNames} did not, and sat in the heated room on Thursday night, and were handed their cards without comment.',
    },
  },
  {
    id: 'buy',
    title: 'The Group Buy',
    setup: [
      '{n} of you are going in together on a single shipment. Pooled money buys a better price, a better route, and a driver who has never once been curious.',
      'The money goes in tonight, in cash, into one bag. The bag is counted once, at the far end, by a man who is not going to call anybody back.',
    ],
    pressure: 'The shipment is priced for the full amount. It arrives at the size the bag paid for, and it gets divided by heads, not by contribution.',
    stand: { label: 'FULL SHARE IN THE BAG', blurb: 'Pay what you said you’d pay. The load is split evenly no matter what the bag weighs.' },
    fold: { label: 'SHORT THE BAG', blurb: 'Nobody can tell whose bills are whose once they’re in the bag. The load still gets split by heads.' },
    outcomes: {
      allStand: 'The bag was right to the dollar. The load came in at full size and got cut {n} ways, and everybody made more than they put in, which is the boring miracle that this whole business runs on.',
      allFold: 'The bag was light from every direction at once. What arrived would embarrass a smaller crew. It was still divided evenly, in silence, on a folding table.',
      mixed: '{standerNames} paid in full. {folderNames} shorted it. The load was cut {n} ways anyway, evenly, in front of everybody, which took about four minutes and felt considerably longer.',
    },
  },
  {
    id: 'pension',
    title: 'The Widow’s Envelope',
    setup: [
      'Mickey did eleven years and never said one word about anybody at this table. Mickey is gone now. Mickey’s wife is not.',
      'The arrangement is that {n} people put something in an envelope every month, forever, and nobody ever discusses it, and she never finds out the exact shape of where it comes from.',
    ],
    pressure: 'She does not know who pays. She cannot thank you. There is no version of this where you get credit, and there is no version where anybody but this table knows if you stopped.',
    stand: { label: 'PUT IN', blurb: 'Eleven years of silence bought by a man who is not here to collect on it.' },
    fold: { label: 'SKIP THIS MONTH', blurb: 'She gets an envelope either way. It is only the thickness that changes, and she has never known the thickness.' },
    outcomes: {
      allStand: 'The envelope was full, again, like every month. She has stopped asking who. She buys a mass card every year for a name she is not told, and everyone here knows whose name it is.',
      allFold: 'The envelope was thin this month. She noticed. She did not say anything, because the one rule she has understood from the beginning is that you do not ask. Mickey did eleven years.',
      mixed: '{standerNames} put in. {folderNames} did not. She received one envelope, at the usual thickness minus {foldCount} people, and it is impossible to explain to her why, so nobody will.',
    },
  },
  {
    id: 'laststandoff',
    title: 'The Last Standoff',
    final: true,
    setup: [
      'Everything from tonight is on one table, in the back of {bar}, in cash, in the open, for the first time all night.',
      'There is one door. There are {n} of you. Outside, {cop} has a van and a warrant that names every person in this room, and the warrant is good, and everybody knows it is good.',
      'There is exactly one deal on offer and it does not have to be exclusive. It has never had to be exclusive. It is offered to each of you, separately, in the same words.',
    ],
    pressure: '"Last time I ask," {cop} says, to each of you, individually, in the same flat voice. "After tonight, I stop asking and start charging."',
    stand: { label: 'HOLD THE LINE', blurb: 'Walk out the door with them. Whatever is on the table stays on the table and gets multiplied and split. This is the last one.' },
    fold: { label: 'TAKE THE DEAL', blurb: 'Take the money and the door and the deal. There is no round after this in which anybody can make you pay for it.' },
    outcomes: {
      allStand: 'Nobody took it. {n} people walked out of the same door into the same street, and the van pulled away at 2 a.m. having recorded nothing. Years from now this is the night that gets described at tables like this one, and the number of people in the room will grow every time it is told.',
      allFold: 'Everybody took the deal. Every single person in the room, separately, believing they were being clever, each one picturing the faces of the others when they found out. Nobody got to see anybody’s face. The room was empty by midnight and the money is in an evidence bag.',
      mixed: '{standerNames} held the line. {folderNames} took the deal. They all knew each other before tonight, and they will all know each other after, and that is the sentence this whole game has been walking toward.',
    },
  },
];

/** Trio jobs get their own flavour — three-handed, same maths. */
export const TRIO_SCENARIOS = [
  {
    id: 'threehanded',
    title: 'Three Men, One Room',
    setup: [
      'Three chairs, three lawyers, three doors that lock from the outside. {cop} works the corridor like a man watering plants.',
      'The offer is simple and it has been made to all three: the first to talk gets the door, the last to talk gets everything the other two put down.',
    ],
    pressure: 'Three people can keep a secret if two of them are unusually committed. Nobody has ever managed the third.',
    stand: { label: 'SIT TIGHT', blurb: 'Give them nothing. Two other people have to do the same, and you cannot see either of them.' },
    fold: { label: 'TALK FIRST', blurb: 'Someone always does. The math only punishes you for being second.' },
    outcomes: {
      allStand: 'Three silences in three rooms. {cop} finished the corridor, went back to his car, and sat in it for a while. All three walked. None of them will ever be sure the others didn’t consider it.',
      allFold: 'All three talked, and all three said the same thing about the other two. The corridor took eleven minutes to empty. Nobody got the door.',
      mixed: '{standerNames} sat tight. {folderNames} talked. In a room of three, the arithmetic of loyalty is brutal and instant, and everybody learns their place in it on the same afternoon.',
    },
  },
  {
    id: 'thirdchair',
    title: 'The Third Chair',
    setup: [
      'The job was always a two-man job. There are three of you because somebody’s cousin needed the work and nobody had the heart to say no.',
      'Now there is a third statement, a third set of prints, and a third person deciding, right now, in a room down the hall, what kind of person they are.',
    ],
    pressure: 'Three cuts of a two-man take. Three chances for it to be two.',
    stand: { label: 'NOTHING TO SAY', blurb: 'Hold. Two other people are deciding the same thing about you at this exact moment.' },
    fold: { label: 'CUT IT DOWN', blurb: 'It was always a two-man job. Make sure it is your two.' },
    outcomes: {
      allStand: 'All three held, including the cousin, who nobody expected to hold and who has not stopped bringing it up since. He has earned the right. He will be at every Christmas from here on.',
      allFold: 'Three statements, three versions, three people who each assumed the other two would be the loyal ones. It was never a two-man job. It was never a job at all after that afternoon.',
      mixed: '{standerNames} held. {folderNames} did not. The cousin, for the record, will be told a simplified version of this by somebody at Christmas.',
    },
  },
];
