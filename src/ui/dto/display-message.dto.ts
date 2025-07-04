export type DisplayMessage =
  | { action: 'start'; gameName: string; instructions: string; playerDisplayName: string; timer: number }
  | { action: 'bonus'; points: number }
  | { action: 'end';   points: number }
  | { action: 'reset' };