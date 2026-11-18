// Avatar générique à initiales (DiceBear), utilisé partout où un joueur n'a pas de photo.
const AVATAR_COLORS = ["e86f2c", "6c5ce7", "221400", "2f6f4f", "b23a1f"];

export function avatarUrl(name, index = 0) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bg}&fontFamily=Arial`;
}
