import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';

export interface Book {
  id?: number;
  title: string;
  author: string;
}

@Injectable({ providedIn: 'root' })
export class BookService {
  //private baseUrl = `${environment.apiBaseUrl}/books`;
  //private baseUrl = '/api/books';
  private baseUrl = `${environment.apiBaseUrl}/books`;

  constructor(private http: HttpClient) {}

  list(): Observable<Book[]> {
    return this.http.get<Book[]>(this.baseUrl);
  }

  create(book: Book): Observable<Book> {
    return this.http.post<Book>(this.baseUrl, book);
  }

  update(id: number, book: Book): Observable<Book> {
    return this.http.put<Book>(`${this.baseUrl}/${id}`, book);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
