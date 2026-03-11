export const ADJECTIVES = [
  'swift', 'brave', 'calm', 'bold', 'keen', 'wise', 'cool', 'bright',
  'warm', 'jolly', 'quick', 'gentle', 'merry', 'clever', 'fierce'
];

export const ANIMALS = [
  'otter', 'panda', 'fox', 'wolf', 'bear', 'owl', 'hawk', 'seal',
  'lynx', 'robin', 'badger', 'deer', 'finch', 'moose', 'newt'
];

export function generate(num) {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}-${animal}-${num}`;
}
