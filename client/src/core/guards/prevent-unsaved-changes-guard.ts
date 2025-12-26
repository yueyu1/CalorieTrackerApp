import { CanDeactivateFn } from '@angular/router';
import { GoalSettings } from '../../features/goal-settings/goal-settings';

export const preventUnsavedChangesGuard: CanDeactivateFn<GoalSettings> = (component) => {
  if (component.isDirty){
    const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave this page?');
    return confirmLeave;
  }
  return true;
};
