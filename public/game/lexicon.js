// Word banks. Every job pulls its details from here, so the same story never
// quite arrives twice and the specific stupid object is always somebody's
// fault.

export const LEXICON = {
  place: [
    'Cicero', 'the Bayonne flats', 'a Sizzler parking lot in Paramus',
    'the long dead stretch past Elizabeth', 'Ozone Park',
    'a rest stop outside Hartford', 'the docks at Red Hook',
    'a Days Inn in Secaucus', 'the loading bay behind a Ruby Tuesday',
    'Carteret', 'the wrong end of Utica Avenue', 'a Cracker Barrel off I-95',
    'the industrial park nobody can name', 'Hoboken, regrettably',
  ],
  // These get used as the subject of a sentence, so they stay plain noun
  // phrases — a trailing relative clause turns "{cop} says" into a car crash.
  cop: [
    'Detective Marchetti', 'Agent Dunlop', 'a federal agent named Kevin',
    'Detective Sergeant Ruiz', 'a man from the DA’s office with a bad cold',
    'Lieutenant Bracco', 'an FBI agent with a very calm voice',
    'Detective Okonkwo', 'a prosecutor named Hale', 'Inspector Vaughn',
    'a young assistant DA with something to prove',
  ],
  don: [
    'Don Salvatore', 'Uncle Vito', 'Mr. Fontana', 'the Old Man',
    'Aunt Rosaria', 'Big Tommy Two Phones', 'Mr. Petrosino',
    'Nonna Clara', 'Mr. Aiello', 'the Widow Bracco',
  ],
  item: [
    'a gold-plated nail gun', 'eleven crates of counterfeit Advil',
    'a taxidermied swordfish', 'a briefcase of unscratched lottery tickets',
    'a shipping container of knockoff Crocs', 'a municipal Zamboni',
    'four hundred novelty lighters shaped like the Pope',
    'a safe with no door', 'a pallet of expired infant formula',
    'a signed Tony Danza headshot', 'a commercial dough mixer',
    'nine hundred pounds of pistachios', 'an ATM, whole, upright',
  ],
  car: [
    'a brown Buick', 'a Lincoln with one hubcap', 'the van with the dented panel',
    'a Cadillac that smells permanently of anise', 'a Dodge nobody admits to owning',
    'a catering truck with the logo half scraped off',
  ],
  amount: [
    'eighty grand', 'a number with a comma in it', 'two hundred large',
    'forty-one thousand dollars and some change', 'six figures, barely',
    'more than the house is worth',
  ],
  animal: [
    'the Don’s greyhound', 'a parrot named Sinatra', 'Aunt Rosaria’s cat',
    'a racing pigeon with sponsorship', 'the bar dog, Meatball',
  ],
  bar: [
    'the Blue Lantern', 'Castellano’s', 'a VFW hall with the lights on a timer',
    'Nicky’s Clam House', 'the social club above the laundromat',
    'a T.G.I. Friday’s that has seen things',
  ],
  time: ['9:40', 'a quarter past two', 'four in the morning', 'ten to six', 'noon, somehow'],
  quirk: [
    'who takes his coffee with four sugars',
    'who has never once been on time',
    'who cries at commercials',
    'who owes money to a man named Sheepdog',
    'who has a laminated card explaining his own rights',
    'who is somehow related to everyone in this story',
  ],
  smallthing: [
    'a receipt', 'a hotel keycard', 'half a business card', 'a parking ticket',
    'a pizza box with a phone number on it', 'a cufflink', 'a gas station rosary',
  ],
  vice: [
    'the ponies', 'a slot machine in a laundromat', 'a woman in Trenton',
    'an aquarium habit that has gotten out of hand', 'sports betting, all of it',
  ],
};

/** Resolve one consistent set of details for a single job. */
export function rollDetails(rng) {
  const out = {};
  for (const [key, bank] of Object.entries(LEXICON)) {
    const [a, b] = rng.sample(bank, 2);
    out[key] = a;
    out[key + '2'] = b;
  }
  return out;
}

/** Replace {slots} in a template. Unknown slots are left alone, loudly. */
/* A lexicon entry is written to read mid-sentence ("...told a young assistant
   DA with something to prove"), so when one lands at the start of a sentence it
   arrives lowercase. Put the capital back. Nothing in the corpus ends a word
   with a full stop except the end of a sentence, so this is safe. */
function sentenceCase(text) {
  return text
    .replace(/^(\s*[\u201c"']?)([a-z])/, (m, lead, c) => lead + c.toUpperCase())
    .replace(/([.!?]\s+[\u201c"']?)([a-z])/g, (m, lead, c) => lead + c.toUpperCase());
}

export function fill(template, ctx) {
  if (typeof template !== 'string') return template;
  const out = template.replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(ctx, key) ? String(ctx[key]) : m,
  );
  return out === template ? out : sentenceCase(out);
}

export function fillDeep(value, ctx) {
  if (typeof value === 'string') return fill(value, ctx);
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, ctx));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillDeep(v, ctx)]));
  }
  return value;
}
