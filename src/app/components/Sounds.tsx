// Sound collections based on score threshold
const successSounds = [
    new URL("sounds/yay.mp3", import.meta.url).href,
    new URL("sounds/wow.mp3", import.meta.url).href,
    new URL("sounds/money.mp3", import.meta.url).href,
];

const encouragementSounds = [
    new URL("sounds/among-us.mp3", import.meta.url).href,
    new URL("sounds/fah.mp3", import.meta.url).href,
    new URL("sounds/snoring.mp3", import.meta.url).href,
];

export const getRandomSound = (score: number): string => {
  const soundList = score >= 70 ? successSounds : encouragementSounds;
  return soundList[Math.floor(Math.random() * soundList.length)];
};

export const playSound = (score: number) => {
  const soundPath = getRandomSound(score);
  const audio = new Audio(soundPath);
  audio.play().catch(err => console.error("Failed to play sound:", err));
};