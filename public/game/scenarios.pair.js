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
    did: {
      stand: 'said fish, for four hours, to three different people',
      fold: 'gave them the route, the buyer and the name on the loading dock',
    },
    extra: [
      {
        archetype: 'half',
        label: 'GIVE THEM THE DOCK',
        blurb: 'Hand over the loading bay and the paperwork and nothing with a name on it. Useful enough to be worth a deal, small enough that you can still look at {them} afterwards — except it is on the record now that you talked.',
        did: 'gave them the dock and the paperwork and not one name',
      },
      {
        archetype: 'gamble',
        label: 'BLAME THE DRIVER',
        blurb: 'Put the whole thing on a man who is not in this building. It is airtight if {them} tells it the same way and it falls apart the instant {them} says anything else at all.',
        did: 'put the whole thing on a driver who has been in Baltimore since March',
      },
    ],
    closers: {
      murky: 'Two men told two partial truths in two rooms and between them handed over half a case and nobody at all. {cop} has a file that is thicker than it was and worth exactly as much.',
    },
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
    did: {
      stand: 'said it was a cake, ninety times, with a completely straight face',
      fold: 'gave them the bakery, the baker and the piping technique',
    },
    extra: [
      {
        archetype: 'half',
        label: 'GIVE THEM THE BAKERY',
        blurb: 'Hand over the address and let them find the rest themselves. You have not named a person. You have simply pointed at a building, which is a distinction that matters to you and to nobody else.',
        did: 'gave them the address of the bakery and stopped there',
      },
      {
        archetype: 'shield',
        label: 'CALL THE LAWYER IN',
        blurb: 'Say nothing further without counsel. You lose the afternoon and whatever the job was worth, and there is no version of this where you personally go down for frosting.',
        did: 'stopped talking and asked for a lawyer, twice, on tape',
      },
    ],
    closers: {
      murky: 'Nobody confessed and nobody held. The DA has an address, a refusal and a photograph of a cake, and is going to spend a fortnight deciding which of those is a case.',
    },
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
    did: {
      stand: 'grieved, convincingly, for a man who is alive in Florida',
      fold: 'gave them the address, the new name and the cruise brochure it came from',
    },
    extra: [
      {
        archetype: 'half',
        label: 'GIVE THEM THE STATE',
        blurb: 'Say Florida and stop. It is enormous, it is true, and it puts a very tired man in an office in front of a map for about nine months.',
        did: 'said Florida, and nothing else, and let a tired man look at a map',
      },
      {
        archetype: 'gamble',
        label: 'SAY HE IS IN CANADA',
        blurb: 'Send them somewhere he has never been. If {them} tells the same story it buys everybody a year; if {them} tells the truth, you are now a man who lied to a federal agent about a border.',
        did: 'sent them to Canada, with details, none of which were true',
      },
    ],
    closers: {
      murky: 'The nephew is still in Delray Beach. He has been moved twice since, at his own insistence, and is now furious with everybody at this table for reasons he has never been told.',
    },
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
    did: {
      stand: 'said nothing at all, through the veal and the coffee',
      fold: 'gave {don} a name between courses',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'BLAME THE VET',
        blurb: 'Say the dog got into something at the kennel. It is plausible, it is unprovable, and it protects you completely — at the cost of a decent man who boards dogs for a living.',
        did: 'put it on the kennel, and on a man who boards dogs for a living',
      },
      {
        archetype: 'muscle',
        label: 'SETTLE IT AT THE TABLE',
        blurb: 'Name it out loud, in front of eleven relatives, and demand the eleven thousand back on the spot. Whoever kept quiet about this loses most of what tonight was worth. If nobody was hiding anything you have ruined a dinner for nothing.',
        did: 'raised it at the table, in front of everybody, and asked for the money back',
      },
    ],
    closers: {
      murky: 'The dog is fine. A man who boards dogs is not. {don} let it go over the coffee in a way that everybody understood to mean he had not let it go.',
    },
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
    did: {
      stand: 'said nothing about the schedule, for four hours',
      fold: 'drew {cop} a diagram with the other name in the box marked INSIDE',
    },
    extra: [
      {
        archetype: 'half',
        label: 'GIVE THEM THE TIMES',
        blurb: 'Hand over the schedule and not who had it. It narrows their week down to forty minutes and it does not, technically, name anybody.',
        did: 'gave them the forty minutes and refused to say whose forty minutes',
      },
      {
        archetype: 'shield',
        label: 'GET AHEAD OF THE FAMILY',
        blurb: 'Forget {cop}. Go to {don} first and say you have no idea, before anybody else gets to say it for you. It costs you the job and it means nobody upstairs is looking at you.',
        did: 'went to {don} first and got there before the story did',
      },
    ],
    closers: {
      murky: '{cop} has a forty-minute window, two refusals and an empty vault. {don} has something worse, which is a clear sense that both of them handled it rather than one.',
    },
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
    did: {
      stand: 'refused to identify a single voice on the tape',
      fold: 'named both singers, the phone and the fiftieth',
    },
    extra: [
      {
        archetype: 'half',
        label: 'NAME THE SINGER ONLY',
        blurb: 'Identify the man on the stage and claim you cannot place the harmonies. It is half a document and it leaves one of you off it entirely.',
        did: 'named the man on the stage and claimed the harmonies could be anyone',
      },
      {
        archetype: 'gamble',
        label: 'SAY IT IS A DIFFERENT PARTY',
        blurb: 'Insist the video is from a wedding in 2019 and the voices belong to people who have since moved away. It works if the account matches and it is perjury the moment it doesn’t.',
        did: 'swore the video was a wedding in 2019, with dates',
      },
    ],
    closers: {
      murky: 'The DA now has one named singer, one contested harmony and four minutes of footage that he has watched more times than anybody should have to. It is not a case. It is not nothing.',
    },
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
    did: {
      stand: 'blamed the clerk, with real and convincing anger',
      fold: 'pointed at the log, the key and the man holding the other one',
    },
    extra: [
      {
        archetype: 'half',
        label: 'PAY IT BACK QUIETLY',
        blurb: 'Cover the missing {item} out of your own pocket before Friday and say nothing to anybody. It costs you real money and the inventory balances and nobody is ever accused of anything.',
        did: 'quietly covered the shortfall out of pocket before Friday',
      },
      {
        archetype: 'muscle',
        label: 'OPEN BOTH KEYS ON THE TABLE',
        blurb: 'Put both keys down in front of {don} and demand the unit be opened now, together. Whoever went out there alone loses everything they took. If nobody did, you have just accused a friend in front of the Old Man.',
        did: 'put both keys on the table and asked for the unit to be opened there and then',
      },
    ],
    closers: {
      murky: 'The unit balanced on Friday, which nobody can account for, and {don} has re-padlocked it with a lock that neither of them opens.',
    },
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
    did: {
      stand: 'swore to a mix that a parking structure is currently disagreeing with',
      fold: 'handed over the mix sheet with somebody else’s initials on it',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'PUT IT ON YOUR TICKET',
        blurb: 'Sign for the mix yourself, all of it, and take the licence hit. It costs you your year and it takes everybody else out of the inspector’s notebook entirely.',
        did: 'signed for the whole mix personally and took the licence hit',
      },
      {
        archetype: 'half',
        label: 'BLAME THE SUPPLIER',
        blurb: 'Say the batch came in wrong from the plant. It is a real thing that really happens and it spreads the blame across a company instead of a person.',
        did: 'put the batch on the supplier, which is a real thing that really happens',
      },
    ],
    closers: {
      murky: 'The inspector has a supplier, a martyr and a wall that is still making a noise. The Feinberg job will be re-poured in the spring by somebody else.',
    },
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
    did: {
      stand: 'insisted, at length, that the horse is simply a gifted horse',
      fold: 'handed over the syringe and the name of the man who filled it',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'GIVE UP THE JOCKEY',
        blurb: 'The jockey already has a lawyer and is already going in the newsletter. Add your account to his and you are a witness rather than a subject. He is finished either way; you are choosing not to be finished with him.',
        did: 'gave them the jockey, who was finished anyway, and became a witness',
      },
      {
        archetype: 'gamble',
        label: 'DEMAND A SECOND TEST',
        blurb: 'Insist on retesting the horse. If the first sample was handled badly — and it was handled by a man on his fourth race of the day — the whole thing collapses. If it wasn’t, you have doubled the paperwork with your name on all of it.',
        did: 'demanded a second test on a sample that had been handled by a tired man',
      },
    ],
    closers: {
      murky: 'The commission has a jockey, a demand for a retest and a horse that has been retired to a field. Perpetual Motion seems content. Nobody else involved is.',
    },
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
    did: {
      stand: 'never once mentioned the copier',
      fold: 'told {don} exactly whose hour {time} is',
    },
    extra: [
      {
        archetype: 'half',
        label: 'ADMIT THE BADGE, NOT THE HOUR',
        blurb: 'Say the badge is shared, which everybody knows, and refuse to say who had it that night. It keeps one name out of it and it puts a very specific question in front of the Old Man.',
        did: 'admitted the badge was shared and refused to say whose hour it was',
      },
      {
        archetype: 'muscle',
        label: 'DEMAND THE LOG BE READ OUT',
        blurb: 'Ask {don} to unfold the paper in his jacket and read it to the room. Whoever has been quiet about that night loses whatever they made from it. If nobody has, you have asked the Old Man to do something in front of people.',
        did: 'asked {don} to take the log out of his jacket and read it aloud',
      },
    ],
    closers: {
      murky: 'The copier log stayed folded in a jacket. Badge 0041 has been retired and replaced with two badges, which is what should have happened in the first place and costs more than anybody saved.',
    },
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
    did: {
      stand: 'swore they were on the dance floor for the whole of it',
      fold: 'narrated all eleven seconds of the kitchen door',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'BLAME THE CATERERS',
        blurb: 'Say the kitchen was full of staff nobody knew and anybody could have moved anything. It is true, it is useless to the DA, and it leaves a catering company with a very bad month.',
        did: 'put it on a catering company that had eleven people in that kitchen',
      },
      {
        archetype: 'gamble',
        label: 'PRODUCE THE OTHER VIDEO',
        blurb: 'Four hundred guests means four hundred phones. Find a second angle that shows the two of you dancing. If it exists you are clear for good; if the timestamps are eleven seconds out, you have handed them the exhibit.',
        did: 'went looking for a second angle, and handed over whatever was found',
      },
    ],
    closers: {
      murky: 'Dina still is not speaking to either of them. A catering company has lost two contracts. The eleven seconds have now been slowed down, brightened, and shown to a grand jury.',
    },
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
    did: {
      stand: 'said the eleven words again, in the eleventh year',
      fold: 'broke the sentence and gave {cop} a new one',
    },
    extra: [
      {
        archetype: 'half',
        label: 'CHANGE ONE WORD',
        blurb: 'Keep the story and move it forty miles. Not upstate — a different lake, a different weekend. It survives the tower data and it means eleven years of identical testimony has a seam in it now.',
        did: 'kept the story and moved it forty miles, which put a seam in eleven years',
      },
      {
        archetype: 'martyr',
        label: 'TAKE THE WEEKEND ALONE',
        blurb: 'Say you were there by yourself and always have been. It removes the alibi, which is the only thing protecting you, and it removes {them} from the file completely.',
        did: 'took the weekend alone and left the other name out of the file entirely',
      },
    ],
    closers: {
      murky: 'The eleven words are gone. There is a version now with a lake in it and a version with nobody else in it, and they do not agree, and both of them are being typed up.',
    },
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
    did: {
      stand: 'said coincidence, with a straight back, over the forks',
      fold: 'named the kitchen and the person who was alone in it',
    },
    extra: [
      {
        archetype: 'half',
        label: 'SAY IT WAS NONNA HERSELF',
        blurb: 'Claim the old woman gave the recipe away years ago to somebody at the church. She is not here to contradict it. It ends the matter and it puts a small, permanent lie into the family history.',
        did: 'said Nonna gave it away years ago, to somebody at the church, who is dead',
      },
      {
        archetype: 'muscle',
        label: 'GO TO THE RESTAURANT',
        blurb: 'Skip the kitchen entirely and go at the chain. Whoever sold it has been taking money monthly and they stop taking it tonight, and most of what they took comes back. If nobody sold it, you have started something with a company that has lawyers.',
        did: 'went at the restaurant chain directly, with two other men and no appointment',
      },
    ],
    closers: {
      murky: 'The utility bill is behind a lock now. A dead woman has been quietly blamed for a thing she did not do, and the family has decided it prefers that to the alternative.',
    },
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
    did: {
      stand: 'said nothing in the car, about anything, for the whole meeting',
      fold: 'told the man in the car who counts it first',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'MAKE UP THE DIFFERENCE',
        blurb: 'Put your own money in until the envelope is right and say nothing to anybody about why. It costs you more than the envelope was ever short and it makes the problem disappear.',
        did: 'quietly made the envelope right out of pocket, again',
      },
      {
        archetype: 'half',
        label: 'SAY IT LEAVES THE LAUNDROMAT LIGHT',
        blurb: 'Blame the collection, not the carry. It is vague enough to protect both of you and specific enough to get two people at the laundromat a very bad week.',
        did: 'put it on the laundromat, and on two people who work there',
      },
    ],
    closers: {
      murky: 'The envelope was correct this month. Two people at a laundromat were let go. Neither of the men in that car has ever raised it again.',
    },
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
    did: {
      stand: 'said sports equipment, for nine hours, to four different officers',
      fold: 'identified the handwriting on the label',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'ABANDON THE LOAD',
        blurb: 'Disclaim the tarp entirely. It is not yours, you have never seen it, you are a foot passenger. You lose {item} and the whole run, and there is nothing on any form with your name on it.',
        did: 'disclaimed the tarp, the load and any knowledge of the vehicle',
      },
      {
        archetype: 'gamble',
        label: 'CLAIM IT AND DEMAND A WARRANT',
        blurb: 'Own the tarp loudly and insist they cannot open it without paper. If the paper is not in order, everything inside it is inadmissible forever. If it is, you have just signed for the contents.',
        did: 'claimed the tarp and demanded to see a warrant, at volume',
      },
    ],
    closers: {
      murky: 'Customs has a disclaimed tarp, a demand for paperwork and a dog that is still extremely interested. The 6:10 has been taken off the schedule.',
    },
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
    did: {
      stand: 'said nothing about any garage, chain or driveway',
      fold: 'explained all six hours, in order, with some pride',
    },
    extra: [
      {
        archetype: 'half',
        label: 'GIVE UP THE GARAGE',
        blurb: 'Hand over the garage and say you rented it to somebody whose name you never got. It costs you the machine and it leaves the chain, the driveway and the other name entirely unexplained.',
        did: 'gave up the garage and claimed to have rented it to a stranger',
      },
      {
        archetype: 'gamble',
        label: 'PUT IT BACK TONIGHT',
        blurb: 'Return it. Drive it back, leave it on the forecourt, and let the whole thing become a story about a machine that went away and came back. It works completely if nobody says otherwise, and it is a second offence if anybody does.',
        did: 'drove the machine back and left it on the forecourt at four in the morning',
      },
    ],
    closers: {
      murky: 'There is a garage rented to a man who does not exist and an ATM that spent four days somewhere else and came home. The detective has retired. It still says welcome.',
    },
    outcomes: {
      bothStand: 'A garage, a chain and a groove in a driveway, and not one word from either of them. The machine is still in there. It still says welcome. Neither of them can go near it for at least a year, which they have accepted, together.',
      bothFold: 'Both explained the six hours, in detail, with pride creeping in around the third hour. The detective now understands the whole operation and thinks less of both of them for it.',
      betray: '{traitor} explained the six hours. {victim} is in the aerial photograph, a small bright shape by the driveway, at 4 a.m., holding the end of a chain that {traitor} had asked him to hold.',
    },
  },
  {
    id: 'priest',
    title: 'Saturdays, {time}',
    setup: [
      'Father Dominic hears confession on Saturdays. Since April, Father Dominic’s confessional has also contained a device that is not part of the sacrament, installed by people who did not ask Father Dominic.',
      '{A} confessed. {B} drove {A} there and waited outside with the engine running, which is, canonically and legally, its own kind of confession.',
    ],
    pressure: 'A federal prosecutor has eleven minutes of audio and a problem: the tape is inadmissible unless somebody in it agrees that it happened.',
    stand: { label: 'THAT IS BETWEEN ME AND GOD', blurb: 'The tape is nothing without a witness. Let it stay nothing — as long as {them} lets it.' },
    fold: { label: 'CONFIRM THE TAPE', blurb: 'Agree that the eleven minutes happened. The tape becomes real and the problem becomes {them}’s.' },
    did: {
      stand: 'said that it is between him and God, and nothing further',
      fold: 'confirmed the eleven minutes on the tape',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'OBJECT TO THE TAPE',
        blurb: 'Say nothing about the contents and everything about the device. Priest-penitent, unlawfully obtained, the lot. You do not deny a word of it; you simply make it unusable, which is not the same as being innocent and everybody in the room knows it.',
        did: 'attacked the device rather than the contents, and never denied a word of it',
      },
      {
        archetype: 'half',
        label: 'CONFIRM THE DRIVE, NOT THE WORDS',
        blurb: 'Agree you were at the church. Agree there was a car. Refuse everything after that. It is true, it is useless on its own, and it puts one of you inside the building.',
        did: 'agreed there was a church and a car and refused every word after that',
      },
    ],
    closers: {
      murky: 'Eleven minutes of audio, one procedural objection and a man who admits only to driving. Father Dominic has had the device removed and has said a rosary for the technician.',
    },
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
    did: {
      stand: 'said that machines pay out, because machines pay out',
      fold: 'produced the list of thirty-one names',
    },
    extra: [
      {
        archetype: 'half',
        label: 'GIVE THEM THE BOARD',
        blurb: 'Hand over the hardware and keep the list. They get the machine, the modification and no people at all. Thirty-one names stay off a desk and one of you is now a man who handed over evidence.',
        did: 'handed over the board and kept all thirty-one names',
      },
      {
        archetype: 'muscle',
        label: 'GO AT THE BROTHER-IN-LAW',
        blurb: 'Start with the man who has been winning all year and telling everybody. Whoever has been taking from that machine and keeping quiet gives most of it back. If nobody has, you have leaned on a relative of {cop} for no reason at all.',
        did: 'went at the brother-in-law who has been winning all year and telling everybody',
      },
    ],
    closers: {
      murky: 'Gaming enforcement has a board with no list, and one very frightened man who has stopped playing the machine and cannot explain why.',
    },
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
    did: {
      stand: 'swore he saw the old man sign it, and described the light in the kitchen',
      fold: 'said the room was empty',
    },
    extra: [
      {
        archetype: 'half',
        label: 'SAY YOU CANNOT REMEMBER',
        blurb: 'Not a lie and not the truth. It was a Sunday, there was wine, you signed a lot of things. It does not perjure you and it does not save the will either.',
        did: 'could not, on reflection, remember the afternoon clearly at all',
      },
      {
        archetype: 'gamble',
        label: 'PRODUCE A SECOND WITNESS',
        blurb: 'There was a notary in that kitchen for an unrelated reason. Put her on the stand. If she remembers it the way you need, the will is unbreakable; if she remembers the Sunday honestly, she has just described a forgery to a judge.',
        did: 'put the notary on the stand and let her describe the Sunday',
      },
    ],
    closers: {
      murky: 'Probate has one witness who cannot remember, one who can, and a handwriting report that calls it loving. The cousin in Phoenix has hired somebody.',
    },
    outcomes: {
      bothStand: 'Two witnesses, one version, no cracks. The will stands. The house goes where everybody knew it was always going to go, and the examiner’s report becomes a family joke rather than a family catastrophe.',
      bothFold: 'Both admitted the room was empty. The estate now belongs to a cousin in Phoenix who has never been to the house and is talking about selling.',
      betray: '{traitor} said the room was empty. {victim} had already testified, in detail, about the light in that kitchen and the way the old man’s hand shook — a description {victim} had rehearsed with {traitor} in the parking lot.',
    },
  },
  {
    id: 'barber',
    title: 'The Chair By The Window',
    setup: [
      'The shop has two chairs and takes maybe nine customers a week, which has never once come up at a tax office.',
      'On Thursday a man sat in the chair by the window for forty minutes and talked. {A} cut his hair. {B} swept up behind him and heard every word, including the man’s name, which everybody in this business knows and nobody says.',
    ],
    pressure: 'A federal witness was in a chair in your shop for forty minutes and somebody has to explain what was discussed. The transcript will be made either way. The only question is whose voice is on it.',
    stand: { label: 'JUST A HAIRCUT', blurb: 'A man came in, a man sat down, a man left. That is a haircut. It stays a haircut if {them} says so too.' },
    fold: { label: 'REPEAT THE CONVERSATION', blurb: 'You heard it all. So did {them}. Being second to repeat it is worth nothing at all.' },
    did: {
      stand: 'described, under oath and in detail, a haircut',
      fold: 'repeated the whole conversation, with the pauses',
    },
    extra: [
      {
        archetype: 'half',
        label: 'CONFIRM HE WAS THERE',
        blurb: 'Agree the man sat in the chair. Refuse everything that was said in it. It puts a federal witness in your shop on a date, which is exactly what they needed and nothing they can use on its own.',
        did: 'confirmed the man was in the chair and refused every word spoken in it',
      },
      {
        archetype: 'shield',
        label: 'SHUT THE SHOP',
        blurb: 'Close, sell the chairs, and be a man who used to have a business. There is no shop to subpoena, no appointment book, and no living to go back to.',
        did: 'shut the shop, sold both chairs, and stopped being a barber',
      },
    ],
    closers: {
      murky: 'The shop is closed. A federal witness is on record as having had his hair cut somewhere on a Thursday, which is true and has never once been useful to anybody.',
    },
    outcomes: {
      bothStand: 'Two men described, in exhaustive detail and under oath, a haircut. Length off the top, a little around the ears. The witness has been moved to another state and nobody here knows why.',
      bothFold: 'Both repeated the conversation. The two transcripts differ on four words, all of them adjectives, and a prosecutor has spent a week on those four words for no reason at all.',
      betray: '{traitor} repeated it, word for word, with the pauses. {victim} had spent the morning insisting that the shop was too loud to hear anything from the back. The shop has one radio and it was off.',
    },
  },
  {
    id: 'tunnel',
    title: 'Forty-One Feet',
    setup: [
      'The tunnel runs from the back of a laundromat toward the building next door. It is forty-one feet long, beautifully shored, and stops eleven feet short of anything worth reaching.',
      '{A} did the math. {B} did the digging. The math was wrong in a way that took four months and a rented excavator to discover.',
    ],
    pressure: 'A city inspector found a hole. The hole is not a crime by itself. The direction of the hole is very much a crime, and the direction is written on a plan in somebody’s handwriting.',
    stand: { label: 'IT’S DRAINAGE', blurb: 'It is a drainage project. It has permits somewhere. Say it flat and let {them} say it flat.' },
    fold: { label: 'HAND OVER THE PLAN', blurb: 'The plan has one set of handwriting on it and it is not going to be read as a group project.' },
    did: {
      stand: 'called it drainage, flatly, twice',
      fold: 'handed over the plan with the handwriting on it',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'SAY YOU DUG IT ALONE',
        blurb: 'Forty-one feet, four months, one man. It is barely plausible and it takes everybody else out of the file, and the city will want its four hundred dollars from you personally.',
        did: 'claimed forty-one feet of tunnel as a one-man project',
      },
      {
        archetype: 'half',
        label: 'BLAME THE PREVIOUS OWNER',
        blurb: 'Say the hole was there when you took the lease. The records are a mess and it might hold, and it drags a retired man in Florida into a conversation with the city.',
        did: 'said the hole predated the lease, which dragged a retired man into it',
      },
    ],
    closers: {
      murky: 'The city filled it with concrete and billed somebody. A retired man in Florida has received a letter he does not understand and has hired a lawyer he cannot afford.',
    },
    outcomes: {
      bothStand: 'Both called it drainage. The city filled it with concrete and fined the laundromat four hundred dollars. Forty-one feet, four months, four hundred dollars. They still laugh about the excavator.',
      bothFold: 'Both produced the plan. The two copies are identical, which proves collaboration more thoroughly than either confession does. The prosecutor thanked them for their thoroughness.',
      betray: '{traitor} handed over the plan. {victim} dug every foot of it, personally, in a crawlspace, while {traitor} sat upstairs with the measurements that were wrong.',
    },
  },
  {
    id: 'coma',
    title: 'Room 414',
    setup: [
      'Petey has been asleep since August. The doctors use the word "unresponsive" and then look at the floor.',
      'If Petey wakes up he will have a great deal to say, some of it about {A}, most of it about {B}, and all of it accurate.',
      'A detective has been visiting room 414 every Tuesday. He brings flowers. He is not a relative.',
    ],
    pressure: '"Here’s what happens," the detective says. "He wakes up and tells me everything, and whoever came to me first gets to be a witness instead of a defendant. Or he doesn’t wake up, and I still have two people who knew he might."',
    stand: { label: 'WAIT FOR PETEY', blurb: 'Say nothing and let a sleeping man decide your year. {them} has to have the same nerve.' },
    fold: { label: 'GET AHEAD OF HIM', blurb: 'Whatever Petey says, say it first and say it your way.' },
    did: {
      stand: 'waited for Petey, and read him the paper twice a week',
      fold: 'got ahead of Petey and told it first',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'STOP VISITING',
        blurb: 'Go nowhere near room 414 again. No flowers, no Tuesdays, nothing on any visitor log after this week. It protects you completely and it means a sleeping man has one fewer person in the room.',
        did: 'stopped going to room 414 entirely, and came off the visitor log',
      },
      {
        archetype: 'gamble',
        label: 'MOVE HIM',
        blurb: 'Have Petey transferred to a facility three states away under his mother’s maiden name. If it works, the detective loses him and his flowers. If anybody talks, it is kidnapping with extra steps.',
        did: 'had Petey moved three states away under his mother’s maiden name',
      },
    ],
    closers: {
      murky: 'Petey woke up in November and asked for a sandwich. He has been told almost none of this and has noticed that the visits stopped.',
    },
    outcomes: {
      bothStand: 'Neither moved. Petey woke up in November, remembered almost nothing, and asked for a sandwich. The detective stopped bringing flowers. Nobody has told Petey any of this.',
      bothFold: 'Both got ahead of him. Both got ahead of him in different directions. When Petey did wake up he was the third and least interesting version of the story.',
      betray: '{traitor} got ahead of him. {victim} sat in room 414 twice a week for three months, reading the paper out loud to a sleeping man, and did not once consider doing what {traitor} did in an afternoon.',
    },
  },
  {
    id: 'fire',
    title: 'The Wrong Building',
    setup: [
      'The building was supposed to be empty, insured, and on the corner. It was two of those things.',
      '{A} picked the address off a list. {B} did not check the address against the list, because {B} has never checked anything against anything, and everybody involved knew that about {B} in advance.',
    ],
    pressure: 'An arson investigator has a very good idea of what happened and a very poor idea of who. He has said, twice, that he only needs one of you to be tired.',
    stand: { label: 'WE WERE NOWHERE', blurb: 'Two men, one story, no address. It holds exactly as long as {them} holds.' },
    fold: { label: 'IT WAS HIS LIST', blurb: 'Somebody wrote the address down. Make sure the investigator knows whose pen.' },
    did: {
      stand: 'said they were nowhere, and stuck to it',
      fold: 'produced the list with the address on it',
    },
    extra: [
      {
        archetype: 'half',
        label: 'ADMIT THE JOB, NOT THE ADDRESS',
        blurb: 'Say there was a job and it was called off. It explains the preparation, the petrol and the car, and it does not explain the corner, which is the only part that matters.',
        did: 'admitted there was a job and swore it was called off before anybody moved',
      },
      {
        archetype: 'muscle',
        label: 'GO BACK AT THE BROKER',
        blurb: 'The policy was written by somebody who knew exactly what it was for. Lean on him. Whoever has been quietly sitting on their part of this gives most of it back, and if nobody has, you have threatened an insurance broker for nothing.',
        did: 'went back at the broker who wrote the policy and knew what it was for',
      },
    ],
    closers: {
      murky: 'The claim was denied, the corner is still empty, and an insurance broker has moved to a different state and changed the spelling of his name.',
    },
    outcomes: {
      bothStand: 'Neither was anywhere. The claim was denied, the investigation stalled, and the corner sat empty for two years. They have never discussed which of them got the address wrong, and by now it would be rude.',
      bothFold: 'Each gave up the other’s part. Between them they described the entire operation, including the list, the pen, and the fact that neither of them checked. The investigator called it "the most complete file of my career."',
      betray: '{traitor} produced the list. {victim} was the one who said, at the time, out loud, in the car, that they should double-check the address, and was told not to worry about it.',
    },
  },
  {
    id: 'transfer',
    title: 'Eight Digits',
    setup: [
      '{amount} left an account on a Friday and arrived somewhere it had absolutely no business being, because eight digits were typed by a person and eight digits are a lot of digits.',
      '{A} read the number out. {B} typed the number in. Both of them have spent two weeks explaining this to people who do not find it as funny as the story deserves.',
    ],
    pressure: 'The bank has flagged it. The family has noticed. A very calm woman from compliance would like a conversation and has offered to have it separately.',
    stand: { label: 'IT WAS A TRANSFER', blurb: 'Money moved. Money moves. Nobody has to say whose voice and whose fingers unless {them} says it first.' },
    fold: { label: 'HE READ IT OUT', blurb: 'One of you spoke and one of you typed. Decide which of those sounds more innocent, quickly.' },
    did: {
      stand: 'described a routine transfer, with the confidence of a rehearsed man',
      fold: 'explained who read the digits out and who typed them',
    },
    extra: [
      {
        archetype: 'half',
        label: 'BLAME THE BANK',
        blurb: 'Say the account details were transposed at their end. It is the kind of thing that happens, it is unprovable either way, and it makes an enemy of a very calm woman from compliance.',
        did: 'put eight digits on the bank, to a woman from compliance who did not blink',
      },
      {
        archetype: 'gamble',
        label: 'GO AND GET IT BACK',
        blurb: 'Find whoever received {amount} on a Friday and ask them for it. If they hand it over the whole problem evaporates. If they have spent it, you have introduced yourself to a stranger as the man that money belonged to.',
        did: 'went and found whoever received the money, and asked for it back',
      },
    ],
    closers: {
      murky: 'Compliance has closed the file with a note in it. Somebody in another state has had an extremely strange conversation on their doorstep and has kept most of the money.',
    },
    outcomes: {
      bothStand: 'Both described a routine transfer with the confidence of men who had rehearsed it in a car. Compliance closed the file. The money is still wherever it went and neither of them has raised it since.',
      bothFold: 'Each blamed the other’s half of the process. Compliance now has a complete reconstruction of a two-man error performed by two men who will not be allowed near a keypad again.',
      betray: '{traitor} explained who read the digits out. {victim} had, in fact, read them out correctly, twice, and has the kind of face that nobody believes about numbers.',
    },
  },
  {
    id: 'pigeon',
    title: 'The Bird',
    setup: [
      'Racing pigeons are legal, cheap, and completely uninteresting to law enforcement, which is the entire reason anybody in this business owns one.',
      'The bird went from {place} to a roof in under two hours with something on its leg that was not a race ring. It did this eleven times before somebody at the club noticed it never seemed to race.',
    ],
    pressure: 'The club keeps logs. The logs have two names on them: the man who released the bird and the man who received it. There is no third name to give.',
    stand: { label: 'IT’S A HOBBY', blurb: 'People love birds. It is a documented thing that people love birds. Hold that, and hope {them} loves birds too.' },
    fold: { label: 'EXPLAIN THE RING', blurb: 'Eleven flights, one explanation. Whoever gives it gets to be the hobbyist.' },
    did: {
      stand: 'talked about pigeon husbandry, accurately, for three hours',
      fold: 'explained the ring, the eleven flights and the roof',
    },
    extra: [
      {
        archetype: 'half',
        label: 'GIVE UP THE ROOF',
        blurb: 'Hand over the address the bird flew to and say nothing about the address it flew from. It is one end of eleven flights, and one end is not a route.',
        did: 'gave them the roof at one end and nothing at the other',
      },
      {
        archetype: 'shield',
        label: 'LET THE BIRD GO',
        blurb: 'Open the loft and lose the evidence. There is no ring, no bird and no logbook, and there is also no bird.',
        did: 'opened the loft and let the only witness fly away for good',
      },
    ],
    closers: {
      murky: 'The club has an address, a missing bird and a logbook with eleven gaps in it. Somebody still puts seed out on that roof every morning.',
    },
    outcomes: {
      bothStand: 'Two grown men were questioned for three hours about pigeon husbandry and answered every question correctly, because they had both, genuinely, become interested in pigeons. The bird was returned. It has a name now.',
      bothFold: 'Both explained the ring. The club has revoked two memberships and an assistant DA has learned more about pigeon racing than he ever intended.',
      betray: '{traitor} explained the ring. {victim} is the one who fed that bird every morning for a year and a half, and is the one who named it, and the name is in the transcript.',
    },
  },
  {
    id: 'deposition',
    title: 'Under Oath, Adjacent Rooms',
    setup: [
      'Two conference rooms on the same floor of the same building, with the same court reporter walking between them because the firm is cheap.',
      '{A} is in 12B. {B} is in 12D. The reporter has now typed the same question eleven times and is starting to enjoy herself.',
    ],
    pressure: 'Perjury is a separate charge from everything else on the table, which means the lie either works completely or costs extra.',
    stand: { label: 'SAME ANSWER AS ALWAYS', blurb: 'Give the answer you have both given for years. It is only perjury if somebody contradicts it, and only {them} can.' },
    fold: { label: 'TELL IT STRAIGHT', blurb: 'Answer honestly, once, and let the other transcript become the crime.' },
    did: {
      stand: 'gave the old answer, word for word, the good one',
      fold: 'told it straight, once, on the record',
    },
    extra: [
      {
        archetype: 'half',
        label: 'ANSWER A DIFFERENT QUESTION',
        blurb: 'Take the question apart and answer the part of it that is harmless, at length. It is not perjury and it is not cooperation and the transcript will run to nine pages of nothing.',
        did: 'answered a slightly different question, at length, for nine pages',
      },
      {
        archetype: 'shield',
        label: 'ASSERT THE PRIVILEGE',
        blurb: 'Refuse on the record, formally, for every question after the first. You are protected completely and you have also told everybody in that building exactly where to look.',
        did: 'asserted the privilege on every question after the first',
      },
    ],
    closers: {
      murky: 'The court reporter has typed two very different kinds of nothing in two rooms on the same floor and has started to enjoy her job again.',
    },
    outcomes: {
      bothStand: 'Two depositions, identical to the comma. The court reporter, who has been doing this for twenty-two years, made a small sound when she read them back. The case settled.',
      bothFold: 'Both told it straight, which would have been fine if either had known the other was going to. Two honest men have just built a case against themselves in adjacent rooms with a shared stenographer.',
      betray: '{traitor} told it straight in 12D. {victim} in 12B gave the old answer, the good one, the one they worked out together in a car in 2019, and gave it beautifully.',
    },
  },
  {
    id: 'godfather',
    title: 'The Same Kid',
    setup: [
      'You are both godfather to the same child. This was a compromise. It was a bad compromise and everybody said so at the time.',
      'There is a trust account for the kid. There was more in it in March than there is now, and two people have the signature card.',
    ],
    pressure: 'The kid’s mother has asked one question, once, quietly, at a kitchen table, and she is prepared to wait as long as it takes for an answer.',
    stand: { label: 'SAY NOTHING TO HER', blurb: 'Whatever happened to that money, it does not get said in front of her. Not by you. Hopefully not by {them}.' },
    fold: { label: 'TELL HER WHO', blurb: 'One name ends the kitchen table conversation tonight. It does not have to be yours.' },
    did: {
      stand: 'said nothing at that kitchen table',
      fold: 'gave her a name, at her table, about her son',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'PUT IT BACK YOURSELF',
        blurb: 'Make the account whole out of your own money, quietly, before she asks again. It costs you a great deal more than was taken and she never has to know which of you it was.',
        did: 'made the boy’s account whole out of pocket and never said so',
      },
      {
        archetype: 'half',
        label: 'BLAME THE BANK’S FEES',
        blurb: 'Show her a statement and point at the charges. It is nowhere near the whole difference but it is real, it is printed, and it gives a woman at a kitchen table something to be angry at that is not either of you.',
        did: 'showed her the bank charges and let her be angry at a bank',
      },
    ],
    closers: {
      murky: 'The account was whole by June. She has never raised it again, and has also never quite looked at either of them the same way, and both of them have noticed.',
    },
    outcomes: {
      bothStand: 'Neither said a word at that table. She looked at both of them for a long moment and then put the kettle on. The account was quietly made whole by June. Nobody has ever established by whom.',
      bothFold: 'They named each other in front of her, at her table, about her son. She listened to all of it and then asked them both to leave, and they both went, and neither has been invited back.',
      betray: '{traitor} gave her a name. {victim} is the one who had been putting money back in, in small amounts, all spring, which she found out about six months too late to matter.',
    },
  },
  {
    id: 'league',
    title: 'Thursday League Night',
    setup: [
      'Same lanes, same shoes, same six guys, every Thursday for nine years. Two of them are you.',
      'The bags are identical because the league bought them in bulk in 2016. Last Thursday two bags went home with the wrong people and one of them was not carrying bowling equipment.',
    ],
    pressure: 'The bag came back on Monday. It came back light. Nobody outside this conversation knows it went anywhere, and that will hold for exactly as long as two people decide it holds.',
    stand: { label: 'WRONG BAG, THAT’S ALL', blurb: 'An honest mix-up between old friends. It stays honest as long as {them} keeps it honest.' },
    fold: { label: 'SAY WHAT WAS IN IT', blurb: 'Describe the contents and the weekend. Whoever describes it first is the one who noticed.' },
    did: {
      stand: 'called it a mix-up and let league night carry on',
      fold: 'described the bag, the weekend and the contents',
    },
    extra: [
      {
        archetype: 'half',
        label: 'RETURN IT HEAVIER',
        blurb: 'Put back more than was taken and say nothing. The arithmetic no longer accuses anybody and everybody in that league now knows something happened.',
        did: 'put back more than was taken and said nothing about it',
      },
      {
        archetype: 'gamble',
        label: 'BLAME ONE OF THE OTHER FOUR',
        blurb: 'There were six men in that league and four of them are not in this conversation. Name one. If nobody contradicts it, it is over; if anybody does, you have accused a friend of nine years in front of the other three.',
        did: 'named one of the other four, who has bowled there for nine years',
      },
    ],
    closers: {
      murky: 'The league has one man who no longer comes and a bag that came back heavier than it left. Nobody has explained either thing and nobody ever will.',
    },
    outcomes: {
      bothStand: 'A mix-up. Bags got swapped, bags got returned, league night continued. They bowled the following Thursday and neither mentioned it, and the scores were terrible, and that was the only sign.',
      bothFold: 'Both described the bag. The league has been cancelled, which several of the other four men find to be a wildly disproportionate outcome and have said so.',
      betray: '{traitor} described the contents. {victim} took the bag home on Thursday without opening it, because in nine years {victim} has never once opened anything belonging to {traitor}.',
    },
  },
  {
    id: 'ceilingtile',
    title: 'The Fourth Tile From The Kitchen',
    setup: [
      'There is a thing above the ceiling tiles at the restaurant. It has been there since 2011. It is not a rumour; both of you have held it.',
      'The restaurant is being renovated. The contractor starts Monday. The contractor is honest, which is an unusual and inconvenient quality in a contractor.',
    ],
    pressure: 'If it is found by a stranger it belongs to whoever the paperwork says runs that kitchen. The paperwork says two names, because in 2011 that seemed like trust.',
    stand: { label: 'NEVER HEARD OF IT', blurb: 'Neither of you knows anything about any ceiling. Two names on paper, one story, if {them} holds.' },
    fold: { label: 'TELL THEM WHOSE', blurb: 'Somebody put it up there. Be the one who says the other name.' },
    did: {
      stand: 'knew nothing about any ceiling, convincingly',
      fold: 'told them who put it up there in 2011',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'GET IT DOWN TONIGHT',
        blurb: 'Ladder, tile, gone, before the contractor starts. You lose whatever it was worth and there is nothing above that kitchen but insulation.',
        did: 'went up the ladder that night and took it down before anybody started work',
      },
      {
        archetype: 'half',
        label: 'TELL THE CONTRACTOR NOT TO LOOK',
        blurb: 'Pay an honest man to be incurious for a fortnight. He will take it, because everybody takes it, and he will remember being asked.',
        did: 'paid an honest contractor to be incurious, which he will remember',
      },
    ],
    closers: {
      murky: 'The renovation finished on time. A contractor who has never taken money in his life has taken money, once, and has not slept properly since.',
    },
    outcomes: {
      bothStand: 'Neither knew anything about any ceiling. The contractor found it, called the police, and both men expressed identical, convincing surprise. It belongs to nobody now, which is the best outcome available.',
      bothFold: 'They named each other inside the same hour. The restaurant is closed, the paperwork is evidence, and a very honest contractor has been deposed twice.',
      betray: '{traitor} gave the name. It was {victim} who climbed the ladder in 2011, at {traitor}’s request, because {traitor} does not like heights and everyone was very understanding about it.',
    },
  },
  {
    id: 'twins',
    title: 'One Of The Bruno Brothers',
    setup: [
      'The Bruno brothers are identical, which they have leaned on for thirty years and which has worked for twenty-nine of them.',
      'A camera caught one of them doing something on a Tuesday. {A} knows which brother it was because {A} was there. {B} knows too, and {B} owes one of the Brunos money.',
    ],
    pressure: 'The prosecutor has a photograph of a face that belongs, legally, to two people. He needs one person to say a first name.',
    stand: { label: 'COULDN’T TELL YOU', blurb: 'They look the same. They have always looked the same. Nobody can make you pick unless {them} picks first.' },
    fold: { label: 'SAY THE FIRST NAME', blurb: 'You know exactly which one. So does {them}. Only one of you gets paid for knowing.' },
    did: {
      stand: 'could not tell the brothers apart, and never will',
      fold: 'said the first name',
    },
    extra: [
      {
        archetype: 'half',
        label: 'SAY IT WAS A BRUNO',
        blurb: 'Give them the surname and refuse the first name. It is a family, not a person, and it is the single most annoying thing you can hand a prosecutor.',
        did: 'gave them the surname and flatly refused the first name',
      },
      {
        archetype: 'gamble',
        label: 'SWEAR IT WAS NEITHER',
        blurb: 'Say both brothers were with you that Tuesday. If it holds, the photograph is of a stranger. If the phone records say otherwise, you are a man who alibied two people at once.',
        did: 'swore both brothers were elsewhere, with him, on the Tuesday',
      },
    ],
    closers: {
      murky: 'The prosecutor has a surname, a photograph and two men who are legally interchangeable. The Brunos have sent food again and are, if anything, worse about it.',
    },
    outcomes: {
      bothStand: 'Neither could tell them apart. The photograph is of a man who is legally two men. The Brunos sent over a tray of food, which everybody understood, and nobody wrote down.',
      bothFold: 'Both said a first name. Both said a different first name. The Brunos have been cleared entirely and are, at time of writing, insufferable about it.',
      betray: '{traitor} said the name. {victim} held out, on principle, for a family {victim} is not even related to, while {traitor} settled a debt with a single syllable.',
    },
  },
  {
    id: 'dentist',
    title: 'The Records',
    setup: [
      'Dr. Pavlecic keeps thirty years of dental records in a basement that floods, which has always been treated as a feature.',
      'Somebody went into that basement in the spring and took one folder. {A} has the key. {B} has the reason.',
    ],
    pressure: 'A missing folder is a story about a missing person, and everybody in the room already knows which missing person. The doctor is elderly, frightened, and has been asked to identify who had access.',
    stand: { label: 'I NEVER WENT DOWN THERE', blurb: 'One key, two people who could have used it. Say nothing about {them} and it stays two.' },
    fold: { label: 'HE HAD A REASON', blurb: 'A key is nothing without a motive. Hand them the motive.' },
    did: {
      stand: 'never went down to that basement, and said so',
      fold: 'supplied the reason somebody would want the folder',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'GIVE BACK THE FOLDER',
        blurb: 'Post it to the surgery, unmarked, and let an elderly man find his own records on the mat. Nothing is missing, so nothing was taken, and the question simply stops.',
        did: 'posted the folder back to the surgery, unmarked',
      },
      {
        archetype: 'half',
        label: 'BLAME THE FLOOD',
        blurb: 'The basement floods. It has always flooded. Say the folder is pulp somewhere under the stairs and let them go and look.',
        did: 'said the folder was pulp under the stairs, and let them go and look',
      },
    ],
    closers: {
      murky: 'A folder came back through the door on a Tuesday. Dr Pavlecic, who is ninety, has told several people it was a miracle and has been gently corrected by nobody.',
    },
    outcomes: {
      bothStand: 'Neither went down there. The basement flooded again in October, thoroughly, and the question became academic in a way that several people found convenient and one elderly dentist found miraculous.',
      bothFold: 'Key and motive, delivered separately, arriving together. A file that had been a rumour for twenty years became a case in about ninety minutes.',
      betray: '{traitor} supplied the motive. {victim} still has the key, and still visits the doctor, who is ninety and asks after {traitor} every time.',
    },
  },
  {
    id: 'union',
    title: 'Local 119',
    setup: [
      'The vote was 412 to 388 in a local with 611 members, which is the kind of arithmetic that only survives if nobody does it.',
      '{A} counted. {B} certified. Somebody has now done the arithmetic in a federal building.',
    ],
    pressure: 'Labour racketeering carries real time. The Department has offered the same arrangement to both counters, in the same words, an hour apart.',
    stand: { label: 'THE COUNT WAS THE COUNT', blurb: 'Numbers are numbers. Two signatures, one result, as long as {them} keeps signing it.' },
    fold: { label: 'GIVE UP THE COUNT', blurb: 'Somebody has to explain 611. Better that it comes with your name on the cooperative side.' },
    did: {
      stand: 'swore the count was the count',
      fold: 'explained 611 to the Department',
    },
    extra: [
      {
        archetype: 'half',
        label: 'CALL FOR A RECOUNT',
        blurb: 'Ask for the ballots to be counted again, publicly, by somebody neutral. You will lose the presidency and you will not lose your liberty, and six hundred people get an honest result out of it.',
        did: 'called for a public recount and lost the local doing it',
      },
      {
        archetype: 'muscle',
        label: 'GO AT WHOEVER FILED',
        blurb: 'Somebody in that local went to the Department. Find them. Whoever has been quietly talking stops, and gives back what the talking was worth. If nobody has, you have leaned on a working man over arithmetic.',
        did: 'went looking for whoever filed, among six hundred working men',
      },
    ],
    closers: {
      murky: 'There was a recount. The local has a president nobody chose and a federal monitor in the back of every meeting, and 611 members who have all done the arithmetic themselves by now.',
    },
    outcomes: {
      bothStand: 'The count was the count. The Department has an arithmetic problem and no witness, and the local has a president. He bought them both dinner and did not say why, and they did not ask.',
      bothFold: 'Both explained 611. The election was voided, the local is in receivership, and 611 working people have a federal monitor because two men wanted the same deal.',
      betray: '{traitor} explained the count. {victim} was the one who argued, at the time, that 412 was too greedy and they should take it by nine votes like reasonable people.',
    },
  },
  {
    id: 'blackout',
    title: 'The Night The Power Went Out',
    setup: [
      'Eleven blocks went dark at 9:52 and came back at 1:30. A great many things happened in that window and the cameras recorded none of them.',
      '{A} and {B} were together for all of it. That is either an alibi or a conspiracy, depending entirely on how it gets described.',
    ],
    pressure: 'Everybody who was out that night is being asked the same thing: who were you with. A shared answer protects you both. A different answer destroys you both.',
    stand: { label: 'TOGETHER, ALL NIGHT', blurb: 'The truth, as it happens. It only works as an alibi if {them} tells it too.' },
    fold: { label: 'I WAS ALONE', blurb: 'Cut yourself loose from the only person who can place you anywhere.' },
    did: {
      stand: 'said together, all night, and meant it',
      fold: 'said alone',
    },
    extra: [
      {
        archetype: 'half',
        label: 'SAY PART OF THE NIGHT',
        blurb: 'Together until midnight, apart after. It is true, it covers the hours that are easy and it leaves the hours that matter completely open, for both of you.',
        did: 'said together until midnight and apart after, which left the useful hours open',
      },
      {
        archetype: 'gamble',
        label: 'PRODUCE A THIRD MAN',
        blurb: 'Name somebody else who was there. If he backs it, the alibi is unbreakable and has a witness. If he has never heard of that night, you have just introduced a stranger to a detective.',
        did: 'named a third man, who had never heard of any of it',
      },
    ],
    closers: {
      murky: 'The eleven blocks came back on at 1:30. The account now covers the first two hours beautifully and the last two not at all, which everybody involved understands perfectly.',
    },
    outcomes: {
      bothStand: 'Together, all night, both of them, in the same words. Three hours and thirty-eight minutes accounted for by two people who genuinely were together, which is the rarest thing in this entire business.',
      bothFold: 'Both said they were alone. Two men who were demonstrably, provably together have both denied it, which a detective described as "the single most incriminating thing I have seen this year."',
      betray: '{traitor} said alone. {victim} said together, and gave the detail about the radio, and the part about the car, and all of it was true and none of it was corroborated.',
    },
  },
  {
    id: 'letter',
    title: 'In The Event Of My Death',
    setup: [
      'Everybody in this business writes one eventually. A letter, a name on the envelope, a lawyer who does not read it.',
      '{A} wrote one. {B} is named in it. {B} knows this because {A} mentioned it once, drunk, at a wedding, in a tone that was either affection or a warning.',
      'The lawyer died last month. The office is being cleared out by people who do read things.',
    ],
    pressure: 'Whatever is in that envelope becomes public in about nine days. Whoever speaks to it first controls what it means.',
    stand: { label: 'LET IT COME OUT', blurb: 'Say nothing and let the envelope say whatever it says. {them} has to sit on their hands too.' },
    fold: { label: 'GET THERE FIRST', blurb: 'Nine days. Frame the contents before anybody reads them.' },
    did: {
      stand: 'let the envelope come out on its own',
      fold: 'got there first and framed it',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'BUY THE FILE',
        blurb: 'The office is being cleared by people who are being paid hourly. Pay them more. The envelope is gone before anybody reads it, and so is the answer to what was in it.',
        did: 'paid the clerks clearing the office, and the envelope was never found',
      },
      {
        archetype: 'chance',
        label: 'ASK THE WIDOW',
        blurb: 'Go to the lawyer’s widow and simply ask. She may hand it over, she may have read it, she may have already given it to somebody. You are trusting a woman you have met twice at funerals.',
        did: 'went to the lawyer’s widow and asked her, straight out, for the envelope',
      },
    ],
    closers: {
      murky: 'The envelope never surfaced. Two men have each privately concluded that the other one has read it, and they are both wrong, and neither will ever raise it.',
    },
    outcomes: {
      bothStand: 'Neither moved. The envelope turned out to contain a life insurance policy, a note about a boat, and the sentence "tell him I meant it." Nobody has agreed on what the sentence refers to, and both of them privately believe they know.',
      bothFold: 'Both got there first, from opposite directions, about an envelope neither had read. The actual contents were nothing. The two pre-emptive explanations were quite a lot.',
      betray: '{traitor} got there first. The envelope, opened nine days later, said nothing about {traitor} at all. It was two pages about how much {victim} was trusted.',
    },
  },
  {
    id: 'sandwich',
    title: 'The Man Who Makes Your Lunch',
    setup: [
      'Sal has made your sandwiches every working day for six years. He knows both orders. He has never once got them wrong.',
      'Sal saw something in November through the window of his own shop while making, as it happens, both of your sandwiches.',
    ],
    pressure: 'Sal has been subpoenaed and Sal does not want to be a hero. He has said, to a room that included both of you, that he will say whatever he is told to say by the people he sees every day.',
    stand: { label: 'DON’T USE SAL', blurb: 'He is a man who makes sandwiches. Leave him out of it, and trust {them} to do the same.' },
    fold: { label: 'POINT HIM AT THEM', blurb: 'Sal will say what he is told. Be the one who tells him.' },
    did: {
      stand: 'left Sal out of it entirely',
      fold: 'got to Sal first and told him what to say',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'TAKE IT OFF SAL',
        blurb: 'Go to the DA yourself and give them enough that Sal stops being worth calling. He keeps his shop and his subpoena goes in a drawer, and you are now on a witness list.',
        did: 'gave the DA enough that Sal stopped being worth calling',
      },
      {
        archetype: 'half',
        label: 'TELL SAL TO SAY HE DIDN’T SEE',
        blurb: 'Not a story, just a shrug. He was at the slicer, he sees forty people a day. It is the smallest possible lie and it is still a lie you have put in a decent man’s mouth.',
        did: 'told Sal to say he was at the slicer and saw nothing',
      },
    ],
    closers: {
      murky: 'Sal said he was at the slicer, which was almost true. He still gets both orders right. He has stopped asking either of them how their week has been.',
    },
    outcomes: {
      bothStand: 'Neither went near him. Sal testified that he was looking at the meat slicer, which was true, and went back to work, and still gets both orders right, and still will not take money for the coffee.',
      bothFold: 'Both told Sal what to say. Sal, who is loyal to a fault and cannot hold two stories at once, said both of them, in sequence, under oath. The shop has closed.',
      betray: '{traitor} got to Sal first. {victim} is the one who told Sal, years ago, that if anybody ever asked him anything, he should just tell the truth and let {victim} handle it.',
    },
  },
  {
    id: 'golf',
    title: 'The Ninth Hole',
    setup: [
      'The meeting happened on a golf course because golf courses have no walls, no ceilings, and no reason for four men to be standing together except golf.',
      'None of the four can play. This was noted at the time by a groundskeeper, and then again, later, by somebody with a camera and a long lens.',
    ],
    pressure: 'A photograph of four men on a fairway is nothing. A photograph of four men on a fairway plus one person willing to say what was discussed is a conspiracy charge.',
    stand: { label: 'WE PLAYED NINE', blurb: 'It was golf. Badly, but it was golf. Both of you have to remember the same nine holes.' },
    fold: { label: 'SAY WHAT WAS SAID', blurb: 'You both know what was agreed on the ninth. Only the first to say it gets anything for it.' },
    did: {
      stand: 'described a round of golf in humiliating and consistent detail',
      fold: 'described what was agreed on the ninth',
    },
    extra: [
      {
        archetype: 'half',
        label: 'NAME THE OTHER TWO',
        blurb: 'You were four men on a fairway. Two of them are not at this table. Give them those two and keep the conversation. It buys a great deal and it is going to get back to them.',
        did: 'gave them the other two men on the fairway and kept the conversation',
      },
      {
        archetype: 'shield',
        label: 'PRODUCE THE SCORECARD',
        blurb: 'There is a card in the pro shop with four terrible scores on it. Produce it, say nothing else, and let a photograph of men standing in grass stay a photograph of men standing in grass.',
        did: 'produced a scorecard with four genuinely terrible scores on it',
      },
    ],
    closers: {
      murky: 'The photograph is still a photograph. Two men who were on that fairway have since been visited, and have worked out who was standing where when it happened.',
    },
    outcomes: {
      bothStand: 'Both described a round of golf in humiliating and consistent detail, including the score, which was terrible in a way that read as authentic. The photograph remains a photograph of four men standing in grass.',
      bothFold: 'Both described the conversation. The other two men on that fairway have since learned about this and have, in their own way, commented.',
      betray: '{traitor} described the ninth hole. {victim} spent that afternoon actually trying to learn golf, and has the receipts from the pro shop, and produced them, proudly, as evidence of an innocent day.',
    },
  },
  {
    id: 'auction',
    title: 'Unit 114 Went To Auction',
    setup: [
      'Nobody paid the rent on the unit because each of you assumed the other was paying the rent on the unit.',
      'It was auctioned on a Saturday morning, sight unseen, to a man named Dale who buys storage units as a hobby and posts what he finds online.',
    ],
    pressure: 'Dale has 41,000 subscribers. Dale has not opened the boxes yet. Dale has, however, opened a livestream.',
    stand: { label: 'SAY NOTHING, WATCH DALE', blurb: 'Nothing you say improves this. Sit with {them} and watch a stranger open your life.' },
    fold: { label: 'GO TO THE POLICE FIRST', blurb: 'If it is going to come out on a livestream, come out ahead of it, as a victim, and let {them} be the story.' },
    did: {
      stand: 'sat on his hands and watched a stranger open his life',
      fold: 'went to the police first, as a victim',
    },
    extra: [
      {
        archetype: 'chance',
        label: 'BUY IT BACK OFF DALE',
        blurb: 'Offer Dale four times what he paid, in cash, today. He may take it and never open box five, or he may film the offer, because that is a better video than the boxes.',
        did: 'offered Dale four times the money, in cash, on camera',
      },
      {
        archetype: 'half',
        label: 'GET THE FIFTH BOX',
        blurb: 'Do not buy the unit. Buy one box. Ask for the fifth one specifically, which tells a man with 41,000 subscribers exactly which box to open first.',
        did: 'asked Dale for the fifth box specifically, which told him which box mattered',
      },
    ],
    closers: {
      murky: 'Dale never opened the fifth box on camera. He has referred to it in three subsequent videos as “the one somebody wanted” and his subscriber count has doubled.',
    },
    outcomes: {
      bothStand: 'Both sat on their hands. Dale opened four boxes of Christmas decorations, declared the unit "a total bust," and moved on. The fifth box was never opened on camera. Nobody has ever explained why, and both of them privately suspect the other.',
      bothFold: 'Both went to the police first, separately, to report a theft from a unit neither of them could legally describe the contents of. Dale’s video has 2.1 million views and a comment section that solved it.',
      betray: '{traitor} went to the police. {victim} was still texting Dale offering to buy the unit back at four times the price, out of pocket, to protect them both.',
    },
  },
  {
    id: 'carwash',
    title: 'The Car Wash On Route 9',
    setup: [
      'It washes eleven cars on a good day and reports four hundred. Everybody understands what the car wash is for and nobody has ever needed it explained.',
      '{A} does the books. {B} does the deposits. For three months the books and the deposits have disagreed by an amount that is too small to be a mistake and too large to be a rounding error.',
    ],
    pressure: 'The family has sent an accountant. Not a real accountant — a family accountant, who has been doing this since before either of you and has never once been wrong about a number or gentle about it.',
    stand: { label: 'THE NUMBERS ARE THE NUMBERS', blurb: 'Hold the line on the books and let the accountant find whatever he finds. If {them} holds too, he finds nothing.' },
    fold: { label: 'FLAG THE GAP', blurb: 'Point at the discrepancy before he does, and point at the half of the process that is not yours.' },
    did: {
      stand: 'held the line on the books and let the accountant look',
      fold: 'flagged the gap and pointed at the other end of the process',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'CLOSE THE GAP OUT OF POCKET',
        blurb: 'Put the difference back before Friday, all three months of it, and let the books balance. It costs you considerably more than the gap and the accountant finds a business that works.',
        did: 'put three months of the difference back before the accountant arrived',
      },
      {
        archetype: 'half',
        label: 'BLAME THE WASH COUNT',
        blurb: 'Say the discrepancy is in the cars, not the cash — the counter has been broken since spring. It is true that the counter is broken. It is not true that this is why.',
        did: 'blamed a car counter that has genuinely been broken since spring',
      },
    ],
    closers: {
      murky: 'The accountant looked at a broken counter for a while, said “hm”, and left. The gap has not reappeared. Neither of them has ever established whose it was.',
    },
    outcomes: {
      bothStand: 'Both held. The accountant looked at three months of records for six hours, said "hm," and left. The gap closed the following month without discussion and has never reappeared.',
      bothFold: 'Both flagged it, each blaming the other end of the process. The accountant now has two men insisting there is a problem, which is more than he had when he arrived.',
      betray: '{traitor} flagged the gap. It was {traitor}’s gap. {victim} had noticed it in the first week and had been quietly covering it, monthly, for reasons {victim} has never been able to explain out loud.',
    },
  },
  {
    id: 'christening',
    title: 'The Envelopes At The Christening',
    setup: [
      'Four hundred guests, one baby, and a basket of envelopes that nobody counts in public because counting in public is what animals do.',
      '{A} carried the basket to the car. {B} carried it from the car to the house. Somewhere in eleven feet of driveway, the basket got lighter.',
    ],
    pressure: 'The baby’s father has not accused anybody. He has simply mentioned the number twice, at two different dinners, while looking at the middle distance.',
    stand: { label: 'BASKETS ARE BASKETS', blurb: 'Money goes missing at these things. It always has. Say nothing about {them} and let it stay a mystery.' },
    fold: { label: 'ELEVEN FEET', blurb: 'Only two people touched it. Make sure everybody understands which eleven feet were yours.' },
    did: {
      stand: 'said nothing about any driveway',
      fold: 'raised the eleven feet, at a christening, in front of a priest',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'MAKE UP THE NUMBER',
        blurb: 'Put the difference in an envelope and hand it to the father yourself, saying it was in a coat. He will not believe it and he will stop mentioning the number.',
        did: 'handed the father an envelope and said it had been in a coat',
      },
      {
        archetype: 'half',
        label: 'BLAME THE HOTEL STAFF',
        blurb: 'Four hundred guests and a function room means a dozen people nobody knew. It is plausible, it is unfalsifiable, and a banqueting manager is going to have a very hard fortnight.',
        did: 'put it on the function room staff, and on a banqueting manager',
      },
    ],
    closers: {
      murky: 'The number stopped being mentioned around Easter. A banqueting manager was let go in March for reasons that were never fully explained to him.',
    },
    outcomes: {
      bothStand: 'Neither said anything. The father stopped mentioning the number around Easter. The baby, now four, is close to both of them, and this is a story he will be told a comic version of when he turns thirty.',
      bothFold: 'Each accused the other over the eleven feet of driveway, at a christening, in front of a priest. The family has never fully recovered and the priest has told the story at two other parishes.',
      betray: '{traitor} raised the eleven feet. {victim} had already, quietly, made up the difference out of pocket, which is why the number the father keeps mentioning is smaller than it should be.',
    },
  },
];
