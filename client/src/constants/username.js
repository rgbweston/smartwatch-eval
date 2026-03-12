export const ADJECTIVES = [
  'swift', 'brave', 'calm', 'bold', 'keen', 'wise', 'cool', 'bright',
  'warm', 'jolly', 'quick', 'gentle', 'merry', 'clever', 'fierce',
  'happy', 'sunny', 'lucky', 'fuzzy', 'snappy', 'lively', 'peppy',
  'mighty', 'noble', 'plucky', 'radiant', 'savvy', 'spry', 'stout',
  'trusty', 'vivid', 'witty', 'zesty', 'daring', 'earnest'
];

export const ANIMALS = [
  'otter', 'panda', 'fox', 'wolf', 'bear', 'owl', 'hawk', 'seal',
  'lynx', 'robin', 'badger', 'deer', 'finch', 'moose', 'newt',
  'koala', 'gecko', 'raven', 'bison', 'crane', 'dingo', 'egret',
  'falcon', 'gibbon', 'heron', 'ibis', 'jackal', 'kite', 'lemur',
  'marten', 'numbat', 'ocelot', 'quail', 'stoat'
];

export function generate(num) {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}-${animal}-${num}`;
}
