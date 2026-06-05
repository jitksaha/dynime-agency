import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class EventService {
  private readonly update$ = new Subject<{ event: string; data: any }>();

  emit(event: string, data: any) {
    this.update$.next({ event, data });
  }

  getUpdateStream() {
    return this.update$.asObservable();
  }
}
