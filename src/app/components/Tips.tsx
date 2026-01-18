const armsTips: Record<string, string[]> = {
  "0-20": [
    "Try to keep your elbows closer to your body",
    "Focus on smoother arm movements",
    "Practice the arm motions in slow motion first",
    "Your arms should move with more control",
  ],
  "20-40": [
    "Good start! Try to extend your arms more",
    "Work on timing your arm movements with the beat",
    "Keep your elbows at a consistent angle",
    "Practice arm isolation exercises",
  ],
  "40-60": [
    "You're getting there! Fine-tune your arm angles",
    "Try to match the energy of the choreography",
    "Focus on arm precision and extension",
    "Practice the arm sequence repeatedly",
  ],
  "60-80": [
    "Great arm work! Just a few tweaks needed",
    "Pay attention to small hand movements",
    "Keep your shoulders relaxed while dancing",
    "Work on arm transitions between moves",
  ],
  "80-100": [
    "Excellent arm choreography!",
    "Your arms are moving perfectly!",
    "Amazing arm control and timing!",
    "Your arm movements are on point!",
  ],
};

const legsTips: Record<string, string[]> = {
  "0-20": [
    "Focus on footwork and leg positioning",
    "Try to keep your legs straight when needed",
    "Practice your hip and knee angles",
    "Work on grounding your feet properly",
  ],
  "20-40": [
    "Good foundation! Improve your leg extension",
    "Practice your kicks and leg lifts",
    "Work on leg timing with the music",
    "Focus on stable leg positioning",
  ],
  "40-60": [
    "You're doing well! Refine your leg movements",
    "Work on the angle of your knees",
    "Practice hip movements alongside legs",
    "Try to match the choreography's leg patterns",
  ],
  "60-80": [
    "Great leg work! Polish your footwork",
    "Focus on smooth leg transitions",
    "Keep your stance strong and stable",
    "Work on leg timing accuracy",
  ],
  "80-100": [
    "Fantastic leg choreography!",
    "Your leg work is incredible!",
    "Perfect leg movements and timing!",
    "Your footwork is flawless!",
  ],
};

// Helper function to get score range key
const getScoreRangeKey = (score: number): string => {
    if (score < 20) return "0-20";
    if (score < 40) return "20-40";
    if (score < 60) return "40-60";
    if (score < 80) return "60-80";
    return "80-100";
};

// Helper function to get random tip from collection
export const getRandomArmTip = (score: number): string => {

    return armsTips[getScoreRangeKey(score)]?.[Math.floor(Math.random() * armsTips[getScoreRangeKey(score)].length)];
};

export const getRandomLegTip = (score: number): string => {
    return legsTips[getScoreRangeKey(score)]?.[Math.floor(Math.random() * legsTips[getScoreRangeKey(score)].length)];
}