import { Observable } from 'rxjs';
import { SensorEvent } from 'src/common/interfaces/sensor-event.interface';

export interface SensorBusService {
  onEvent(): Observable<SensorEvent>;
}