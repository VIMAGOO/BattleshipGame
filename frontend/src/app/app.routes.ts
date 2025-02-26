// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  { path: 'welcome', loadComponent: () => import('./pages/welcome/welcome.component').then(m => m.WelcomeComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent) },
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  { path: 'game', loadComponent: () => import('./pages/game-panel/game-panel.component').then(m => m.GamePanelComponent), canActivate: [authGuard] },
  { path: 'history', loadComponent: () => import('./pages/history-panel/history-panel.component').then(m => m.HistoryPanelComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: '/welcome' }
];