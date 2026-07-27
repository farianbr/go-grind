const AVATAR_BASE = "https://api.dicebear.com/9.x/avataaars/png";
const BACKGROUNDS = "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";

export const getRandomAvatarUrl = () => {
  const params = new URLSearchParams({
    seed: Math.random().toString(36).slice(2, 12),
    size: "256",
    backgroundColor: BACKGROUNDS,
  });
  return `${AVATAR_BASE}?${params.toString()}`;
};
