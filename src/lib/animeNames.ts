const DEMON_SLAYER_NAMES = [
  'Tanjiro Kamado',
  'Nezuko Kamado',
  'Zenitsu Agatsuma',
  'Inosuke Hashibira',
  'Giyu Tomioka',
  'Kyojuro Rengoku',
  'Shinobu Kocho',
  'Mitsuri Kanroji',
  'Muichiro Tokito',
  'Tengen Uzui',
  'Sanemi Shinazugawa',
  'Gyomei Himejima',
  'Obanai Iguro',
  'Akaza',
  'Kokushibo',
];

export function getRandomDemonSlayerName(): string {
  return DEMON_SLAYER_NAMES[Math.floor(Math.random() * DEMON_SLAYER_NAMES.length)];
}