export const FAMOUS_ANIME_NAMES = [
  'Gojo',
  'Luffy',
  'Zoro',
  'Naruto',
  'Sasuke',
  'Kakashi',
  'Itachi',
  'Goku',
  'Vegeta',
  'Levi',
  'Eren',
  'Mikasa',
  'Sukuna',
  'Tanjiro',
  'Nezuko',
  'Zenitsu',
  'Rengoku',
  'Giyu',
  'Saitama',
  'Killua',
  'Gon',
  'Ichigo',
  'Aizen',
  'Jinwoo',
  'Lelouch',
  'Light',
  'L',
  'Mustang',
  'Deku',
  'Bakugo',
  'Todoroki',
  'Sanji',
  'Ace',
  'Shanks',
  'Law',
  'Spike',
  'Kaneki',
  'Megumi',
  'Nanami',
];

export function getRandomAnimeName(): string {
  return FAMOUS_ANIME_NAMES[Math.floor(Math.random() * FAMOUS_ANIME_NAMES.length)];
}

// Backwards compatibility alias
export function getRandomDemonSlayerName(): string {
  return getRandomAnimeName();
}