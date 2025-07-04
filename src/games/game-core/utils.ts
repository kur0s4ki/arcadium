export const HOLE_GAMES = ['roller-skate', 'plinko', 'skyscraper'];
export function isHoleGame(id: string) {
  return HOLE_GAMES.includes(id);
}