// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of } from 'rxjs';
import {
  User,
  UserCredentials,
  RegistrationData,
  AuthResponse,
} from '../models/user';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromStorage();
    this.getUserInfo(); // Intentamos obtener la info del usuario si hay token
  }

  private loadUserFromStorage(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  register(data: RegistrationData): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  login(credentials: UserCredentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(tap((response) => this.handleAuthentication(response)));
  }

  logout(): void {
    // Llamar al backend para invalidar token (coincide con tu API)
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe();

    // Limpiar almacenamiento local
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');

    // Actualizar el subject
    this.currentUserSubject.next(null);

    // Navegar a la página de bienvenida
    this.router.navigateByUrl('/welcome');
  }

  // Método nuevo para obtener info del usuario (coincide con tu API)
  getUserInfo(): Observable<User> {
    if (!this.isAuthenticated()) {
      return of({} as User);
    }

    return this.http.get<User>(`${this.apiUrl}/user`).pipe(
      tap((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private handleAuthentication(response: AuthResponse): void {
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }
}
