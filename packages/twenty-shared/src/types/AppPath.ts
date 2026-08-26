export enum AppPath {
  // Not logged-in
  Verify = '/verify',
  VerifyEmail = '/verify-email',
  SignInUp = '/welcome',
  Invite = '/invite/:workspaceInviteHash',
  ResetPassword = '/reset-password/:passwordResetToken',

  // Onboarding
  WorkspaceActivation = '/workspace-activation',
  CreateProfile = '/create/profile',
  SyncEmails = '/sync/emails',
  InstallApps = '/install-apps',
  InviteTeam = '/invite-team',
  PlanRequired = '/plan-required',
  PlanRequiredSuccess = '/plan-required/payment-success',
  BookCall = '/book-call',

  // Onboarded
  AiChat = '/chat/:threadId?',
  // Prospect Engine: the daily operating screen — who is waiting, what has stopped moving,
  // which client has gone quiet. No segment: it is the same page for everyone, and the
  // reader's record scope decides which rows it is counting.
  Today = '/today',
  // Prospect Engine: authenticated staff workspaces. The lane is checked
  // against the signed-in member's server role before any records are read.
  TeamWorkspace = '/team/:lane/:section?',
  // Prospect Engine: one client's workspace — plan, reports, campaigns, actions. `slug` names
  // the client; the reader's record scope decides which workspaces exist for them at all, so
  // the segment is a convenience for staff and never a way in.
  ClientWorkspace = '/client/:slug?',
  // Prospect Engine: the masked team inbox. `code` is a thread code (LI-0001), never an identifier.
  TeamInbox = '/inbox/:code?',
  Index = '/',
  // Mobile only: the navigation menu is a page there rather than a drawer.
  Home = '/home',
  TasksPage = '/objects/tasks',
  OpportunitiesPage = '/objects/opportunities',

  RecordIndexPage = '/objects/:objectNamePlural',
  RecordShowPage = '/object/:objectNameSingular/:objectRecordId',
  PageLayoutPage = '/page/:pageLayoutId',

  Settings = `settings`,
  SettingsCatchAll = `/${Settings}/*`,
  Developers = `developers`,
  DevelopersCatchAll = `/${Developers}/*`,

  Authorize = '/authorize',

  // Deep link for twenty.com/dpa → in-app DPA generator (login-gated redirect).
  Dpa = '/dpa',

  // 404 page not found
  NotFoundWildcard = '*',
  NotFound = '/not-found',
}
