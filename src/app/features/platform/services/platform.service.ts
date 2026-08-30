import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { MetrixInstance } from '../platform.models';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/platform`;

  listInstances(): Observable<MetrixInstance[]> {
    return this.http.get<MetrixInstance[]>(`${this.base}/instances`);
  }
}
