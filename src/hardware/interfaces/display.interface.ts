export interface DisplayService {
    showSplash(title: string, subtitle?: string): void;
    updateScore(score: number): void;
    updateTimer(secRemaining: number): void;
    showResult(result: string): void;
  }