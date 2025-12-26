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

export const routes: Routes = [
    { path: '', component: Home},
    { path: 'account/login', component: Login},
    { path: 'account/register', component: Register},
    { path: 'daily-log', component: DailyLog },
    { path: 'progress', component: Progress },
    { path: 'my-foods', component: MyFoods },
    { path: 'goal-settings', component: GoalSettings, title: 'Goal Settings',
        canDeactivate: [preventUnsavedChangesGuard]
     },
    { path: 'test-errors', component: TestErrors },
    { path: '**', component: NotFound }
];
