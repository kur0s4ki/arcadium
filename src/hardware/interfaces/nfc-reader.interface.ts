import { Observable } from 'rxjs';
export interface NfcReaderService {
  onTag(): Observable<string>; // emits tag id
}