import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CheckoutSession, SimulatedPaymentRequest } from '../../productos/productos.models';
import { UserPackOrder, UserPackStatus } from './user-pack.models';

@Injectable({ providedIn: 'root' })
export class UserPackService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/license/user-pack`;

  status(): Observable<UserPackStatus> {
    return this.http.get<UserPackStatus>(this.base);
  }

  checkout(): Observable<CheckoutSession> {
    return this.http.post<CheckoutSession>(`${this.base}/checkout`, {});
  }

  getOrder(orderId: string): Observable<UserPackOrder> {
    return this.http.get<UserPackOrder>(`${this.base}/orders/${orderId}`);
  }

  syncPayment(orderId: string): Observable<UserPackOrder> {
    return this.http.post<UserPackOrder>(`${this.base}/orders/${orderId}/sync-payment`, {});
  }

  pay(orderId: string, body: SimulatedPaymentRequest): Observable<UserPackOrder> {
    return this.http.post<UserPackOrder>(`${this.base}/orders/${orderId}/pay`, body);
  }
}
