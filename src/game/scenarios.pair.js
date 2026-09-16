// Two people, two rooms, one question. Slots: {A} {B} are the pair (fixed for
// the whole job), {them} is personalised per player, {traitor}/{victim} are
// filled in at the reckoning.

export const PAIR_SCENARIOS = [
  {
    id: 'haddock',
    title: 'The Haddock Problem',
    setup: [
      '{A} and {B} moved fourteen hundred pounds of frozen haddock across three state lines on Tuesday. The haddock was not haddock. Everyone in this story is clear on the fact that the haddock was not haddock.',
      'The truck died outside {place}. By the time the tow arrived so had {cop}, and now there are two rooms with the same water stain on the ceiling, and the same question being asked in two different tones.',
    ],
    pressure: '"Your friend is four doors down, saying words," {cop} says, not looking up. "First one to say them back keeps the truck and the rest of the afternoon."',
    stand: { label: 'IT WAS FISH', blurb: 'Stick to the manifest. Eat whatever they have. Put the whole night on {them}.' },
    fold: { label: 'IT WAS NOT FISH', blurb: 'Give them the route, the buyer, and the name on the loading dock. Be home before lunch.' },
    outcomes: {
      bothStand: 'Four hours, one word each: fish. Nothing sticks to a story nobody contradicts. {A} and {B} split a cab home and neither one brings up the part where they were afraid.',
      bothFold: 'They talked over each other. Same route, same buyer, same dock, delivered at the same volume. {cop} barely had to write. Everybody gets a deal, which means nobody gets a deal.',
      betray: '{traitor} talked. {victim} did not. {victim} learned about it in the hallway, from the back of {traitor}’s head, walking toward a door that was already open for him.',
    },
  },
  {
    id: 'cannoli',
    title: 'The Icing Ledger',
    setup: [
      'For nine months the second set of books lived inside a bakery. Not in the bakery — inside it. Figures piped in blue gel onto sheet cakes, photographed, filed, then eaten by whoever was nearest.',
      '{A} took the photographs. {B} kept the negatives, because {B} does not trust clouds. Last week a cake went out the front door by mistake, to a christening, attended by {cop}.',
    ],
    pressure: 'The DA has an evidence photograph of a sheet cake reading 84,000 in cursive. He would like someone — anyone — to talk to him about the cursive.',
    stand: { label: 'IT’S A CAKE', blurb: 'It is a cake. It has always been a cake. Say it for as long as it takes and hope {them} can keep a straight face.' },
    fold: { label: 'NAME THE BAKER', blurb: 'Give them the bakery, the baker, and the piping technique. It is only frosting until somebody explains it.' },
    outcomes: {
      bothStand: 'Two adults held a straight face through ninety minutes of questions about frosting. The tape is useless. {A} and {B} have not laughed yet. They will, in about a week, and then not stop for an hour.',
      bothFold: 'Two identical confessions about cake, filed eleven minutes apart. The DA has the recipe twice and no idea which of them to thank, so he thanks neither and charges both.',
      betray: '{traitor} explained the cursive. {victim} was still saying "it’s a cake" to a man who already had the address of the bakery. Page nine of the transcript: {victim} says, "ask {traitor}, he’ll tell you I’m straight." {traitor} had already told him the opposite, at length.',
    },
  },
  {
    id: 'nephew',
    title: 'The Nephew Is Fine',
    setup: [
      '{don}’s nephew vanished in March. The family grieved. There was a mass, a buffet, and a framed photo that everyone agreed did not look like him.',
      'The nephew is in Delray Beach. He is fine. He is tan. He picked his new name off a cruise brochure, and {A} and {B} know all of this because {A} and {B} are the ones who drove him down.',
      'There is an insurance payout now, and a widow who isn’t one, and {cop} holding a death certificate with a typo that also appears on a parking ticket from {place}.',
    ],
    pressure: '"Fraud is years," {cop} says. "Telling me where a living man gets his mail is a phone call. I’ll even dial."',
    stand: { label: 'WE BURIED HIM', blurb: 'Hold the funeral story. It cost a mass and a buffet already. It will cost more if {them} folds.' },
    fold: { label: 'DELRAY BEACH', blurb: 'One address. One tan man. The payout evaporates and so does everyone’s exposure — except {them}’s.' },
    outcomes: {
      bothStand: 'Both of them grieved, convincingly, for an hour and ten minutes. {cop} attended a funeral twice in one afternoon and left with nothing. The nephew, unaware, went to a seafood buffet.',
      bothFold: 'Two men gave up the same tan man in the same twenty minutes. The nephew was picked up at a pool bar. He asked which of them said it. Nobody has the heart to tell him it was both.',
      betray: '{traitor} gave the address. {victim} kept grieving for a man {victim} had personally helped choose a cruise-brochure name. The nephew took it better than {victim} did.',
    },
  },
  {
    id: 'dog',
    title: 'The Matter Of The Dog',
    setup: [
      'Somebody gave {animal} something that was not food. {animal} is fine now — medicated, expensive, and fine — but {don} has spent eleven thousand dollars at an animal hospital and has started using the word "deliberate."',
      '{A} and {B} were both at the house that night. One of them was in the kitchen. Both of them say the other one was in the kitchen.',
    ],
    pressure: '{don} does not need a court. {don} needs a name, and has decided to have one before the veal comes out.',
    stand: { label: 'I WASN’T IN THE KITCHEN', blurb: 'Say nothing about {them}. Let the Old Man’s patience run out on its own.' },
    fold: { label: 'IT WAS HIM', blurb: 'Give {don} the name he came for. He is not going to check it twice.' },
    outcomes: {
      bothStand: 'Neither of them said a word and the veal got cold. {don} looked at both of them for a long time and then talked about his knee instead. The dog, later, sat with them on the porch like nothing had happened.',
      bothFold: 'They accused each other in the same breath, in front of eleven relatives. {don} believes both of them now. This is worse than either of them being believed alone.',
      betray: '{traitor} gave the name without ceremony, between courses. {victim} spent the rest of dinner defending {traitor} to an aunt, which is the detail that will get repeated at every funeral from here on.',
    },
  },
  {
    id: 'vault',
    title: 'The Empty Vault',
    setup: [
      'The vault was not light. It was empty — swept, wiped, the felt still holding the rectangular ghosts of stacks that somebody had moved about forty minutes before anyone arrived.',
      'Only two people had the schedule: {A} and {B}. Only one of them needed to sell it. {cop} has worked this out. So has {don}, which is considerably worse.',
    ],
    pressure: 'Two rooms. Two clocks. {cop} has told each of them, separately and with total confidence, that the other one has already started drawing a diagram.',
    stand: { label: 'I NEVER HAD IT', blurb: 'Say nothing, and trust that {them} did not sell the schedule — or, failing that, will at least go down holding it.' },
    fold: { label: 'HE HAD THE SCHEDULE', blurb: 'Put it on {them} first. In an empty vault, the first story is the true one.' },
    outcomes: {
      bothStand: 'Neither diagram was ever drawn. {cop} has an empty vault, two silences, and a theory he will describe to his wife for years. {A} and {B} still do not know which one of them did it, and have agreed never to raise it.',
      bothFold: 'Two diagrams, drawn simultaneously in adjacent rooms, each one accusing the other. {cop} laid them side by side and said, out loud, to nobody: "Well."',
      betray: '{traitor} drew the diagram. {victim} spent four hours explaining why {traitor} would never do that. The diagram was already on the wall by then, with {victim}’s name in the box marked INSIDE.',
    },
  },
  {
    id: 'karaoke',
    title: 'New York, New York',
    setup: [
      'At {bar}, at {time}, a man climbed onto a small stage and sang a confession to the tune of "New York, New York." He changed maybe four words. They were the load-bearing four.',
      'There is footage. There is a great deal of footage; it was somebody’s fiftieth. {A} was holding the phone. {B} was doing the harmonies, audibly, in tune.',
    ],
    pressure: 'The DA has the video and one question: who is holding the camera, and who is the second voice? Answering either question answers both.',
    stand: { label: 'THAT’S NOT MY VOICE', blurb: 'Deny the voice, deny the phone, deny the fiftieth. Hope {them} has the same range.' },
    fold: { label: 'IDENTIFY THE SINGERS', blurb: 'Name the voices. It is a party video until someone puts names to it, and then it is a document.' },
    outcomes: {
      bothStand: 'Neither would identify a single voice on a recording in which both of them are clearly, joyfully audible. The DA played it four times. By the fourth, {cop} was humming. The file is closed.',
      bothFold: 'They both named the singers. They both named themselves in the process, which neither had fully thought through. The video is now labelled, indexed and, in a legal sense, a duet.',
      betray: '{traitor} named the voices. {victim} spent the interview insisting it was a coincidence that sounded like everyone. The last frame of the video is {victim} putting an arm around {traitor}’s shoulders for the big finish.',
    },
  },
  {
    id: 'unit114',
    title: 'Unit 114',
    setup: [
      'Unit 114. Two keys, one padlock, an arrangement built entirely on the understanding that neither of you would ever go out there alone.',
      'The front desk logs every entry. Last Thursday at {time} it logged exactly one. The unit is now short {item}, and each of you has spent four days deciding not to mention it.',
    ],
    pressure: '{don} would like the unit inventoried on Friday, with both of you present, holding your keys where he can see them.',
    stand: { label: 'THE LOG IS WRONG', blurb: 'Back {them}. Blame the clerk, the system, the door. Two keys, one story.' },
    fold: { label: 'ASK HIM WHY HE WENT', blurb: 'Point at the log, point at {them}, and let Friday belong to somebody else.' },
    outcomes: {
      bothStand: 'They blamed the clerk in unison and with some genuine anger. The clerk was fired. {A} and {B} drove home separately, and each of them thought, privately, the whole way: it was him. Neither will ever ask.',
      bothFold: 'Each pointed at the other’s key. {don} now owns two keys and a theory involving both of them. The unit was re-padlocked with a lock that neither of them opens.',
      betray: '{traitor} pointed at the log. {victim} had spent four days preparing an explanation for why {traitor} could not possibly have gone out there alone, and delivered it, in full, to a room that had already moved on.',
    },
  },
  {
    id: 'cement',
    title: 'The Feinberg Pour',
    setup: [
      'The Feinberg job poured on a Tuesday. {A} signed the ticket. {B} approved the mix. The mix contained a percentage of something the mix is not supposed to contain, which saved {amount} and roughly nine days.',
      'A municipal inspector is now standing in a parking structure with a stethoscope, listening to a wall the way a doctor listens to a chest, and making a face.',
    ],
    pressure: 'One signature on the ticket, one initial on the mix sheet. Whichever document arrives at the DA first becomes the honest one.',
    stand: { label: 'THE MIX WAS THE MIX', blurb: 'Stand on the paperwork. It holds if {them} holds.' },
    fold: { label: 'HAND OVER THE MIX SHEET', blurb: 'The initials on the mix sheet are not yours. Make sure everybody knows whose they are.' },
    outcomes: {
      bothStand: 'Two men swore to a mix that a wall is currently disagreeing with. Without a document, the inspector has an opinion and a stethoscope. The structure, for what it is worth, is still standing, and so are they.',
      bothFold: 'The ticket and the mix sheet arrived within the same hour, each offered as proof of the other man’s guilt. Together they make a complete and beautifully documented crime.',
      betray: '{traitor} produced the mix sheet. {victim} had already told the inspector, unprompted and with feeling, that {traitor} was the only honest contractor left in the county.',
    },
  },
  {
    id: 'horse',
    title: 'Perpetual Motion, 40-1',
    setup: [
      'The horse is called Perpetual Motion. He came in at 40-1 in a manner several veterinarians have independently described as "enthusiastic."',
      '{A} bought the syringe. {B} bought the horse. Somebody bought the jockey, and the jockey has a lawyer now, and the lawyer has a suit that cost more than the horse.',
    ],
    pressure: 'The racing commission does not put people in prison. The racing commission puts people in a newsletter, forever, with a photograph. {cop} can make it worse than that.',
    stand: { label: 'HE’S JUST FAST', blurb: 'The horse is fast. Horses are fast. Let {them} say the same and let the vets argue.' },
    fold: { label: 'GIVE THEM THE SYRINGE', blurb: 'Somebody is going in the newsletter. Decide now that it is {them}.' },
    outcomes: {
      bothStand: 'Both insisted the horse was simply a gifted horse. The commission, lacking a second voice, wrote a paragraph about "irregularities" and moved on. Perpetual Motion has been retired to a field and seems content.',
      bothFold: 'Each one handed over the other. The commission now has a syringe, an owner, a jockey and a newsletter that runs to two pages with photographs of everyone.',
      betray: '{traitor} handed over the syringe. {victim} is in the photograph too, standing slightly behind, having driven {traitor} to the hearing that morning.',
    },
  },
  {
    id: 'xerox',
    title: '214 Pages',
    setup: [
      'Somebody photocopied the ledger at the office on {place}. The copier, which nobody in the history of this organisation has ever thought about, keeps a log.',
      '214 pages, {time}, badge number 0041 — a badge {A} and {B} share, because two badges cost money and trusting each other was free.',
    ],
    pressure: '{don} has the copier log printed out and folded in his jacket. He has had it for two days. He is waiting to see which of you mentions the copier first.',
    stand: { label: 'NEVER TOUCHED IT', blurb: 'One badge, two men, no way to split the difference — unless {them} splits it for you.' },
    fold: { label: 'IT’S HIS SHIFT', blurb: '{time} is not your hour. Say whose it is before he says it is yours.' },
    outcomes: {
      bothStand: 'Neither mentioned the copier. {don} left the log folded in his jacket and bought them both a drink, which is either forgiveness or bookkeeping. They have decided to take it as forgiveness.',
      bothFold: 'Both of them brought up the copier within a minute of each other, each explaining that {time} was the other man’s hour. It is nobody’s hour. The badge has been retired.',
      betray: '{traitor} named the hour. {victim} did not even know the copier had a log, and found out in the same sentence that identified him.',
    },
  },
  {
    id: 'wedding',
    title: 'Cousin Dina’s Reception',
    setup: [
      'Four hundred guests. A chocolate fountain. A band that only knew nine songs and played all of them twice.',
      'Between the toasts and the tarantella, {A} and {B} moved {item} out through the kitchen during the father-daughter dance. Three people saw. One of them is {cop}’s nephew. Dina has not spoken to either of you since, for reasons that are unrelated and also entirely this.',
    ],
    pressure: 'There is wedding video. There is always wedding video. It is forty minutes long and for eleven seconds of it, the kitchen door is open.',
    stand: { label: 'I WAS ON THE DANCE FLOOR', blurb: 'Four hundred witnesses, most of them drunk. It holds, if {them} is also dancing.' },
    fold: { label: 'THE KITCHEN DOOR', blurb: 'Eleven seconds of footage, and you can narrate all of it.' },
    outcomes: {
      bothStand: 'Both swore they were on the dance floor, and eleven seconds of open door proved only that a door was open. Dina still isn’t speaking to either of them. That part is not legally actionable.',
      bothFold: 'Both narrated the footage. The DA has two accounts of the same eleven seconds and does not need a third. The video has been slowed down and everything.',
      betray: '{traitor} narrated the eleven seconds. {victim} appears in them, holding one end of {item}, having been told to take the heavier end because {traitor}’s back was acting up.',
    },
  },
  {
    id: 'alibi',
    title: 'Fishing, Upstate, No Signal',
    setup: [
      'You have been each other’s alibi for eleven years. For things that happened, things that didn’t, and one long weekend nobody has ever clarified.',
      'The story has never changed: fishing, upstate, no signal. It has been repeated to wives, to lawyers, to a priest and to a grand jury, always in the same eleven words.',
      '{cop} has pulled the tower data. Neither of you was upstate. One of you was somewhere that matters.',
    ],
    pressure: '"I don’t need the truth," {cop} says. "I need one of you to stop saying the same eleven words. That’s it. That’s the whole ask."',
    stand: { label: 'FISHING, UPSTATE, NO SIGNAL', blurb: 'Eleven years, eleven words. Say them again. So does {them}, or none of it ever meant anything.' },
    fold: { label: 'CHANGE THE STORY', blurb: 'Break the sentence. Eleven years ends today, but it ends on your terms.' },
    outcomes: {
      bothStand: 'Eleven words, twice, in two rooms, word for word, in the eleventh year. {cop} read the transcripts side by side and felt something close to respect. Neither of them has ever been fishing.',
      bothFold: 'Both broke the sentence within the same half hour, and the two new stories do not match each other or anything else. Eleven years of perfect testimony, undone by two men improvising separately.',
      betray: '{traitor} changed the story. {victim} said the eleven words, again, for the last time, to a man who was already holding a different version signed by somebody {victim} has been fishing with for eleven years.',
    },
  },
  {
    id: 'lasagna',
    title: 'Mama’s Sunday Bake',
    setup: [
      'Nonna’s recipe lives on the back of a 1971 utility bill and has never left the house. That is not sentiment, that is policy, enforced.',
      'It has left the house. It is on a laminated menu at a chain restaurant off {place} under the name "Mama’s Sunday Bake," with a photograph, and the family has convened about this with more gravity than it once applied to an actual shooting.',
      'Two people have been alone in that kitchen this year: {A} and {B}.',
    ],
    pressure: '{don} has ordered the dish. {don} has eaten the dish. {don} says it is close but the ricotta is wrong, and he says it in a tone that suggests the ricotta being wrong is the only thing keeping somebody alive.',
    stand: { label: 'IT’S A COINCIDENCE', blurb: 'Every family makes lasagna. Say it with a straight back and pray {them} does too.' },
    fold: { label: 'HE WAS IN THE KITCHEN', blurb: 'One of you sold a dead woman’s handwriting to a restaurant chain. Make sure the family agrees on which.' },
    outcomes: {
      bothStand: 'Both said coincidence. {don} chewed for a while and let it go, mostly because letting it go was easier than believing either of them capable of it. The utility bill has been moved somewhere with a lock.',
      bothFold: 'Each named the other, in the kitchen, at volume, holding forks. The family has concluded that the recipe was sold twice, which is not true and will never be corrected.',
      betray: '{traitor} named the kitchen. {victim} had spent the week telling everyone that {traitor} loved that woman like she was his own — which was true, and did not help.',
    },
  },
  {
    id: 'envelope',
    title: 'The Envelope Is Light',
    setup: [
      'Every month an envelope travels from a laundromat to a man in a parked car. {A} carries it. {B} counts it before it goes.',
      'For four months the envelope has arrived light. Not dramatically. Just enough. The man in the car has begun counting it in front of {A}, slowly, out loud, like a lesson being taught to somebody who isn’t in the room yet.',
    ],
    pressure: 'This month the man in the car has asked for both of you. Not the envelope. Both of you.',
    stand: { label: 'SAY NOTHING', blurb: 'Take the meeting, take the look, and say nothing about {them} — including the part you have been thinking about for four months.' },
    fold: { label: 'HE COUNTS IT FIRST', blurb: 'Only one of you touches it before the car. Point that out clearly, and early.' },
    outcomes: {
      bothStand: 'Neither said a word in that car. The man counted, said "hm," and sent them home. The envelope has been correct ever since, and neither of them knows why, and neither of them is going to ask.',
      bothFold: 'They accused each other in a parked car, at length, with a third man listening and not writing anything down. He did not need to write anything down.',
      betray: '{traitor} mentioned who counts it first. {victim} had, in fact, been covering the shortfall out of pocket for two months to protect {traitor} from exactly this conversation.',
    },
  },
  {
    id: 'ferry',
    title: 'Sports Equipment',
    setup: [
      'The 6:10 ferry. Customs on the far side, two officers, one dog with a job.',
      'Under a blue tarp: {item}, and a shipping label reading SPORTS EQUIPMENT in a handwriting that belongs to one of you and, under stress, looks like both.',
    ],
    pressure: 'Customs has separated you. They have all night, a warm room, and a printer that produces the same form over and over.',
    stand: { label: 'IT’S SPORTS EQUIPMENT', blurb: 'Whatever it is, it is sports equipment, and it stays sports equipment for as long as {them} agrees.' },
    fold: { label: 'THAT’S HIS HANDWRITING', blurb: 'One of you has to own the label. There is a handwriting expert on retainer and a sample already on file.' },
    outcomes: {
      bothStand: 'It remained, officially and permanently, sports equipment. The dog disagreed but the dog does not fill out forms. They drove off the ferry at dawn without speaking, because there was nothing left to say and nothing they needed to.',
      bothFold: 'Both identified the handwriting as the other man’s. The expert’s report notes, drily, that the sample matches "a person under considerable pressure," which describes everyone on the ferry.',
      betray: '{traitor} identified the handwriting. It was, as it happens, {traitor}’s handwriting. {victim} knew that, and had known it since the parking lot, and did not say so even after.',
    },
  },
  {
    id: 'atm',
    title: 'The Machine In The Garage',
    setup: [
      'It took six hours, a chain, {car}, and a level of commitment that everybody involved now finds embarrassing to discuss.',
      'The ATM is in a garage in {place}. Upright. Full. Still displaying a welcome screen and a scrolling message about a loyalty programme.',
      'The garage is rented in {A}’s name. The chain was bought on {B}’s card. Neither of these facts can be moved.',
    ],
    pressure: 'A detective has both receipts and an aerial photograph of a driveway with a very deep groove in it.',
    stand: { label: 'WHAT GARAGE', blurb: 'Two receipts prove two purchases. They do not prove a night. Not unless {them} narrates it.' },
    fold: { label: 'THE GARAGE, THE CHAIN, ALL OF IT', blurb: 'Six hours of extremely traceable effort. Be the one who explains it.' },
    outcomes: {
      bothStand: 'A garage, a chain and a groove in a driveway, and not one word from either of them. The machine is still in there. It still says welcome. Neither of them can go near it for at least a year, which they have accepted, together.',
      bothFold: 'Both explained the six hours, in detail, with pride creeping in around the third hour. The detective now understands the whole operation and thinks less of both of them for it.',
      betray: '{traitor} explained the six hours. {victim} is in the aerial photograph, a small bright shape by the driveway, at 4 a.m., holding the end of a chain that {traitor} had asked him to hold.',
    },
  },
  {
    id: 'priest',
    title: 'Saturdays At {time}',
    setup: [
      'Father Dominic hears confession on Saturdays. Since April, Father Dominic’s confessional has also contained a device that is not part of the sacrament, installed by people who did not ask Father Dominic.',
      '{A} confessed. {B} drove {A} there and waited outside with the engine running, which is, canonically and legally, its own kind of confession.',
    ],
    pressure: 'A federal prosecutor has eleven minutes of audio and a problem: the tape is inadmissible unless somebody in it agrees that it happened.',
    stand: { label: 'THAT IS BETWEEN ME AND GOD', blurb: 'The tape is nothing without a witness. Let it stay nothing — as long as {them} lets it.' },
    fold: { label: 'CONFIRM THE TAPE', blurb: 'Agree that the eleven minutes happened. The tape becomes real and the problem becomes {them}’s.' },
    outcomes: {
      bothStand: 'Neither confirmed a second of it. Eleven minutes of audio, legally worthless, sitting in an evidence room. Father Dominic, who was not consulted about any of this, has said a rosary for everyone involved including the technician.',
      bothFold: 'Both confirmed the tape. It is admissible now, twice over. The transcript is being read aloud in a courtroom by a clerk with no sense of pacing.',
      betray: '{traitor} confirmed the tape. On the recording, in minute nine, {traitor} can be heard saying that {victim} is the only person he’s ever fully trusted. The prosecutor plays that part for the jury, because it is true.',
    },
  },
  {
    id: 'slots',
    title: 'The Machine In The Back Of The Diner',
    setup: [
      'There is a machine behind the pie case that pays out three percent too often, on purpose, to people who know to press the button twice.',
      '{A} built the board. {B} wrote the list of people who know. The list runs to thirty-one names and one of them is {cop}’s brother-in-law, who has been winning all year and telling absolutely everybody.',
    ],
    pressure: 'Gaming enforcement has the machine on a truck. They have not opened it yet. They have mentioned, twice, that they have not opened it yet.',
    stand: { label: 'IT’S A MACHINE', blurb: 'Machines pay out. That is the entire concept of machines. Hold that line with {them}.' },
    fold: { label: 'GIVE THEM THE LIST', blurb: 'Thirty-one names buys one name off the list. It will not be {them}’s.' },
    outcomes: {
      bothStand: 'The board was never explained and the list was never produced. The machine sits in an evidence garage paying out to nobody. Thirty-one people keep quiet for reasons of their own, which is the only reason any of this ever works.',
      bothFold: 'Two copies of the same list, from two directions. Thirty-one names, now thirty-three, since both of them signed their statements.',
      betray: '{traitor} produced the list. {victim} is on it at number four, which is where {traitor} put him, years ago, as a favour.',
    },
  },
  {
    id: 'will',
    title: 'A Loving Forgery',
    setup: [
      '{don}’s will was notarised on a Sunday, in a kitchen, by a notary who had come for a different reason entirely and never quite got to it.',
      'It was signed by two witnesses: {A} and {B}. The signature above theirs is very good. It is not, however, {don}’s.',
      'A handwriting examiner from Albany has called it, in her report, "a loving forgery." She meant it technically. It has been read aloud three times at family gatherings anyway.',
    ],
    pressure: 'Probate court would like to hear from the witnesses. Separately. Today.',
    stand: { label: 'I SAW HIM SIGN IT', blurb: 'You saw what you saw. So did {them}, if {them} holds.' },
    fold: { label: 'HE WASN’T IN THE ROOM', blurb: 'The truth is short and it ends the estate fight immediately, in a direction that suits you.' },
    outcomes: {
      bothStand: 'Two witnesses, one version, no cracks. The will stands. The house goes where everybody knew it was always going to go, and the examiner’s report becomes a family joke rather than a family catastrophe.',
      bothFold: 'Both admitted the room was empty. The estate now belongs to a cousin in Phoenix who has never been to the house and is talking about selling.',
      betray: '{traitor} said the room was empty. {victim} had already testified, in detail, about the light in that kitchen and the way the old man’s hand shook — a description {victim} had rehearsed with {traitor} in the parking lot.',
    },
  },
];
