import { request, get, post, patch, del, put } from './api.client';
import { authService } from './auth.service';
import { groupsService } from './groups.service';
import { expensesService } from './expenses.service';
import { settleService } from './settle.service';
import { reportsService } from './reports.service';
import { utilityService } from './utility.service';
import { notificationsService } from './notifications.service';
import { aiService } from './ai.service';
import { membersService } from './members.service';

export default {
  request, get, post, patch, del, put,
  auth: authService,
  groups: groupsService,
  expenses: expensesService,
  settle: settleService,
  reports: reportsService,
  utility: utilityService,
  notifications: notificationsService,
  ai: aiService,
  members: membersService,
};
