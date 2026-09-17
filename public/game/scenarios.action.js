// THE LOUD ONES.
//
// Same dilemma, no chairs. In an action job the choice is physical and it is
// happening right now: hold the door or take the stairs, stay on the brake or
// jump, go back for him or make the gap. Cooperating costs you your body
// instead of your freedom.
//
// These come up less often than the interview-room jobs, and more often as the
// night gets later. The engine gives them a shorter clock, because they should
// feel like one.

export const ACTION_PAIR = [
  {
    id: 'act_wall',
    tone: 'action',
    title: 'Two Hundred Feet Of Bedsheet',
    setup: [
      'The rope is knotted sheets and it holds one man at a time. That is not an opinion; you tested it in the laundry and it came apart at ninety pounds over.',
      'You are both at the top. Whoever goes down first is going down a rope that somebody else has to be braced against a vent housing to hold. Whoever does the holding goes second, on a rope with nobody on the anchor, which is a different and worse proposition.',
      'The searchlight comes back around in forty seconds. Whoever is still up here when it does is a silhouette.',
    ],
    pressure: 'Two men, one rope, one anchor, and forty seconds in which neither of you can see what the other one’s hands are doing.',
    stand: { label: 'TAKE THE ANCHOR', blurb: 'Brace the vent housing, hold the weight, and go second \u2014 if {them} remembers there is a second.' },
    fold: { label: 'TAKE THE ROPE', blurb: 'Get on it first and be over the wall before the light comes back. Somebody is holding the top. Probably.' },
    did: {
      stand: 'braced the vent housing and took the weight',
      fold: 'got on the rope first and went',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'CUT IT AND GO BACK IN',
        blurb: 'Drop the rope down the outside, walk back to the block and be in your bunk before the count. Nobody escapes, nobody is caught on a wall, and a laundry full of cut sheets is somebody else’s problem in the morning.',
        did: 'cut the rope loose, walked back to the block, and was in his bunk for the count',
      },
      {
        archetype: 'gamble',
        label: 'BOTH AT ONCE',
        blurb: 'It holds one man. It came apart at ninety pounds over in a laundry, with a bag. Go together anyway and be on the ground in twenty seconds instead of eighty.',
        did: 'went over the wall on the same rope at the same time, which it is not rated for',
      },
    ],
    closers: {
      murky: 'Nobody is on that wall now. There is a rope hanging down the outside of it that nobody climbed and a laundry that is going to be searched at eight.',
    },
    outcomes: {
      bothStand: 'Both of them went for the anchor, which meant nobody was on the rope, which meant a whispered argument at the top of a wall with a searchlight coming. They went over on the second sweep, together, and neither has ever admitted which of them moved first.',
      bothFold: 'Both went for the rope at the same moment. It came apart at ninety pounds over, exactly as the laundry predicted, about eleven feet down. They were both in the infirmary by morning and neither said a word about the other.',
      betray: '{traitor} took the rope. {victim} was braced against the vent housing when the light came round, holding an anchor with nothing on the end of it, in the exact spot they had agreed one of them would stand.',
    },
  },
  {
    id: 'act_freight',
    tone: 'action',
    title: 'Car Eleven Has No Brakes',
    setup: [
      'The brakeman is unconscious in the second car and the grade out of {place} is four miles of downhill with a curve at the bottom of it.',
      'The handbrake wheel is on the roof of car eleven. It takes two men: one on the wheel and one flat on the walkway holding his legs, because the wheel needs a man leaning out over nothing.',
      'It takes both of you, and the ladder down to the ballast is nine feet behind whoever decides he has had enough of this. Either of you can be on it in four seconds.',
    ],
    pressure: 'You can both ride it out on that roof, or one of you can be on the gravel in four seconds and only slightly broken.',
    stand: { label: 'STAY ON THE ROOF', blurb: 'Keep hold. Four miles, one curve, and {them} has to want the same thing you want.' },
    fold: { label: 'TAKE THE LADDER', blurb: 'Nine feet to the ladder and gravel after that. Gravel is survivable. The curve is a question.' },
    did: {
      stand: 'stayed on the roof and held on',
      fold: 'took the ladder down to the ballast',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'GET INTO THE CAB',
        blurb: 'Leave the wheel, get down into the cab and brace. You cannot slow it from in there and you will be inside something when it takes the curve, which is the whole of the plan.',
        did: 'climbed down into the cab and braced, which slows nothing and survives most things',
      },
      {
        archetype: 'gamble',
        label: 'UNCOUPLE ELEVEN',
        blurb: 'Pull the pin and let car eleven go on alone. If it works the rest of the train survives on the grade. If the timing is out you are standing on a car that is now the front of the train.',
        did: 'pulled the pin on car eleven and let it go down the grade alone',
      },
    ],
    closers: {
      murky: 'The train made the curve. Car eleven did not, or did, depending on who is telling it. Nobody was on the wheel at the bottom and everybody has a different account of why.',
    },
    outcomes: {
      bothStand: 'Neither moved. The wheel came round eleven turns, the train made the curve at a speed that two separate engineers later refused to put in writing, and both men lay on that roof afterwards laughing in a way that was not entirely laughing.',
      bothFold: 'Both went for the ladder, collided at it, and went off the side together into the ballast. The train made the curve on its own, which everybody agrees is the most annoying possible outcome.',
      betray: '{traitor} took the ladder. {victim} was leaning out over the coupling with both hands on a wheel and nobody on his ankles, and made the curve anyway, which is why {victim} is famous now in a small way.',
    },
  },
  {
    id: 'act_stairwell',
    tone: 'action',
    title: 'The Door Only Opens One Way',
    setup: [
      'Third floor, and the fire is in the stairwell below, which is the one direction anybody ever plans for.',
      'The roof door is a fire door: it opens outward and it locks behind you. Somebody has to hold it while the other one goes up, and holding it means standing in the stairwell with the smoke coming up the shaft.',
      'Either of you can be the one holding it and either of you can be the one going up, and neither of you thought about that for one single second before tonight.',
    ],
    pressure: 'One person can hold that door for about ninety seconds. Nobody has established what happens at second ninety-one and nobody wants to be the experiment.',
    stand: { label: 'HOLD THE DOOR', blurb: 'Take the smoke and hold it open for {them}, and count on the same coming back down.' },
    fold: { label: 'GO THROUGH IT', blurb: 'Go up, let it shut, and the fire door does exactly what fire doors are for.' },
    did: {
      stand: 'held the door open and ate the smoke',
      fold: 'went through it and let it shut',
    },
    extra: [
      {
        archetype: 'half',
        label: 'WEDGE IT',
        blurb: 'Jam the door with whatever is in the stairwell and go. It might hold and it might not, and the difference is that you were not standing there either way.',
        did: 'wedged the door with a fire bucket and went up, which might hold',
      },
      {
        archetype: 'gamble',
        label: 'GO DOWN THROUGH IT',
        blurb: 'Not the roof — the fire. Three floors through a stairwell that is burning at the bottom, fast, low, now. If it is only the ground floor you are in the street in ninety seconds.',
        did: 'went down through the smoke instead of up, on the theory it was only the ground floor',
      },
    ],
    closers: {
      murky: 'A fire bucket held a door open for about four minutes. Two men came off that roof at different times and by different routes and did not speak in the ambulance.',
    },
    outcomes: {
      bothStand: 'Neither would go first. They held that door open between them and went through it together, sideways, badly, coughing, and lay on a roof in {place} for twenty minutes without a word.',
      bothFold: 'Both went for the hatch at once, the door swung shut behind them, and they were on the roof of a burning building with no way down and an excellent view. The ladder company found them at four.',
      betray: '{traitor} went through and let it shut. {victim} was still holding it open with his shoulder, the way they had agreed in the car, for somebody who was already on the roof.',
    },
  },
  {
    id: 'act_boat',
    tone: 'action',
    title: 'The Pump Is Hand-Operated',
    setup: [
      'Eleven miles out, at night, and the hull opened up on something nobody saw.',
      'The bilge pump is a hand lever and it needs a man on it continuously to stay ahead of the water. The dinghy is on the stern davits and holds one person comfortably or two people in a way that nobody would describe as comfortable.',
      'Either of you can be on that pump and either of you can be at the davits, and it is dark enough at the stern that nobody can see which.',
    ],
    pressure: 'The pump keeps you both afloat until the coastguard, in maybe two hours. The dinghy solves one person’s evening immediately.',
    stand: { label: 'STAY ON THE PUMP', blurb: 'Keep pumping. Two hours, two men, one hull, and {them} has to still be on this boat at the end of it.' },
    fold: { label: 'TAKE THE DINGHY', blurb: 'The davits are right there and it is dark and nobody is watching what anybody does at the stern.' },
    did: {
      stand: 'stayed on the pump',
      fold: 'took the dinghy',
    },
    extra: [
      {
        archetype: 'half',
        label: 'PUMP AND UNTIE',
        blurb: 'Work the lever with one hand and get the davits ready with the other. You are slowing the water and you are also ready to go, and everybody on this boat can see you doing both.',
        did: 'pumped with one hand and got the davits ready with the other, visibly',
      },
      {
        archetype: 'shield',
        label: 'PUT OUT THE MAYDAY',
        blurb: 'Get on the radio, give a position, and stop doing anything else. The boat fills. Somebody comes for both of you eventually, and the load is at the bottom of eleven miles of water.',
        did: 'put out a mayday with a position, and stopped bailing',
      },
    ],
    closers: {
      murky: 'The coastguard has a position, a half-swamped hull and a dinghy that was found empty two miles further on. Nobody has satisfactorily explained the dinghy.',
    },
    outcomes: {
      bothStand: 'Both stayed. They took the pump in twenty-minute shifts for two hours and eleven minutes and the coastguard found a boat that was ninety percent water and two men arguing about whose turn it was.',
      bothFold: 'Both went for the dinghy. It holds one comfortably. They made shore at dawn, soaked, silent, and legally sharing a boat that neither of them will ever be able to look at again.',
      betray: '{traitor} took the dinghy. {victim} kept pumping, because from the pump you cannot see the stern, and did not find out until it got noticeably quieter.',
    },
  },
  {
    id: 'act_chase',
    tone: 'action',
    title: 'Three Cars And A Bridge',
    setup: [
      '{car} doing ninety on a road that was not built for sixty, with three sets of lights behind and a bridge coming up that has a weight limit posted in a font from 1974.',
      'There are two doors and one wheel. Whoever is not going out of a door is the one who still has the wheel, and neither of you has said which you are.',
      'There is a service turning before the bridge. A man who goes out of that door at the turning is a man in a ditch with a story. A man still in the car after the bridge is a man in the car.',
    ],
    pressure: 'The car holds them both or it holds neither. The door handle only helps one of you and everybody in this car knows which one.',
    stand: { label: 'BOTH STAY IN', blurb: 'Hands off the handle. Make the bridge together, or don’t — but do it with {them}.' },
    fold: { label: 'OUT AT THE TURNING', blurb: 'One clean roll into a ditch and the car goes over the bridge without you in it.' },
    did: {
      stand: 'kept his hands off the handle and took the bridge',
      fold: 'went out of a door at the service turning',
    },
    extra: [
      {
        archetype: 'gamble',
        label: 'TAKE THE TURNING AT SPEED',
        blurb: 'Do not stop and do not jump — take the service road at ninety with the lights behind. It loses them completely or it ends in a ditch with both of you in it.',
        did: 'took the service road at ninety with everybody still in the car',
      },
      {
        archetype: 'shield',
        label: 'STOP AND SHOW YOUR HANDS',
        blurb: 'Pull over before the bridge. Engine off, hands on the wheel, nothing in the car that anybody can prove. You are both arrested and neither of you is charged with anything that sticks.',
        did: 'pulled over before the bridge with his hands on the wheel',
      },
    ],
    closers: {
      murky: 'The bridge held, the ditch had one man in it, and the car was found on Tuesday with one door open and the keys still in it.',
    },
    outcomes: {
      bothStand: 'Nobody touched the handle. The bridge held, the lights did not follow, and they drove the next forty miles at a legal speed in total silence because there was nothing either of them could add.',
      bothFold: 'Both went out the same door at the turning, which is not how doors work, and ended up in the same ditch. The car went over the bridge by itself and is still, technically, missing.',
      betray: '{traitor} went out at the turning. {victim} took the bridge at ninety with the passenger door swinging and has since had it explained to him that this was always the plan.',
    },
  },
  {
    id: 'act_roof',
    tone: 'action',
    title: 'The Gap Is Nine Feet',
    setup: [
      'Nine feet to the next roof, six floors down if you are wrong about it, and a man with a radio coming up the stairs behind you both.',
      'There is a plank. It is heavy and it is awkward and it takes a man at each end to get it across without losing it into the alley, which is about a minute of work.',
      'Or either of you can take a run at nine feet and find out, alone, in front of the other one.',
    ],
    pressure: 'The radio is on the fourth floor. The plank is a minute and needs two people. The run-up is four seconds and needs nobody.',
    stand: { label: 'TAKE YOUR END', blurb: 'Pick up the plank. It only goes across if {them} picks up the other end at the same time.' },
    fold: { label: 'TAKE A RUN AT IT', blurb: 'Four seconds and you are across. The plank is a minute you might not have, and it is not your only option.' },
    did: {
      stand: 'picked up his end of the plank',
      fold: 'took a run at nine feet',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'GET LOW AND WAIT',
        blurb: 'Behind the housing, out of the light, and let the radio come up and go past. You get nothing out of tonight. Nothing gets you either.',
        did: 'got down behind the housing and let the radio come and go',
      },
      {
        archetype: 'martyr',
        label: 'HOLD THE STAIR DOOR',
        blurb: 'Forget the gap. Put your shoulder on the stairwell door and buy whoever is at the plank the minute they need. You are the one who is still on this roof when it opens.',
        did: 'put his shoulder on the stair door and bought somebody else the minute',
      },
    ],
    closers: {
      murky: 'The radio reached the roof and found a plank, a gap and one man behind a housing who had been there for eleven minutes and said he was a maintenance contractor.',
    },
    outcomes: {
      bothStand: 'The plank went across on two sets of hands and they both walked over it like men crossing a street. They were in a stairwell two blocks away when the radio reached the roof. Neither has ever described that minute out loud and both could do it second by second.',
      bothFold: 'Both took a run at it, one after the other, about a second apart. Both made it, barely, badly, and lay on the far roof afterwards having a conversation entirely composed of swearing.',
      betray: '{traitor} took a run at it and made it. {victim} was standing on the wrong roof holding one end of a plank that cannot be laid by one man, which is a fact {victim} established over the following forty seconds.',
    },
  },
  {
    id: 'act_fuse',
    tone: 'action',
    title: 'Ninety Seconds Of Cord',
    setup: [
      'The charge is under the wall of the vault and the cord was cut long on purpose, because long cord is a safe cord and everybody sleeps better.',
      'Then the door at the far end opened, and now ninety seconds of safety is ninety seconds of being in a basement with a lit fuse and company.',
      'Pinching it out takes both hands, kneeling, in the dark, next to a charge. The stairs take eleven seconds. Either of you can do either, and you cannot both do both.',
    ],
    pressure: 'Pinch it and you both walk out of a quiet basement with a job still to do. Leave it and it goes off with whoever is still down there.',
    stand: { label: 'PINCH THE CORD', blurb: 'Both hands, both knees, and trust that {them} is doing the same thing at the other end instead of taking the stairs.' },
    fold: { label: 'ELEVEN SECONDS', blurb: 'Up the stairs and out. The basement takes care of itself in a minute and a half.' },
    did: {
      stand: 'went to his knees and pinched the cord out',
      fold: 'took the stairs',
    },
    extra: [
      {
        archetype: 'gamble',
        label: 'LET IT RUN',
        blurb: 'Ninety seconds is enough to do the wall and be out if nothing goes wrong. Nothing has to go wrong. Stay, work, and leave with the whole thing.',
        did: 'let the cord run and kept working, on ninety seconds of nothing going wrong',
      },
      {
        archetype: 'half',
        label: 'CUT IT LONG',
        blurb: 'Snip the cord halfway and leave the rest. It stops the charge and it leaves a cut fuse, a full charge and a basement that anybody can walk into and understand completely.',
        did: 'cut the cord halfway and left a live charge in a basement for somebody to find',
      },
    ],
    closers: {
      murky: 'The charge did not go off. It was found on Thursday by a man doing the boiler, intact, with a cut fuse, which took nine people about four minutes to understand.',
    },
    outcomes: {
      bothStand: 'Both went to their knees and pinched it out in the dark. It took four seconds and cost the entire job, and afterwards they sat on a basement step and neither of them wanted to be the one to say it had been the right call.',
      bothFold: 'Both took the stairs. The charge went off in an empty basement at three in the morning and took out a wall, a boiler, and any possibility of ever using that entrance again.',
      betray: '{traitor} took the stairs. {victim} was on his knees in the dark with both hands on a cord, saying {traitor}’s name, at a volume that got louder toward the end.',
    },
  },
  {
    id: 'act_ice',
    tone: 'action',
    title: 'It Was Solid On The Way Out',
    setup: [
      'Four hundred yards across and it held fine at eleven at night going one way with an empty bag.',
      'Coming back it is warmer, the bags are not empty, and there is a sound underfoot that everybody who has ever been on ice recognises immediately and hopes is somebody else’s.',
      'You are sixty feet apart on the same sheet. Lying flat and crawling spreads a man out over eight feet of ice instead of two, which is the whole of the science, and it takes four minutes. A man running puts everything he weighs in one place at a time, and the crack goes where the weight goes.',
    ],
    pressure: 'One of you running is survivable for the runner. It is a different sentence entirely for whoever is still out there flat on his stomach when the crack arrives.',
    stand: { label: 'LIE FLAT AND CRAWL', blurb: 'Spread out, go slow, and keep the sheet in one piece for both of you \u2014 if {them} does the same.' },
    fold: { label: 'RUN FOR THE BANK', blurb: 'One minute to solid ground. The ice behind you stops being your problem the moment you are off it.' },
    did: {
      stand: 'went flat and crawled',
      fold: 'ran for the bank',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'GO BACK FOR THE BAG',
        blurb: 'Whatever is out there is worth the whole job. Crawl back for it over the part that is already cracking. It is four extra minutes on ice that is warmer every one of them.',
        did: 'crawled back over the cracking part for the bag, which took four extra minutes',
      },
      {
        archetype: 'shield',
        label: 'WALK THE LONG WAY ROUND',
        blurb: 'Off the ice entirely and round the shore. It is four miles in February and it is four miles of ground, and you will be walking it while everybody else finds out about the ice.',
        did: 'got off the ice and walked four miles of shore in February',
      },
    ],
    closers: {
      murky: 'One man walked four miles round the shore. One bag came back. Nobody has ever agreed on whether the sheet would have held, and both of them still think about it.',
    },
    outcomes: {
      bothStand: 'Both went flat and crawled, sixty feet apart, for four minutes, in February, saying nothing. The sheet held the whole way. They lost one bag between them and have never once mentioned the bag.',
      bothFold: 'Both ran. The crack went out from under both of them at about the same instant and they went through thirty feet apart. Two men walked four miles to a road in wet clothes, side by side, not speaking.',
      betray: '{traitor} ran for the bank. The crack followed him the way it always does and then turned, and {victim} was flat on his stomach in the middle of it doing everything correctly.',
    },
  },
  {
    id: 'act_alarm',
    tone: 'action',
    title: 'It Went Loud At The Second Door',
    setup: [
      'The alarm was supposed to be handled. The alarm was, in the event, not handled, and the whole building is now making a noise you can feel in your teeth.',
      'There is four more minutes of work at the safe and an estimated six before anybody arrives. That is a margin, technically.',
      'Either of you can be the one on the safe and either of you can be the one at the loading door, and the van is running either way, and the road out of {place} is clear either way.',
    ],
    pressure: 'Two minutes of margin is a margin for two people working. For one person leaving right now it is a very comfortable margin indeed.',
    stand: { label: 'FINISH THE JOB', blurb: 'Four more minutes with the alarm going. It only works if {them} is still holding the door at minute four.' },
    fold: { label: 'GO NOW, CLEAN', blurb: 'Nothing in your hands, nothing on you, out the door before the margin closes.' },
    did: {
      stand: 'stayed and finished the job with the siren going',
      fold: 'went out clean with nothing on him',
    },
    extra: [
      {
        archetype: 'gamble',
        label: 'KILL THE PANEL',
        blurb: 'Find the box and put it out. If it is the one panel, you have four quiet minutes and the whole take. If it has already called, you are a man standing at an alarm panel when they arrive.',
        did: 'went looking for the panel to kill it, on the chance it had not already called',
      },
      {
        archetype: 'half',
        label: 'TAKE WHAT IS OPEN',
        blurb: 'Do not finish the safe. Take whatever is already out, drop the rest, and be moving in forty seconds. It is a fraction of the job and it is a fraction you are holding.',
        did: 'took what was already out of the safe and left the rest',
      },
    ],
    closers: {
      murky: 'The alarm ran for eleven minutes. Part of the safe is still full, the panel has been replaced, and nobody in that building has worked out how anybody got out at all.',
    },
    outcomes: {
      bothStand: 'Both stayed. Four minutes with a siren going, one on the safe and one on the door, and they came out at five minutes forty with the whole thing. Neither has ever agreed to a job with an alarm on it since.',
      bothFold: 'Both left clean with nothing, separately, from opposite sides of the building, each assuming the other was still inside. They met at the car. It was not a warm conversation.',
      betray: '{traitor} went clean. {victim} looked up from the safe at minute three to find an empty loading bay and a door that closes automatically, which is a detail {victim} has since become an expert on.',
    },
  },
  {
    id: 'act_elevator',
    tone: 'action',
    title: 'Between Four And Five',
    setup: [
      'The service elevator stopped between floors with an authority that suggests it is not starting again.',
      'The hatch is in the ceiling and there is a rail either of you can get up on. One man at a time, and the second man cannot make it without an arm reaching back down through the hatch.',
      'From the shaft ladder it is two minutes to the fifth floor and a fire door onto a corridor. The building has people in it now who were not in it an hour ago.',
    ],
    pressure: 'Whoever goes up first can reach back down or can keep climbing, and from inside the elevator there is absolutely no way to tell which one is about to happen.',
    stand: { label: 'REACH BACK DOWN', blurb: 'Go up, brace on the ladder, and put an arm back through the hatch for {them}. It costs you the two minutes you would have had.' },
    fold: { label: 'KEEP CLIMBING', blurb: 'Through the hatch and up. Nobody in that shaft can see what you did or did not reach for.' },
    did: {
      stand: 'went up and put an arm back down through the hatch',
      fold: 'went through the hatch and kept climbing',
    },
    extra: [
      {
        archetype: 'shield',
        label: 'HIT THE ALARM',
        blurb: 'Press the button and sit down. Maintenance comes, the doors open, and two men are found in a service elevator with a very thin explanation and nothing else on them.',
        did: 'hit the alarm button and sat down to wait for maintenance',
      },
      {
        archetype: 'gamble',
        label: 'FORCE THE DOORS',
        blurb: 'Between four and five means half a doorway. Get fingers in and haul. It either opens onto a corridor or it opens onto a wall, and there is no third thing it opens onto.',
        did: 'forced the doors between four and five to see what was behind them',
      },
    ],
    closers: {
      murky: 'The doors were half open when maintenance arrived, which took some explaining, and the explanation offered was not the one anybody believed.',
    },
    outcomes: {
      bothStand: 'Each of them went up and immediately turned round to reach back, which meant two men hanging half through a hatch trying to pull each other in opposite directions. They were on the ladder inside ninety seconds and one of them started laughing and had to stop because of the echo.',
      bothFold: 'Both went for the rail at once and neither could get up it with the other one on it. They were still in that elevator, standing very close together and not talking, when it was opened from outside at six.',
      betray: '{traitor} kept climbing. {victim} stood in a stopped elevator looking up at an open hatch and a rectangle of shaft, and at nothing else, for quite a long time.',
    },
  },
  {
    id: 'act_flood',
    tone: 'action',
    title: 'The Hatch Seals From Above',
    setup: [
      'The storm drain was the route in and the storm was not in the forecast anybody checked.',
      'Water is coming down the access shaft faster than anybody planned for and the hatch at street level seals from above — which is good, because it keeps the water out of the tunnel, and bad, because somebody has to be on top to do it.',
      'You are both in the access shaft, one above the other, in a lot of moving water, and the hatch is within reach of whichever of you gets a hand to it first. Sealing it puts the other man on the wrong side of it.',
    ],
    pressure: 'Sealing it now saves the tunnel, the cache, and about eleven months of everybody’s work. Waiting costs all of that and maybe more.',
    stand: { label: 'HOLD IT OPEN', blurb: 'Keep the hatch up and eat whatever the water does to the tunnel. Forty yards. {them} is coming.' },
    fold: { label: 'SEAL IT', blurb: 'Eleven months of work against forty yards. Nobody is ever going to be able to prove what you could see from up there.' },
    did: {
      stand: 'held the hatch up and let the water take the tunnel',
      fold: 'sealed it',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'GO BACK DOWN',
        blurb: 'Into the tunnel, not out of it, and get whoever is down there moving. You are the last man in a filling storm drain and the hatch is somebody else’s decision now.',
        did: 'went back down into the tunnel instead of up, and left the hatch to somebody else',
      },
      {
        archetype: 'half',
        label: 'SEAL IT HALFWAY',
        blurb: 'Drop it to the catch. It slows the water without shutting anybody out, and it is not rated to hold at the catch, and everybody in that shaft can hear that it is not.',
        did: 'dropped the hatch to the catch, which slows the water and is not rated to hold',
      },
    ],
    closers: {
      murky: 'The tunnel took about nine inches and stopped. Eleven months of work is damp rather than gone, and nobody wants to discuss what the catch sounded like.',
    },
    outcomes: {
      bothStand: 'Neither sealed it. The tunnel flooded to the roof and took everything in it, and two men sat on a kerb in the rain in {place} at four in the morning having lost absolutely everything and being, to their own considerable surprise, fine.',
      bothFold: 'Both of them reached for the hatch, from opposite sides, and neither could seal it against the other. The tunnel flooded anyway. The argument that followed lasted longer than the storm.',
      betray: '{traitor} sealed it. The tunnel was saved. {victim} came out of a different access point two hundred yards away, eventually, and walked back, and the first thing {traitor} said was about the eleven months.',
    },
  },
  {
    id: 'act_dogs',
    tone: 'action',
    title: 'The Fence Is Chain Link',
    setup: [
      'Twelve feet of chain link with three strands on top, a floodlit yard behind you, and two dogs in that yard who have been extremely clear about their intentions.',
      'You are both at the bottom of it at the same time, and the fence takes one man at a time to climb.',
      'A jacket thrown to the dogs buys about eleven seconds of them being interested in something else \u2014 enough for one man to get up and over. A jacket wrapped round your own forearm buys you the same eleven seconds and buys nobody else anything.',
    ],
    pressure: 'Two jackets, two dogs, twelve feet, and a camera on the corner of the building that has not got a good look at anybody yet.',
    stand: { label: 'GIVE THEM THE JACKET', blurb: 'Throw yours out into the yard and climb with a bare arm. It works if {them} does it too; it works badly if not.' },
    fold: { label: 'KEEP IT ON YOUR ARM', blurb: 'Wrapped round the forearm it is eleven seconds of your own. Somebody else’s jacket will keep the dogs busy.' },
    did: {
      stand: 'threw his jacket out into the yard',
      fold: 'kept it wrapped round his forearm and climbed',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'GO BACK OVER',
        blurb: 'Drop into the yard on the wrong side of the fence, on purpose, with both dogs and the floodlight, and put yourself between them and the fence for as long as it takes.',
        did: 'dropped back into the yard on purpose and stood between the dogs and the fence',
      },
      {
        archetype: 'gamble',
        label: 'GO FOR THE GATE',
        blurb: 'Not the fence — the gate on the far side, forty yards across open ground. If the bolt is off you are in the street in fifteen seconds and nobody climbed anything.',
        did: 'ran forty yards of open ground for a gate that may or may not be bolted',
      },
    ],
    closers: {
      murky: 'One jacket is still in that yard. The gate was bolted. The camera on the corner has eleven seconds of somebody running the wrong way and nobody has identified him.',
    },
    outcomes: {
      bothStand: 'Both jackets went out into the yard. The dogs took one each, which was the entire theory, and both men went up a fence with bare arms and no particular difficulty. The jackets are still in that yard.',
      bothFold: 'Neither threw anything. Two men went up the same twelve feet of chain link with two dogs and two wrapped forearms, one at a time, in a floodlight, slowly. Between them it took eleven stitches and they have agreed to call it even.',
      betray: '{traitor} kept his jacket on his arm and went up first. {victim} got over that fence by himself afterwards in a way that required a hospital, and has the story, and tells it at parties, and does not name anybody in it.',
    },
  },
];

export const ACTION_TABLE = [
  {
    id: 'act_yard',
    tone: 'action',
    title: 'The Yard, 3:40 A.M.',
    setup: [
      'One ladder, {n} of you, and a guard tower that sweeps the north wall every ninety seconds.',
      'The ladder takes one man at a time and somebody has to foot it at the bottom or it walks out from under whoever is on it. The last man up has nobody to foot it for him, and everybody in this yard has known that since the planning stage.',
      'Anybody can break for the laundry door instead. It is not freedom, but it is not a spotlight either, and nobody can prove you were ever at the wall.',
    ],
    pressure: 'If everybody foots the ladder in turn, everybody goes over. If enough people break for the laundry, there is nobody at the bottom and the ladder is a piece of wood lying in a yard.',
    stand: { label: 'FOOT THE LADDER', blurb: 'Take your turn at the bottom. The whole thing only works if enough of you do.' },
    fold: { label: 'BREAK FOR THE LAUNDRY', blurb: 'Nobody can see who was where. The ladder works fine without you, probably.' },
    did: {
      stand: 'took his turn at the bottom of the ladder',
      fold: 'broke for the laundry',
    },
    extra: [
      {
        archetype: 'half',
        label: 'FOOT IT ONCE AND GO',
        blurb: 'Hold it for one man and then take your turn. You have done a third of what was asked and you are over the wall, which is more than most.',
        did: 'footed it for exactly one man and then went up himself',
      },
      {
        archetype: 'martyr',
        label: 'FOOT IT TO THE END',
        blurb: 'Stay at the bottom until there is nobody left to hold it for, which means there is nobody left to hold it for you. Somebody has to be last and you have decided it is you.',
        did: 'stayed at the bottom until there was nobody left to hold it for him',
      },
    ],
    closers: {
      murky: 'Most of them went over the north wall. The ladder was in the yard at 3:52 with one man standing next to it who has not been asked about it since.',
    },
    outcomes: {
      allStand: 'Every man took his turn at the bottom. All {n} went over the north wall in eleven minutes, including the last one, who got up it by a method that has been argued about ever since. Nobody was caught. Nobody has ever said who went last.',
      allFold: 'Everybody broke for the laundry. The ladder stayed in the yard, alone, in the spotlight, for four hours, and was photographed extensively, and is now in a case in a training facility with a label on it.',
      mixed: '{standerNames} footed the ladder. {folderNames} went for the laundry. The ones at the wall got over in the order they were standing, except for the last one, who is still inside and knows exactly how many people were not holding that ladder.',
    },
  },
  {
    id: 'act_lifeboat',
    tone: 'action',
    title: 'The Lifeboat Holds Six',
    setup: [
      'The ferry is going down at the stern and the crew have gone, which is either a scandal or the correct procedure depending on which enquiry you read.',
      'There are {n} of you at the davits and a boat rated for six, which everybody understands to mean nine if nobody is precious about it.',
      'The winch needs two men working it to lower a loaded boat. Men on the winch go last, in a boat that is already in the water, by rope.',
    ],
    pressure: 'Work the winch and everybody gets down, including you, badly. Get in the boat early and somebody else works the winch or the boat does not go down at all.',
    stand: { label: 'WORK THE WINCH', blurb: 'Lower everybody else first. You go down a rope into a moving boat, in the dark, if it is still there.' },
    fold: { label: 'GET IN THE BOAT', blurb: 'Take a seat. Somebody always works the winch. Somebody else.' },
    did: {
      stand: 'worked the winch',
      fold: 'took a seat in the boat',
    },
    extra: [
      {
        archetype: 'half',
        label: 'WORK IT, THEN GET IN',
        blurb: 'Lower it halfway, hand the crank to whoever is nearest, and step in. It goes down slower and you are in it, and everybody at the rail watched you decide.',
        did: 'worked the winch halfway, handed the crank over, and stepped into the boat',
      },
      {
        archetype: 'gamble',
        label: 'CUT THE FALLS',
        blurb: 'Do not lower it. Cut both falls and let it drop the last twelve feet. It is in the water in two seconds or it is upside down in the water in two seconds.',
        did: 'cut both falls and dropped the boat the last twelve feet',
      },
    ],
    closers: {
      murky: 'The boat reached the water in a manner the enquiry described as unorthodox. Everybody got off the ferry. Nobody has agreed on the order.',
    },
    outcomes: {
      allStand: 'Everybody worked the winch, which meant the boat went down empty, which meant everybody went down a rope into it, which is the stupidest and most successful evacuation anybody at the enquiry had ever heard of.',
      allFold: 'Everybody got in the boat. {n} people sat in a lifeboat still hanging from the davits of a sinking ferry, looking at each other, and then at the winch, and then at each other again.',
      mixed: '{standerNames} worked the winch. {folderNames} took seats. The boat went into the water, and the people in it watched the people on the rail come down a rope, and everybody has been very polite about it ever since.',
    },
  },
  {
    id: 'act_plane',
    tone: 'action',
    title: 'Four Hundred Pounds Over',
    setup: [
      'A short strip, a heavy night, and a twin that is four hundred pounds over what it should be with {n} of you and the bags.',
      'Four hundred pounds is roughly the bags. It is also, if you are being precise about it, roughly two people.',
      'The pilot has said the number twice and has stopped saying anything else, which everybody is choosing to interpret as a technical observation.',
    ],
    pressure: 'Bags off and everybody flies with nothing. Bags on and somebody is walking back to {place} in the dark, and nobody has volunteered yet.',
    stand: { label: 'YOUR BAG GOES', blurb: 'Throw yours on the grass. Everybody flies. Including whoever kept theirs.' },
    fold: { label: 'YOUR BAG STAYS', blurb: 'Plenty of other bags. The plane does not know whose is whose and neither, in the dark, does anybody else.' },
    did: {
      stand: 'put his bag on the grass',
      fold: 'kept his bag',
    },
    extra: [
      {
        archetype: 'half',
        label: 'SPLIT YOUR BAG',
        blurb: 'Leave half of it on the strip and carry the rest on your knees. The arithmetic improves and the pilot stops looking at you specifically.',
        did: 'left half his bag on the strip and carried the rest on his knees',
      },
      {
        archetype: 'martyr',
        label: 'GET OUT AND WALK',
        blurb: 'Two hundred pounds is one person. Take your bag, get out, and let the plane fly light with everybody else’s in it. It is eleven miles to {place} in the dark.',
        did: 'got out with his bag and started walking, which is eleven miles in the dark',
      },
    ],
    closers: {
      murky: 'The twin used most of the strip and got off it. There was a bag on the grass, half a bag on somebody’s knees, and one seat that stayed empty the whole way.',
    },
    outcomes: {
      allStand: 'Every bag went on the grass. The twin got off that strip with room to spare and {n} people who owned nothing, and somebody started laughing at about two hundred feet and it went round the whole cabin.',
      allFold: 'Nobody’s bag went. The twin used the entire strip, and the grass after it, and a fence, and did not get off the ground at all. Everybody still has their bag. The bags are in a field.',
      mixed: '{standerNames} put their bags on the grass. {folderNames} kept theirs. The plane flew, low and slow and badly, and the flight took an hour and eleven minutes and nobody in that cabin said a single word.',
    },
  },
  {
    id: 'act_lockdown',
    tone: 'action',
    title: 'The Shutters Come Down In Four Minutes',
    setup: [
      'Somebody hit the panic bar and the building is doing what the building was designed to do: at four minutes, every shutter drops and the whole floor becomes a box with {n} people in it.',
      'There is a maintenance override in the electrical room. Holding it open takes one person with a hand on a switch, for as long as the others need, and that person is in the box when it closes.',
      'Every extra body at that switch means the shutters come down slower and everybody gets more time. There is also, obviously, a stairwell.',
    ],
    pressure: 'Hands on the switch buy time for everybody, including the people running for the stairwell instead.',
    stand: { label: 'HAND ON THE SWITCH', blurb: 'Hold the override. Everybody gets longer, including whoever is already on the stairs.' },
    fold: { label: 'TAKE THE STAIRWELL', blurb: 'Whoever is on the switch is buying you time whether you help or not. Spend it.' },
    did: {
      stand: 'kept a hand on the override',
      fold: 'took the stairwell',
    },
    extra: [
      {
        archetype: 'half',
        label: 'HOLD IT, THEN RUN',
        blurb: 'Hand on the switch for two minutes and then go. Everybody gets two minutes they would not have had and you are not the one in the box.',
        did: 'held the switch for two minutes and then ran for it',
      },
      {
        archetype: 'gamble',
        label: 'BREAK THE GLASS',
        blurb: 'Forget the override. Put a chair through the third-floor window. It is a way out for everybody and it is also an alarm, a crowd and a photograph.',
        did: 'put a chair through the third-floor window, which is a way out and an alarm',
      },
    ],
    closers: {
      murky: 'The shutters came down on an empty electrical room and a broken window with nobody near it. The building has since changed its procedure twice.',
    },
    outcomes: {
      allStand: 'Every one of them went to the electrical room. The override held for eleven minutes on {n} hands, the shutters never dropped, and they walked out the front of the building at a normal speed like people who worked there.',
      allFold: 'Everybody took the stairwell. Nobody held the override. The shutters came down at four minutes exactly, on the stairwell doors, with everybody in the stairwell, which is where they spent the night.',
      mixed: '{standerNames} held the override. {folderNames} took the stairs and made it out on the time the others bought. The shutters came down on the electrical room, eventually, with somebody’s hand still on the switch.',
    },
  },
];

export const ACTION_TRIO = [
  {
    id: 'act_three_rope',
    tone: 'action',
    title: 'Three On One Rope',
    setup: [
      'Six storeys of scaffold, one line, and a bar clamp at the top that is rated for two men and is currently holding three.',
      'Going down slowly, in order, with everyone taking weight off at the right moment, gets all three of you to the alley.',
      'Going down fast gets one person to the alley immediately and changes the loading on that clamp in a way the manufacturer has a chart for.',
    ],
    pressure: 'Nobody can see the clamp from where they are hanging. Everybody can hear it.',
    stand: { label: 'GO DOWN IN ORDER', blurb: 'Slow, in sequence, weight off when it is somebody else’s turn.' },
    fold: { label: 'GO DOWN FAST', blurb: 'The clamp is going to do whatever the clamp is going to do. Be nearest the ground when it does.' },
    did: {
      stand: 'went down in order',
      fold: 'went down fast',
    },
    extra: [
      {
        archetype: 'martyr',
        label: 'GO LAST AND GO SLOW',
        blurb: 'Let both of them off first and take whatever the clamp has left. There is a chart for what that means and you have read it.',
        did: 'let both of them off first and took whatever the clamp had left',
      },
    ],
    closers: {
      murky: 'The clamp is still up there. Somebody goes and looks at it occasionally and has never explained to anybody else why.',
    },
    outcomes: {
      allStand: 'All three went down in sequence like men who had practised it, which they had not. The clamp held. It is still up there. Somebody goes and looks at it occasionally.',
      allFold: 'All three went at once. The clamp did the thing on the chart. Nobody was seriously hurt, which three separate people have described as the luckiest night of their lives, separately, without mentioning the other two.',
      mixed: '{standerNames} went down in order. {folderNames} did not. Everybody reached the alley; not everybody reached it the same way, and the ones who went slow arrived to find the others already walking.',
    },
  },
  {
    id: 'act_three_cell',
    tone: 'action',
    title: 'The Count Is In Six Minutes',
    setup: [
      'Three of you, one hole behind a locker, and a corridor count in six minutes that requires three bodies in three beds.',
      'Two dummies have been made. Three have not. Somebody has to be in a bed at the count or the whole thing is discovered tonight instead of at eight in the morning, which is nine hours of difference.',
      'Nobody agreed in advance who that would be, because agreeing in advance would have meant saying it out loud.',
    ],
    pressure: 'Whoever stays gets nine hours for the other two and a very specific conversation of his own.',
    stand: { label: 'BE IN THE BED', blurb: 'Take the count. Buy the others the night. Hope somebody would have done it for you.' },
    fold: { label: 'TAKE THE HOLE', blurb: 'Go. Somebody will be in a bed. There are three of you and only one is needed.' },
    did: {
      stand: 'was in his bed for the count',
      fold: 'took the hole',
    },
    extra: [
      {
        archetype: 'half',
        label: 'BUILD THE THIRD DUMMY',
        blurb: 'Six minutes, one pillow and a jacket. It will not survive a torch and it might survive a corridor, and it means nobody has to volunteer.',
        did: 'spent the six minutes building a third dummy out of a pillow and a jacket',
      },
    ],
    closers: {
      murky: 'The count found three shapes in three beds and one of them was a jacket. The hole was found at eight, which is nine hours later than it should have been.',
    },
    outcomes: {
      allStand: 'All three were in their beds at the count, because all three assumed somebody else would run and none of them could stand to be that person. The hole was found on Thursday. They are all still inside and they all still sit together.',
      allFold: 'All three took the hole. The count found three dummies and two of them were pillows. They had eleven minutes of head start between them and used it in three different directions.',
      mixed: '{standerNames} took the count. {folderNames} took the hole, and got the nine hours, and got out of the county on them. Everybody involved knows exactly what that was worth and exactly who paid for it.',
    },
  },
];
