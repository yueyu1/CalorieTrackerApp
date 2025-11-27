import { Routes } from '@angular/router';
import { Home } from '../features/home/home';
import { Login } from '../features/account/login/login';
import { Dashboard } from '../features/dashboard/dashboard';

export const routes: Routes = [
    { path: '', component: Home},
    { path: 'account/login', component: Login},
    { path: 'dashboard', component: Dashboard },
    { path: '**', redirectTo: ''}
];
