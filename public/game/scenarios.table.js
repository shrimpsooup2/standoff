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
    id: 'collection',
    title: 'The Collection Run',
    setup: [
      '{n} names on a list, {n} of you, one afternoon. Everything collected goes into one bag, the bag goes upstairs, and what comes back down is multiplied and split evenly.',
      'Nobody follows anybody on a collection run. The entire trade would collapse in a week if anybody did.',
    ],
    pressure: 'Some of those names will say they have nothing. You are the only person who will ever know whether they said it.',
    stand: { label: 'EVERYTHING IN THE BAG', blurb: 'Every dollar you collect goes in. The bag comes back bigger and gets cut evenly.' },
    fold: { label: 'SOME OF IT IN THE BAG', blurb: 'Nobody followed you. Nobody can follow you. The bag still gets cut evenly.' },
    outcomes: {
      allStand: 'Every dollar went in the bag and the bag came back heavy enough that the man upstairs said the word "good," which he says maybe twice a year.',
      allFold: 'Everybody held something back. The bag was so light that the man upstairs did not say anything at all, which is much worse, and the run has been reassigned.',
      mixed: '{standerNames} put in everything. {folderNames} did not. The bag came back and was split {n} ways evenly, in one room, with everybody watching everybody count.',
    },
  },
  {
    id: 'lawyerfund',
    title: 'The Defence Fund',
    setup: [
      'One lawyer, {n} clients, and a strategy that only works if everybody is paying for the same lawyer to tell everybody the same thing.',
      'Pay in and the joint defence holds: one story, one bill, one outcome. Keep your money and get your own guy — who will, being good at his job, immediately advise you to sell out everybody in this room.',
    ],
    pressure: 'The arraignment is Thursday. Whoever has their own lawyer by Thursday will be very obvious on Thursday.',
    stand: { label: 'PAY THE JOINT FEE', blurb: 'One lawyer, one story. It protects everybody, including whoever is quietly not paying.' },
    fold: { label: 'GET YOUR OWN GUY', blurb: 'Keep your money, take the joint defence’s protection anyway, and have somebody in your corner who only works for you.' },
    outcomes: {
      allStand: 'One lawyer, {n} clients, one story, told identically {n} times. She got all of it thrown out by lunchtime on Thursday and then billed accordingly, and everybody paid without complaint.',
      allFold: '{n} separate lawyers arrived at the same courthouse on the same Thursday, each advising their client to be the first one to talk. It went exactly how you would expect.',
      mixed: '{standerNames} paid into the joint defence. {folderNames} arrived with their own counsel, which everybody noticed in the corridor before anybody said a word.',
    },
  },
  {
    id: 'roof',
    title: 'The Roof Over The Club',
    setup: [
      'The roof has been going for three winters. Everybody has put a bucket under it. Nobody has put money into it.',
      'The building is owned by all of you, on paper, in a structure designed by a lawyer who has since been disbarred for unrelated reasons.',
    ],
    pressure: 'A structural engineer has used the phrase "within the year," and the card game is still upstairs, and everybody still goes there every single night.',
    stand: { label: 'PUT IN FOR THE ROOF', blurb: 'Pay your share. The roof goes over everybody, including whoever did not pay.' },
    fold: { label: 'LET SOMEBODY ELSE', blurb: 'There are {n} of you. The roof gets fixed or it doesn’t, and either way you are under it.' },
    outcomes: {
      allStand: 'It was done by October. Nobody mentioned it again, and the buckets went into a cupboard, and this is the single most functional thing this group has ever achieved together.',
      allFold: 'Nobody paid. The roof came in during the first week of February, at four in the morning, onto a card table. The club is gone. Everybody meets at a diner now and it is not the same.',
      mixed: '{standerNames} paid for the roof. {folderNames} sit under it every night, in the warm, and everybody knows the arithmetic of who bought the warmth.',
    },
  },
  {
    id: 'silentpartner',
    title: 'Buying Out Uncle Ray',
    setup: [
      'Uncle Ray has held a third of everything since 1988 and has not done a day’s work since 1991. He would like to retire to Florida and would like to be paid for the privilege.',
      'If all {n} of you put in, Ray goes, and the third he was taking gets divided among everybody forever.',
    ],
    pressure: 'Ray only needs the full number. He does not care whose money it is and he will never be told.',
    stand: { label: 'PUT IN YOUR THIRD', blurb: 'Pay in. Ray goes, and everybody — payers and non-payers alike — collects for the rest of time.' },
    fold: { label: 'KEEP IT, RAY STILL GOES', blurb: 'If everybody else pays, Ray still goes, and you still collect. That is just how buyouts work.' },
    outcomes: {
      allStand: 'Ray got his number, Ray got his condo, and every person in this room got a permanent raise on the same afternoon. Ray sends a card at Christmas that nobody reads.',
      allFold: 'Nobody put in. Ray is still taking his third. Ray will be taking his third at everybody’s funeral, from Florida, where he has gone anyway on the money he is still taking.',
      mixed: '{standerNames} paid for the buyout. {folderNames} did not, and are collecting exactly the same increase, forever, which is a fact that is going to be mentioned at every dinner from now on.',
    },
  },
  {
    id: 'lastnames',
    title: 'The List Of Names',
    setup: [
      'The DA has offered the same thing to all {n} of you: one name each, and the person who gives the name is not on anybody else’s list.',
      'Nobody knows who anybody else is going to name. That is not an oversight in the offer. That is the offer.',
    ],
    pressure: 'A name given by one person is a rumour. The same name given by three people is an indictment, and nobody is being told who else is in the building.',
    stand: { label: 'NO NAMES', blurb: 'Give them nothing. It only works if it is unanimous, and you cannot see anybody else.' },
    fold: { label: 'GIVE ONE NAME', blurb: 'One name buys your way out. Everyone else’s name is still on the table for everyone else.' },
    outcomes: {
      allStand: 'Not one name, out of {n} people, in {n} separate rooms, on the same afternoon. The DA went home and told somebody at dinner that he had never seen anything like it and did not entirely mean it as a compliment.',
      allFold: 'Everybody gave a name. The names, laid side by side, describe this entire table completely. Nobody bought anything. Everybody paid.',
      mixed: '{standerNames} gave nothing. {folderNames} gave a name each, and the names are now on a board in an office, arranged in a shape that everybody in this room is part of.',
    },
  },
  {
    id: 'inheritance',
    title: 'The Old Man’s Estate',
    setup: [
      '{don} left no will that anybody can find and {n} people with an equally reasonable claim to the same set of assets.',
      'There is a version of this where everybody agrees to a clean even split and it takes an afternoon. There is another version where lawyers get involved and it takes nine years and costs more than the estate.',
    ],
    pressure: 'Any one of you can file a claim. One claim forces everybody into the long version. The person who files first gets the best of the long version.',
    stand: { label: 'AGREE THE SPLIT', blurb: 'Even shares, one afternoon, everybody walks away with something and nobody has to see a courtroom.' },
    fold: { label: 'FILE A CLAIM', blurb: 'Get in first. The long version costs everybody, but it costs the people who did not file considerably more.' },
    outcomes: {
      allStand: 'An even split, agreed in an afternoon, around a kitchen table, by people who all had a lawyer’s number in their pocket and did not use it. The old man would have been insufferable about it.',
      allFold: 'Every single person filed. {n} competing claims on one estate. It is now year two. The lawyers have been paid more than the house is worth and everybody still comes to the same funerals.',
      mixed: '{standerNames} agreed to the split. {folderNames} filed. Everybody is going to court now, which is what filing means, which is what {folderNames} knew when they filed.',
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
  {
    id: 'middleman',
    title: 'The Middle Man',
    setup: [
      'Three people, and one of them has been standing between the other two for so long that neither of them knows how to talk to the other directly.',
      'Tonight there are three rooms and no middle. Everybody is talking to everybody, for the first time, about a thing that has always gone through one person.',
    ],
    pressure: 'A structure that runs on one person being in the middle does not survive a night where everybody can see everybody.',
    stand: { label: 'KEEP THE STRUCTURE', blurb: 'Hold, and let the arrangement survive the night. It only needs everybody.' },
    fold: { label: 'GO AROUND HIM', blurb: 'The middle only exists because everybody agreed to it. Stop agreeing.' },
    outcomes: {
      allStand: 'All three held and the arrangement survived, which nobody expected and which the middle man has quietly decided to take personal credit for.',
      allFold: 'Everybody went around everybody. There is no middle now, and no structure, and three people who are going to have to learn to speak to each other directly at the age they are.',
      mixed: '{standerNames} held the structure. {folderNames} went around it. In a room of three, going around somebody means going around them in front of the third person, who watched.',
    },
  },
  {
    id: 'threeenvelopes',
    title: 'Three Envelopes, Two Full',
    setup: [
      'Three envelopes went out on Friday. Two of them were correct. One of them was light by a specific and deliberate amount.',
      'All three of you have now had the weekend to notice, and all three of you have spent it wondering whether the other two noticed, and whether either of them was the reason.',
    ],
    pressure: 'The man who packed the envelopes is dead. This is not suspicious; he was ninety-one. It does, however, mean nobody can ask.',
    stand: { label: 'MINE WAS FINE', blurb: 'Say your envelope was correct and let it be nobody’s problem. It only works if all three say it.' },
    fold: { label: 'MINE WAS LIGHT', blurb: 'Complain first. The complaint gets believed in the order it arrives.' },
    outcomes: {
      allStand: 'All three said theirs was fine. One of them was lying, and all three of them know one of them was lying, and the number in question was small enough that this is now permanent.',
      allFold: 'All three complained. All three cannot be right. The family has decided that the envelopes were all correct and that this crew is expensive to deal with.',
      mixed: '{standerNames} said nothing. {folderNames} complained, and got believed, and the ones who said nothing are now a very specific kind of suspect.',
    },
  },
  {
    id: 'threeseats',
    title: 'A Car With Three Seats',
    setup: [
      'Two in the front, one in the back, and a two hundred mile drive that everybody has done a dozen times without incident.',
      'The person in the back can hear everything the front says. The front cannot see the back without turning around, and nobody turns around.',
    ],
    pressure: 'At the far end there is a man with three separate offers and the patience to make them one at a time.',
    stand: { label: 'NOBODY SAYS ANYTHING', blurb: 'Three people, one car, one story on the way home.' },
    fold: { label: 'TAKE YOUR OFFER', blurb: 'He is making three offers because he only needs one of them taken.' },
    outcomes: {
      allStand: 'Three offers made, three offers refused, two hundred miles home with the radio on. Nobody discussed it in the car and nobody has discussed it since and it is the proudest any of them have been in years.',
      allFold: 'All three took it. They drove home together afterwards, which is the detail that gets left out when this story is told, because it is unbearable.',
      mixed: '{standerNames} refused. {folderNames} did not. Then all three got back in the same car for two hundred miles, and somebody had to pick the music.',
    },
  },
];
