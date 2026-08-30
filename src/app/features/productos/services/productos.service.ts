import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { LicensePackage } from '../../licensing/licensing.models';
import {
  CreateProductOrderRequest,
  ProductOrder,
  ProvisionMetrixRequest,
  ProvisionMetrixResponse,
  SimulatedPaymentRequest,
} from '../productos.models';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/productos`;

  getCatalog(): Observable<LicensePackage[]> {
    return this.http.get<LicensePackage[]>(`${this.base}/catalog`);
  }

  getPackage(id: string): Observable<LicensePackage> {
    return this.http.get<LicensePackage>(`${this.base}/catalog/${id}`);
  }

  createOrder(body: CreateProductOrderRequest): Observable<ProductOrder> {
    return this.http.post<ProductOrder>(`${this.base}/orders`, body);
  }

  getOrder(orderId: string): Observable<ProductOrder> {
    return this.http.get<ProductOrder>(`${this.base}/orders/${orderId}`);
  }

  payOrder(orderId: string, body: SimulatedPaymentRequest): Observable<ProductOrder> {
    return this.http.post<ProductOrder>(`${this.base}/orders/${orderId}/pay`, body);
  }

  provision(orderId: string, body: ProvisionMetrixRequest): Observable<ProvisionMetrixResponse> {
    return this.http.post<ProvisionMetrixResponse>(`${this.base}/orders/${orderId}/provision`, body);
  }
}
