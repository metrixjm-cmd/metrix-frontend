import { Routes } from '@angular/router';

export const PRODUCTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./product-catalog/product-catalog').then(m => m.ProductCatalog),
  },
  {
    path: 'checkout/:packageId',
    loadComponent: () =>
      import('./product-checkout/product-checkout').then(m => m.ProductCheckout),
  },
  {
    path: 'provision/:orderId',
    loadComponent: () =>
      import('./product-provision/product-provision').then(m => m.ProductProvision),
  },
];
