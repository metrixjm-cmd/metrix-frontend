import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Book, BookService } from './book.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  apiBase = 'http://localhost:8080';
  books: Book[] = [];
  error = '';
  editingId: number | null = null;

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: BookService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      author: ['', [Validators.required, Validators.minLength(2)]],
    });

    this.load();
  }

  load(): void {
    this.error = '';
    this.api.list().subscribe({
      next: (data) => (this.books = data),
      error: (e) => (this.error = this.humanError(e)),
    });
  }

  save(): void {
    this.error = '';
    const payload = this.form.getRawValue() as Book;

    if (this.editingId) {
      this.api.update(this.editingId, payload).subscribe({
        next: () => { this.cancelEdit(); this.load(); },
        error: (e) => (this.error = this.humanError(e)),
      });
      return;
    }

    this.api.create(payload).subscribe({
      next: () => { this.form.reset(); this.load(); },
      error: (e) => (this.error = this.humanError(e)),
    });
  }

  edit(b: Book): void {
    if (!b.id) return;
    this.editingId = b.id;
    this.form.patchValue({ title: b.title, author: b.author });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.form.reset();
  }

  remove(b: Book): void {
    if (!b.id) return;
    this.error = '';
    this.api.delete(b.id).subscribe({
      next: () => this.load(),
      error: (e) => (this.error = this.humanError(e)),
    });
  }

  private humanError(e: any): string {
    if (e?.status === 0) {
      return 'No se pudo conectar al backend (red/CORS). Verifica que el backend esté arriba y la URL/puerto.';
    }
    return `Error ${e?.status ?? ''}: ${e?.message ?? 'desconocido'}`;
  }
}
