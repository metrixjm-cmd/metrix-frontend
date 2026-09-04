import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { MetrixInstance, MetrixInstanceStatus } from '../platform.models';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/platform`;

  listInstances(): Observable<MetrixInstance[]> {
    return this.http.get<MetrixInstance[]>(`${this.base}/instances`);
  }

  updateStatus(id: string, status: MetrixInstanceStatus): Observable<MetrixInstance> {
    return this.http.patch<MetrixInstance>(`${this.base}/instances/${id}/status`, { status });
  }

  deleteInstance(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/instances/${id}`);
  }
}
