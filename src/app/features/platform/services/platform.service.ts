import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { MetrixInstance, MetrixInstanceStatus, PasswordResetRequest, PasswordResetStatus } from '../platform.models';

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

  adjustTrial(id: string, deltaDays: number): Observable<MetrixInstance> {
    return this.http.patch<MetrixInstance>(`${this.base}/instances/${id}/trial`, { deltaDays });
  }

  listPasswordResets(status?: PasswordResetStatus, instanceId?: string): Observable<PasswordResetRequest[]> {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    if (instanceId) params['instanceId'] = instanceId;
    return this.http.get<PasswordResetRequest[]>(`${this.base}/password-resets`, { params });
  }

  approvePasswordReset(id: string): Observable<PasswordResetRequest> {
    return this.http.post<PasswordResetRequest>(`${this.base}/password-resets/${id}/approve`, {});
  }

  rejectPasswordReset(id: string, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/password-resets/${id}/reject`, reason ? { reason } : {});
  }

  initiateInstancePasswordReset(instanceId: string): Observable<PasswordResetRequest> {
    return this.http.post<PasswordResetRequest>(`${this.base}/instances/${instanceId}/password-reset`, {});
  }
}
