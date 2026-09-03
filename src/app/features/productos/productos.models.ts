import type { LicenseAccent, LicensePackage, LicensePricingModel } from '../licensing/licensing.models';

export type ProductOrderStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'TRIAL' | 'PAID' | 'PROVISIONED' | 'CANCELLED';

export interface ProductOrderPackageSnapshot {
  packageId:            string;
  nombre:               string;
  etiqueta:             string;
  pricingModel:         LicensePricingModel;
  precioMensual:        number;
  precioImplementacion: number;
  moneda:               string;
  maxUsuarios:          number | null;
  maxSucursales:        number | null;
  diasPrueba?:          number;
  accent:               LicenseAccent;
}

export interface ProductOrder {
  id:                    string;
  status:                ProductOrderStatus;
  packageSnapshot:       ProductOrderPackageSnapshot;
  empresaNombre:         string;
  contactoNombre:        string;
  contactoEmail:         string;
  contactoTelefono:      string | null;
  sucursalesContratadas: number;
  subtotalMensual:       number;
  cargoImplementacion:   number;
  totalCobrado:          number;
  moneda:                string;
  paymentReference:      string | null;
  paidAt:                string | null;
  onTrial?:              boolean;
  trialEndsAt?:          string | null;
  instanceId:            string | null;
  createdAt:             string;
}

export interface CreateProductOrderRequest {
  packageId:             string;
  empresaNombre:         string;
  contactoNombre:        string;
  contactoEmail:         string;
  contactoTelefono?:     string;
  sucursalesContratadas: number;
}

export interface SimulatedPaymentRequest {
  paymentReference?: string;
  cardholderName:    string;
  cardNumber:        string;
  expiryMonth:       string;
  expiryYear:        string;
  cvv:               string;
}

export interface ProvisionMetrixRequest {
  numeroUsuario:   string;
  password:        string;
  confirmPassword: string;
  adminNombre?:    string;
}

export interface ProvisionMetrixResponse {
  instanceId:          string;
  databaseName:        string;
  adminNumeroUsuario:  string;
  loginUrl:            string;
  message:             string;
}

export type { LicensePackage };
