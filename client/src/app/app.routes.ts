import { Routes } from '@angular/router';
import { Home } from '../features/home/home';
import { Login } from '../features/account/login/login';
import { TestErrors } from '../features/test-errors/test-errors';
import { NotFound } from '../features/not-found/not-found';
import { Register } from '../features/account/register/register';
import { DailyLog } from '../features/daily-log/daily-log';
import { GoalSettings } from '../features/goal-settings/goal-settings';
import { MyFoods } from '../features/my-foods/my-foods';
import { Progress } from '../features/progress/progress';
import { preventUnsavedChangesGuard } from '../core/guards/prevent-unsaved-changes-guard';
import { authGuard } from '../core/guards/auth-guard';
import { redirectRootGuard } from '../core/guards/redirect-root-guard';

export const routes: Routes = [
    { path: '', pathMatch: 'full', component: Home, title: 'Home', canMatch: [redirectRootGuard]},
    { path: 'account/login', component: Login, title: 'Login' },
    { path: 'account/register', component: Register, title: 'Register' },
    { path: 'daily-log', component: DailyLog, title: 'Daily Log', canActivate: [authGuard] },
    { path: 'progress', component: Progress, title: 'Progress', canActivate: [authGuard] },
    { path: 'my-foods', component: MyFoods, title: 'My Foods', canActivate: [authGuard] },
    { path: 'goal-settings', component: GoalSettings, title: 'Goal Settings',
        canActivate: [authGuard],
        canDeactivate: [preventUnsavedChangesGuard]
     },
    // { path: 'test-errors', component: TestErrors },
    { path: '**', component: NotFound }
];
