import { Observable } from 'rxjs';

/**
 * LED Output Mapping:
 * Red → Output 1
 * Green → Output 2
 * Blue → Output 3
 * Yellow = Red + Green (both ON at the same time)
 */
export enum LedColor {
  NONE = 0,
  RED = 1,
  GREEN = 2,
  YELLOW = 3, // RED + GREEN
  BLUE = 4,
}

export interface LedControlService {
  /**
   * Set the LED color
   * @param color The color to set
   */
  setColor(color: LedColor): void;

  /**
   * Set the LED color for a specific duration, then turn off
   * @param color The color to set
   * @param durationMs The duration in milliseconds
   */
  setColorForDuration(color: LedColor, durationMs: number): Observable<void>;

  /**
   * Set the LED color for a specific duration, then switch to another color
   * @param color The initial color to set
   * @param durationMs The duration in milliseconds
   * @param nextColor The color to switch to after the duration
   */
  setColorThenSwitch(color: LedColor, durationMs: number, nextColor: LedColor): Observable<void>;
}
