import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';

import { PlatformService } from '../services/platform.service';
import { MetrixInstance } from '../platform.models';

@Component({
  selector: 'app-instance-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './instance-list.html',
})
export class InstanceList implements OnInit {
  private readonly platformSvc = inject(PlatformService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly instances = signal<MetrixInstance[]>([]);

  ngOnInit(): void {
    this.platformSvc.listInstances().subscribe({
      next: list => {
        this.instances.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.error ?? 'No se pudieron cargar las instancias.');
        this.loading.set(false);
      },
    });
  }
}
