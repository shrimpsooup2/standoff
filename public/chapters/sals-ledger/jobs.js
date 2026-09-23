// What you do for the crew. Public: everybody knows who's driving.

export const JOBS = {
  talker: { name: 'The Talker', text: 'When you’re doing the talking, you get one extra clue.' },
  driver: { name: 'The Driver', text: 'You decide when the car leaves.' },
  numbers: { name: 'The Numbers Guy', text: 'You see exactly who put what in the Bag. Everyone knows you can.' },
  muscle: { name: 'The Muscle', text: 'Once a night, add 2 to a roll you’re in.' },
  cousin: { name: 'The Cousin', text: 'Nonna likes you. Once a week, she settles a tie your way.' },
  newguy: { name: 'The New Guy', text: 'You hold four cards instead of three. Nobody trusts you, which is fair.' },
  fixer: { name: 'The Fixer', text: 'Once a week, after a vote is shown, move one person’s vote.' },
  lookout: { name: 'The Lookout', text: 'In any heist, you see each alarm die before anybody decides.' },
  mechanic: { name: 'The Mechanic', text: 'Once a week, turn a failed getaway into a clean one.' },
  altarboy: { name: 'The Altar Boy', text: 'Father Dominic owes you. Once a week, he wipes a word off your seat for free.' },
};

/** The order jobs are dealt in: a Talker and a Driver first, always. */
export const JOB_ORDER = ['talker', 'driver'];
export const JOB_REST = ['numbers', 'muscle', 'lookout', 'cousin', 'fixer', 'newguy', 'mechanic', 'altarboy'];
