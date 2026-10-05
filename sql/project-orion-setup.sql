-- ============================================================
-- PROJECT ORION: LOCAL SQL SERVER SETUP SCRIPT
-- ============================================================
-- Demo environment: SQL Server (local)
-- Production swap: Update connection string to Azure SQL
-- ============================================================
-- NARRATIVE SUMMARY (for demo prep):
-- Project Orion is a customer-facing web app mid-release cycle.
-- Sprint 5 is the current sprint. The project is under pressure:
--   - Velocity has been declining for 3 sprints
--   - 3 critical bugs are open and blocking the release
--   - A key feature has been stalled for 12+ days
--   - Release readiness score has dropped from 85 to 52
-- These SQL records correlate directly to the GitHub issues.
-- See CORRELATION MAP at the bottom of this file.
-- ============================================================
-- DATES ARE RELATIVE TO THE DAY YOU RUN THIS SCRIPT.
-- Seed data is written against a fixed baseline, then section 7d
-- rolls every date forward so the latest health snapshot lands
-- on today. Run this script the morning of the demo (or the day
-- before) so tools that filter by GETDATE() return data.
-- The release target (15 Feb 2027) is fixed and is NOT shifted.
-- ============================================================

-- ------------------------------------------------------------
-- 1. CREATE DATABASE
-- ------------------------------------------------------------
USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'ProjectOrion')
BEGIN
    ALTER DATABASE ProjectOrion SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ProjectOrion;
END
GO

CREATE DATABASE ProjectOrion;
GO

USE ProjectOrion;
GO

-- ------------------------------------------------------------
-- 2. SCHEMA: Sprints
-- Tracks sprint-level health across 5 sprints (Sprint 5 = current)
-- ------------------------------------------------------------
CREATE TABLE Sprints (
    SprintId            INT PRIMARY KEY IDENTITY(1,1),
    SprintName          NVARCHAR(50)    NOT NULL,
    StartDate           DATE            NOT NULL,
    EndDate             DATE            NOT NULL,
    Status              NVARCHAR(20)    NOT NULL,  -- Completed | Active
    PlannedPoints       INT             NOT NULL,
    CompletedPoints     INT             NOT NULL,
    RolloverPoints      INT             NOT NULL,
    TeamVelocity        DECIMAL(5,2)    NULL,      -- NULL while a sprint is still active
    Notes               NVARCHAR(500)   NULL
);
GO

-- ------------------------------------------------------------
-- 3. SCHEMA: WorkItems
-- Individual tasks, bugs, and stories tracked at item level
-- ------------------------------------------------------------
CREATE TABLE WorkItems (
    WorkItemId          INT PRIMARY KEY IDENTITY(1,1),
    SprintId            INT             NOT NULL REFERENCES Sprints(SprintId),
    Title               NVARCHAR(200)   NOT NULL,
    Type                NVARCHAR(20)    NOT NULL,  -- Task | Bug | Story
    Priority            NVARCHAR(10)    NOT NULL,  -- Critical | High | Medium | Low
    Status              NVARCHAR(20)    NOT NULL,  -- New | Active | Resolved | Closed | Blocked
    AssignedTo          NVARCHAR(100)   NULL,
    StoryPoints         INT             NULL,
    GitHubIssueRef      NVARCHAR(50)    NULL,      -- Correlates to GitHub issue number
    CreatedDate         DATE            NOT NULL,
    ResolvedDate        DATE            NULL,
    Notes               NVARCHAR(500)   NULL
);
GO

-- ------------------------------------------------------------
-- 4. SCHEMA: HealthMetrics
-- Periodic snapshots of computed project health indicators
-- Recorded daily for the last 30 days
-- ------------------------------------------------------------
CREATE TABLE HealthMetrics (
    MetricId                INT PRIMARY KEY IDENTITY(1,1),
    RecordedDate            DATE            NOT NULL,
    SprintId                INT             NOT NULL REFERENCES Sprints(SprintId),
    BugOpenCount            INT             NOT NULL,
    BugCriticalCount        INT             NOT NULL,
    SprintCompletionRate    DECIMAL(5,2)    NOT NULL,  -- Percentage 0-100
    VelocityTrend           NVARCHAR(10)    NOT NULL,  -- Rising | Stable | Declining
    BlockerCount            INT             NOT NULL,
    ReleaseReadinessScore   INT             NOT NULL,  -- 0-100
    Notes                   NVARCHAR(500)   NULL
);
GO

-- ------------------------------------------------------------
-- 4b. SCHEMA: ReleasePlan
-- The release the team is working toward. Used by the
-- get_release_forecast MCP tool.
-- ------------------------------------------------------------
CREATE TABLE ReleasePlan (
    ReleaseId           INT PRIMARY KEY IDENTITY(1,1),
    ReleaseName         NVARCHAR(50)    NOT NULL,
    TargetDate          DATE            NOT NULL,
    TotalScopePoints    INT             NOT NULL,  -- Full release scope in story points
    SprintLengthDays    INT             NOT NULL,  -- Sprint cadence used for forecasting
    Notes               NVARCHAR(500)   NULL
);
GO

-- ------------------------------------------------------------
-- 4c. SCHEMA: FeatureFlags
-- Switches read by the MCP server on every request.
-- The dashboard toggle flips ForecastToolEnabled on stage, which
-- "deploys" the get_release_forecast tool without touching the
-- Copilot Studio agent.
-- ------------------------------------------------------------
CREATE TABLE FeatureFlags (
    FlagName            NVARCHAR(100)   PRIMARY KEY,
    IsEnabled           BIT             NOT NULL,
    Description         NVARCHAR(300)   NULL,
    UpdatedAt           DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- ------------------------------------------------------------
-- 5. SEED DATA: Sprints
-- Sprint 1-4: Completed. Sprint 5: Active (current).
-- Narrative: velocity declining since Sprint 3, rollovers increasing.
-- ------------------------------------------------------------
INSERT INTO Sprints (SprintName, StartDate, EndDate, Status, PlannedPoints, CompletedPoints, RolloverPoints, TeamVelocity, Notes)
VALUES
(
    'Sprint 1',
    '2025-09-01', '2025-09-12', 'Completed',
    42, 40, 2, 40.00,
    'Strong start to the release cycle. Team aligned on scope.'
),
(
    'Sprint 2',
    '2025-09-15', '2025-09-26', 'Completed',
    44, 43, 1, 43.00,
    'Highest velocity sprint. Core features landed cleanly.'
),
(
    'Sprint 3',
    '2025-09-29', '2025-10-10', 'Completed',
    45, 38, 7, 38.00,
    'First signs of pressure. Performance issues emerged mid-sprint. 7 points rolled over.'
),
(
    'Sprint 4',
    '2025-10-13', '2025-10-24', 'Completed',
    44, 33, 11, 33.00,
    'Velocity drop accelerated. 3 critical bugs introduced. Authentication and data sync issues unresolved.'
),
(
    'Sprint 5',
    '2025-10-27', '2025-11-07', 'Active',
    46, 14, 0, NULL,
    'Current sprint. 3 critical bugs still open and blocking release. Notification feature stalled for 12 days. Release readiness at risk.'
);
GO

-- ------------------------------------------------------------
-- 6. SEED DATA: WorkItems
-- 70 items across 5 sprints, correlated to GitHub issues.
-- Sprint 5 items reflect current troubled state.
-- ------------------------------------------------------------

-- SPRINT 1 WORK ITEMS (10 items, healthy)
INSERT INTO WorkItems (SprintId, Title, Type, Priority, Status, AssignedTo, StoryPoints, GitHubIssueRef, CreatedDate, ResolvedDate, Notes)
VALUES
(1, 'Set up CI/CD pipeline',                        'Task',  'High',     'Closed',   'Alex Rivera',   3,  NULL,    '2025-09-01', '2025-09-08', NULL),
(1, 'Design system component library',              'Story', 'High',     'Closed',   'Maya Patel',    5,  '#1',    '2025-09-01', '2025-09-10', NULL),
(1, 'User authentication: login flow',              'Story', 'Critical', 'Closed',   'Jordan Lee',    8,  '#2',    '2025-09-01', '2025-09-11', NULL),
(1, 'Database schema: users and profiles',          'Task',  'High',     'Closed',   'Sam Torres',    3,  NULL,    '2025-09-01', '2025-09-07', NULL),
(1, 'API gateway configuration',                    'Task',  'High',     'Closed',   'Alex Rivera',   3,  NULL,    '2025-09-01', '2025-09-09', NULL),
(1, 'Dashboard layout: skeleton',                   'Story', 'Medium',   'Closed',   'Maya Patel',    5,  '#3',    '2025-09-02', '2025-09-12', NULL),
(1, 'Environment configuration: dev/staging/prod',  'Task',  'Medium',   'Closed',   'Jordan Lee',    2,  NULL,    '2025-09-01', '2025-09-05', NULL),
(1, 'Unit test framework setup',                    'Task',  'Medium',   'Closed',   'Sam Torres',    2,  NULL,    '2025-09-01', '2025-09-06', NULL),
(1, 'Logging and telemetry baseline',               'Task',  'Low',      'Closed',   'Alex Rivera',   2,  NULL,    '2025-09-02', '2025-09-11', NULL),
(1, 'Documentation: onboarding guide v1',           'Task',  'Low',      'Closed',   'Maya Patel',    2,  NULL,    '2025-09-03', '2025-09-12', 'Rolled over 2pts resolved early Sprint 2');
GO

-- SPRINT 2 WORK ITEMS (12 items, peak velocity)
INSERT INTO WorkItems (SprintId, Title, Type, Priority, Status, AssignedTo, StoryPoints, GitHubIssueRef, CreatedDate, ResolvedDate, Notes)
VALUES
(2, 'User profile: edit and update',                'Story', 'High',     'Closed',   'Maya Patel',    5,  '#4',    '2025-09-15', '2025-09-22', NULL),
(2, 'Dashboard: metrics panels v1',                 'Story', 'High',     'Closed',   'Jordan Lee',    8,  '#5',    '2025-09-15', '2025-09-24', NULL),
(2, 'Notifications: data model',                    'Task',  'Medium',   'Closed',   'Sam Torres',    3,  NULL,    '2025-09-15', '2025-09-19', NULL),
(2, 'Search: basic full-text implementation',       'Story', 'High',     'Closed',   'Alex Rivera',   5,  '#6',    '2025-09-15', '2025-09-23', NULL),
(2, 'Role-based access control: admin vs user',     'Story', 'Critical', 'Closed',   'Jordan Lee',    8,  '#7',    '2025-09-15', '2025-09-25', NULL),
(2, 'API: user preferences endpoints',              'Task',  'Medium',   'Closed',   'Sam Torres',    3,  NULL,    '2025-09-15', '2025-09-20', NULL),
(2, 'Performance: image optimization pipeline',     'Task',  'Medium',   'Closed',   'Alex Rivera',   2,  NULL,    '2025-09-16', '2025-09-22', NULL),
(2, 'Export: CSV download for reports',             'Story', 'Low',      'Closed',   'Maya Patel',    3,  '#8',    '2025-09-16', '2025-09-24', NULL),
(2, 'Mobile: responsive layout audit',              'Task',  'Medium',   'Closed',   'Jordan Lee',    2,  NULL,    '2025-09-17', '2025-09-25', NULL),
(2, 'Security: input validation middleware',        'Task',  'High',     'Closed',   'Sam Torres',    3,  NULL,    '2025-09-17', '2025-09-23', NULL),
(2, 'Database: indexing strategy for queries',      'Task',  'Medium',   'Closed',   'Alex Rivera',   2,  NULL,    '2025-09-18', '2025-09-26', NULL),
(2, 'Bug: login redirect loop on token expiry',     'Bug',   'High',     'Closed',   'Jordan Lee',    2,  '#9',    '2025-09-20', '2025-09-25', 'Introduced and resolved within sprint');
GO

-- SPRINT 3 WORK ITEMS (14 items, first cracks appear)
INSERT INTO WorkItems (SprintId, Title, Type, Priority, Status, AssignedTo, StoryPoints, GitHubIssueRef, CreatedDate, ResolvedDate, Notes)
VALUES
(3, 'Dashboard: metrics panels v2 (real-time)',     'Story', 'High',     'Closed',   'Maya Patel',    8,  '#10',   '2025-09-29', '2025-10-08', NULL),
(3, 'Notifications: email delivery integration',    'Story', 'High',     'Closed',   'Jordan Lee',    5,  '#11',   '2025-09-29', '2025-10-07', NULL),
(3, 'Search: advanced filters',                     'Story', 'Medium',   'Closed',   'Alex Rivera',   5,  '#12',   '2025-09-29', '2025-10-09', NULL),
(3, 'Performance: API response time audit',         'Task',  'High',     'Closed',   'Sam Torres',    3,  '#13',   '2025-09-29', '2025-10-06', 'Audit revealed dashboard load issue. Ticket #18 created.'),
(3, 'Accessibility: WCAG 2.1 AA compliance audit',  'Task',  'Medium',   'Closed',   'Maya Patel',    2,  NULL,    '2025-09-30', '2025-10-08', NULL),
(3, 'API: pagination for large result sets',        'Task',  'Medium',   'Closed',   'Jordan Lee',    3,  NULL,    '2025-09-30', '2025-10-07', NULL),
(3, 'Bug: profile image upload fails >2MB',         'Bug',   'Medium',   'Closed',   'Alex Rivera',   2,  '#14',   '2025-10-01', '2025-10-06', NULL),
(3, 'Bug: search returns stale cache results',      'Bug',   'High',     'Closed',   'Sam Torres',    3,  '#15',   '2025-10-02', '2025-10-09', NULL),
(3, 'User notifications: in-app banner',            'Story', 'Medium',   'Closed',   'Maya Patel',    3,  '#16',   '2025-09-29', '2025-10-10', NULL),
(3, 'Tech debt: refactor auth token handling',      'Task',  'Medium',   'Closed',   'Jordan Lee',    3,  '#17',   '2025-09-30', '2025-10-10', NULL),
-- ROLLED OVER from Sprint 3 to Sprint 4. These copies are Closed in Sprint 3;
-- the live copy of each item is in Sprint 4 (one open record per item).
(3, 'Performance: dashboard load time >4s on prod', 'Bug',   'High',     'Closed',   'Alex Rivera',   3,  '#18',   '2025-10-03', NULL,         'Rolled over to Sprint 4. Root cause identified as N+1 query.'),
(3, 'Data export: scheduled report delivery',       'Story', 'Low',      'Closed',   'Sam Torres',    5,  '#19',   '2025-09-29', NULL,         'Rolled over to Sprint 4. Deprioritized.'),
(3, 'Documentation: API reference update',          'Task',  'Low',      'Closed',   'Maya Patel',    2,  NULL,    '2025-10-01', NULL,         'Rolled over to Sprint 4.'),
(3, 'Mobile: offline mode basic support',           'Story', 'Low',      'Active',   'Jordan Lee',    5,  '#20',   '2025-09-29', NULL,         'Descoped. Moved to backlog.');
GO

-- SPRINT 4 WORK ITEMS (16 items, critical bugs introduced)
INSERT INTO WorkItems (SprintId, Title, Type, Priority, Status, AssignedTo, StoryPoints, GitHubIssueRef, CreatedDate, ResolvedDate, Notes)
VALUES
(4, 'Performance: fix dashboard N+1 query',         'Bug',   'High',     'Closed',   'Alex Rivera',   3,  '#18',   '2025-10-13', '2025-10-20', 'Partial fix. Full resolution requires auth refactor.'),
(4, 'Data export: scheduled report delivery',       'Story', 'Low',      'Closed',   'Sam Torres',    5,  '#19',   '2025-10-13', '2025-10-22', NULL),
(4, 'Documentation: API reference update',          'Task',  'Low',      'Closed',   'Maya Patel',    2,  NULL,    '2025-10-13', '2025-10-16', NULL),
(4, 'Notifications: push notification support',     'Story', 'Medium',   'Closed',   'Jordan Lee',    5,  '#21',   '2025-10-13', '2025-10-23', NULL),
(4, 'Security: penetration test findings remediation', 'Task', 'Critical', 'Closed',  'Sam Torres',   5,  NULL,    '2025-10-13', '2025-10-21', '3 of 5 findings resolved. 2 remain open as separate tickets.'),
(4, 'Dashboard: user activity heatmap',             'Story', 'Medium',   'Closed',   'Maya Patel',    5,  '#22',   '2025-10-13', '2025-10-24', NULL),
(4, 'API: rate limiting implementation',            'Task',  'High',     'Closed',   'Alex Rivera',   3,  NULL,    '2025-10-14', '2025-10-22', NULL),
(4, 'Bug: session timeout not invalidating tokens', 'Bug',   'High',     'Closed',   'Jordan Lee',    3,  '#23',   '2025-10-15', '2025-10-23', NULL),
(4, 'Tech debt: eliminate deprecated API calls',    'Task',  'Medium',   'Closed',   'Sam Torres',    3,  '#24',   '2025-10-14', '2025-10-21', NULL),
-- CRITICAL BUGS INTRODUCED IN SPRINT 4, NOT RESOLVED. Rolled to Sprint 5:
-- these Sprint 4 copies are Closed; the live copy of each is in Sprint 5.
(4, 'Bug: auth token refresh fails under load',     'Bug',   'Critical', 'Closed',   'Jordan Lee',    5,  '#25',   '2025-10-18', NULL,         'BLOCKER. Reproduced in staging. Affects all users after 30min sessions. Rolled to Sprint 5.'),
(4, 'Bug: dashboard load time regression post-fix', 'Bug',   'Critical', 'Closed',   'Alex Rivera',   3,  '#26',   '2025-10-20', NULL,         'BLOCKER. Fix in Sprint 3 introduced regression. 6-8s load on prod. Rolled to Sprint 5.'),
(4, 'Bug: data sync drops records batch >500',      'Bug',   'Critical', 'Closed',   'Sam Torres',    5,  '#27',   '2025-10-22', NULL,         'BLOCKER. Data integrity risk. Affects nightly sync job. Rolled to Sprint 5.'),
-- HIGH PRIORITY ITEMS ROLLED OVER
(4, 'User notification preferences: UI',            'Story', 'High',     'Closed',   'Maya Patel',    5,  '#28',   '2025-10-13', NULL,         'Rolled to Sprint 5. Blocked by API dependency.'),
(4, 'Performance: CDN configuration for assets',    'Task',  'High',     'Closed',   'Alex Rivera',   3,  '#29',   '2025-10-14', NULL,         'Rolled to Sprint 5.'),
(4, 'Bug: search indexing lag on new content',      'Bug',   'Medium',   'Closed',   'Sam Torres',    2,  '#30',   '2025-10-21', NULL,         'Rolled to Sprint 5.'),
(4, 'Accessibility: keyboard navigation fixes',     'Task',  'Medium',   'Closed',   'Maya Patel',    2,  NULL,    '2025-10-13', '2025-10-22', NULL);
GO

-- SPRINT 5 WORK ITEMS (18 items, current sprint - under pressure)
INSERT INTO WorkItems (SprintId, Title, Type, Priority, Status, AssignedTo, StoryPoints, GitHubIssueRef, CreatedDate, ResolvedDate, Notes)
VALUES
-- CRITICAL BLOCKERS (3 open, all blocking release)
(5, 'Bug: auth token refresh fails under load',     'Bug',   'Critical', 'Blocked',  'Jordan Lee',    5,  '#25',   '2025-10-18', NULL,         'BLOCKER. In investigation. Requires auth service refactor. No ETA.'),
(5, 'Bug: dashboard load time regression post-fix', 'Bug',   'Critical', 'Active',   'Alex Rivera',   3,  '#26',   '2025-10-20', NULL,         'BLOCKER. Root cause: inefficient aggregation query. Fix in review.'),
(5, 'Bug: data sync drops records batch >500',      'Bug',   'Critical', 'Active',   'Sam Torres',    5,  '#27',   '2025-10-22', NULL,         'BLOCKER. Batch size limit identified. Fix being tested in staging.'),
-- HIGH PRIORITY ACTIVE
(5, 'Performance: CDN configuration for assets',   'Task',  'High',     'Active',   'Alex Rivera',   3,  '#29',   '2025-10-14', NULL,         NULL),
(5, 'Bug: search indexing lag on new content',      'Bug',   'Medium',   'Active',   'Sam Torres',    2,  '#30',   '2025-10-21', NULL,         NULL),
-- STALLED FEATURE (12+ days no activity - correlates to GitHub #28)
(5, 'User notification preferences: UI',            'Story', 'High',     'Active',   'Maya Patel',    5,  '#28',   '2025-10-13', NULL,         'STALLED. No commits or updates in 12 days. Blocked by notification API instability.'),
-- NEW SPRINT 5 ITEMS
(5, 'Release: smoke test suite',                   'Task',  'High',     'Active',   'Jordan Lee',    3,  NULL,    '2025-10-27', NULL,         NULL),
(5, 'Release: rollback plan documentation',        'Task',  'High',     'New',      'Sam Torres',    2,  NULL,    '2025-10-27', NULL,         NULL),
(5, 'Performance: memory leak in WebSocket conn',  'Bug',   'High',     'Active',   'Alex Rivera',   3,  '#31',   '2025-10-28', NULL,         'Identified during load testing.'),
(5, 'Bug: notification badge count incorrect',     'Bug',   'Medium',   'New',      'Maya Patel',    2,  '#32',   '2025-10-29', NULL,         NULL),
(5, 'Tech debt: remove feature flags from v1',     'Task',  'Low',      'New',      'Jordan Lee',    2,  '#33',   '2025-10-27', NULL,         NULL),
(5, 'Documentation: release notes draft',         'Task',  'Medium',   'New',      'Sam Torres',    1,  NULL,    '2025-10-27', NULL,         NULL),
-- RESOLVED IN SPRINT 5 SO FAR (story points total 14, matching Sprints.CompletedPoints)
(5, 'Security: CSP header hardening',             'Task',  'High',     'Resolved', 'Alex Rivera',   3,  NULL,    '2025-10-27', '2025-10-30', NULL),
(5, 'Bug: incorrect timezone in report exports',  'Bug',   'Medium',   'Resolved', 'Maya Patel',    3,  '#34',   '2025-10-27', '2025-10-31', NULL),
(5, 'API: deprecate v1 endpoints',                'Task',  'Low',      'Resolved', 'Jordan Lee',    2,  NULL,    '2025-10-27', '2025-10-29', NULL),
(5, 'Dashboard: fix chart tooltip overflow',      'Bug',   'Low',      'Resolved', 'Sam Torres',    1,  '#35',   '2025-10-28', '2025-10-30', NULL),
(5, 'Performance: lazy load non-critical panels', 'Task',  'Medium',   'Resolved', 'Alex Rivera',   3,  NULL,    '2025-10-27', '2025-11-01', NULL),
(5, 'Accessibility: screen reader labels update', 'Task',  'Low',      'Resolved', 'Maya Patel',    2,  NULL,    '2025-10-27', '2025-10-30', NULL);
GO

-- ------------------------------------------------------------
-- 7. SEED DATA: HealthMetrics
-- 30 days of daily snapshots. Correlated to sprint state.
-- Key trend: ReleaseReadinessScore declining from 85 to 52.
-- BugCriticalCount hits 3 in Sprint 4 and holds through Sprint 5.
-- SprintCompletionRate matches story points: Sprint 4 ends at 75.00 (33/44),
-- Sprint 5 stands at 30.43 (14/46) on the latest snapshot.
-- ------------------------------------------------------------
INSERT INTO HealthMetrics (RecordedDate, SprintId, BugOpenCount, BugCriticalCount, SprintCompletionRate, VelocityTrend, BlockerCount, ReleaseReadinessScore, Notes)
VALUES
-- Sprint 3 tail (project still healthy)
('2025-10-06', 3, 2,  0, 62.00, 'Stable',   0, 85, 'Healthy. Performance audit in progress.'),
('2025-10-07', 3, 2,  0, 69.00, 'Stable',   0, 84, NULL),
('2025-10-08', 3, 3,  0, 75.00, 'Stable',   0, 83, NULL),
('2025-10-09', 3, 3,  0, 80.00, 'Stable',   0, 83, NULL),
('2025-10-10', 3, 4,  0, 84.44, 'Stable',   0, 82, 'Sprint 3 closed. 7 points rolled over. Dashboard perf issue flagged.'),
-- Sprint 4 start (pressure building)
('2025-10-13', 4, 5,  0, 0.00,  'Declining', 0, 80, 'Sprint 4 kickoff. Rollover items from Sprint 3 added.'),
('2025-10-14', 4, 5,  0, 7.50,  'Declining', 0, 79, NULL),
('2025-10-15', 4, 6,  0, 15.00, 'Declining', 0, 78, NULL),
('2025-10-16', 4, 5,  0, 22.50, 'Declining', 0, 78, NULL),
('2025-10-17', 4, 5,  0, 30.00, 'Declining', 0, 77, NULL),
('2025-10-20', 4, 4,  0, 37.50, 'Declining', 0, 76, 'Security findings partially resolved.'),
('2025-10-21', 4, 4,  0, 52.50, 'Declining', 0, 75, NULL),
('2025-10-22', 4, 4,  0, 60.00, 'Declining', 1, 72, 'Auth token bug introduced. First blocker of release cycle.'),
('2025-10-23', 4, 5,  1, 67.50, 'Declining', 1, 70, 'Dashboard regression confirmed. Critical count now 2.'),
('2025-10-24', 4, 7,  3, 75.00, 'Declining', 3, 65, 'Data sync bug confirmed. 3 critical blockers open. Sprint 4 closes with 11 pts rolled over.'),
-- Sprint 5 start (current sprint, high pressure)
('2025-10-27', 5, 9,  3, 0.00,  'Declining', 3, 62, 'Sprint 5 kickoff. 3 critical blockers carried in.'),
('2025-10-28', 5, 10, 3, 3.38,  'Declining', 3, 61, 'Memory leak identified. Bug count rising.'),
('2025-10-29', 5, 10, 3, 6.76,  'Declining', 3, 60, NULL),
('2025-10-30', 5, 9,  3, 10.14, 'Declining', 3, 59, 'Minor bugs resolved. Blockers unchanged.'),
('2025-10-31', 5, 9,  3, 13.52, 'Declining', 3, 58, NULL),
('2025-11-03', 5, 8,  3, 16.91, 'Declining', 3, 57, 'Auth bug investigation ongoing. No ETA.'),
('2025-11-04', 5, 8,  3, 20.29, 'Declining', 3, 56, NULL),
('2025-11-05', 5, 7,  3, 23.67, 'Declining', 3, 55, 'Dashboard fix in code review. Notification feature stalled 12 days.'),
('2025-11-06', 5, 7,  3, 27.05, 'Declining', 3, 54, NULL),
('2025-11-07', 5, 7,  3, 30.43, 'Declining', 3, 52, 'Latest snapshot. Release readiness critical. 3 blockers still open.');
GO

-- ------------------------------------------------------------
-- 7b. SEED DATA: ReleasePlan
-- 168 points completed across Sprints 1-5, 320 points remaining.
-- Narrative: at the current pace (33 pts/sprint) the release
-- misses 15 Feb 2027. It lands only if velocity recovers to
-- roughly 36-40 pts/sprint, which depends on clearing the three
-- critical blockers (#25, #26, #27).
-- ------------------------------------------------------------
INSERT INTO ReleasePlan (ReleaseName, TargetDate, TotalScopePoints, SprintLengthDays, Notes)
VALUES
('Orion 1.0', '2027-02-15', 488, 14, 'Customer-facing GA release. Date committed to customers; scope frozen.');
GO

-- ------------------------------------------------------------
-- 7c. SEED DATA: FeatureFlags
-- Forecast tool starts OFF. Flip it from the dashboard during
-- Demo Part 2.
-- ------------------------------------------------------------
INSERT INTO FeatureFlags (FlagName, IsEnabled, Description)
VALUES
('ForecastToolEnabled', 0, 'Exposes the get_release_forecast MCP tool when enabled.');
GO

-- ------------------------------------------------------------
-- 7d. ROLL DATES FORWARD
-- Shifts all seed dates so the latest HealthMetrics snapshot
-- (baseline 2025-11-07) lands on @AsOf. Default is today.
-- To rehearse against a specific day, set @AsOf explicitly,
-- e.g. DECLARE @AsOf DATE = '2026-10-13';
-- ReleasePlan.TargetDate is intentionally not shifted.
-- ------------------------------------------------------------
DECLARE @AsOf   DATE = CAST(GETDATE() AS DATE);
DECLARE @Offset INT  = DATEDIFF(day, '2025-11-07', @AsOf);

UPDATE Sprints
SET StartDate = DATEADD(day, @Offset, StartDate),
    EndDate   = DATEADD(day, @Offset, EndDate);

UPDATE WorkItems
SET CreatedDate  = DATEADD(day, @Offset, CreatedDate),
    ResolvedDate = DATEADD(day, @Offset, ResolvedDate);   -- NULL stays NULL

UPDATE HealthMetrics
SET RecordedDate = DATEADD(day, @Offset, RecordedDate);

PRINT CONCAT('Dates rolled forward by ', @Offset, ' days. Latest snapshot: ', CONVERT(VARCHAR(10), @AsOf, 23));
GO

-- ------------------------------------------------------------
-- 7e. STORED PROCEDURES (for the connector agent, Demo Part 1)
-- One procedure per MCP server tool, running the SAME query.
-- The connector agent calls these through the SQL Server
-- connector's "Execute stored procedure (V2)" action, one action
-- per procedure, each configured and described in the agent.
-- (Execute a SQL query (V2) is not supported through the
-- on-premises data gateway, so stored procedures are the route.)
-- Deliberately no forecast procedure: the forecast is the
-- server-side change shown in Demo Part 2.
-- ------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_get_current_sprint
AS
BEGIN
    SET NOCOUNT ON;
    SELECT SprintId, SprintName, StartDate, EndDate, Status,
           PlannedPoints, CompletedPoints, RolloverPoints, TeamVelocity, Notes
    FROM Sprints
    WHERE Status = 'Active';
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_get_sprint_history
AS
BEGIN
    SET NOCOUNT ON;
    SELECT SprintId, SprintName, StartDate, EndDate, Status,
           PlannedPoints, CompletedPoints, RolloverPoints, TeamVelocity, Notes
    FROM Sprints
    WHERE Status = 'Completed'
    ORDER BY SprintId ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_get_critical_work_items
AS
BEGIN
    SET NOCOUNT ON;
    SELECT w.WorkItemId, w.SprintId, s.SprintName, w.Title, w.Type, w.Priority, w.Status,
           w.AssignedTo, w.StoryPoints, w.GitHubIssueRef, w.CreatedDate, w.ResolvedDate, w.Notes
    FROM WorkItems w
    INNER JOIN Sprints s ON w.SprintId = s.SprintId
    WHERE w.Priority IN ('Critical', 'High')
      AND w.Status NOT IN ('Resolved', 'Closed')
    ORDER BY
      CASE w.Priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 END,
      CASE w.Status WHEN 'Blocked' THEN 1 ELSE 2 END,
      w.CreatedDate ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_get_work_items_by_sprint
    @sprint_id INT,
    @status    NVARCHAR(20) = NULL   -- New | Active | Resolved | Closed | Blocked
AS
BEGIN
    SET NOCOUNT ON;
    SELECT w.WorkItemId, w.SprintId, s.SprintName, w.Title, w.Type, w.Priority, w.Status,
           w.AssignedTo, w.StoryPoints, w.GitHubIssueRef, w.CreatedDate, w.ResolvedDate, w.Notes
    FROM WorkItems w
    INNER JOIN Sprints s ON w.SprintId = s.SprintId
    WHERE w.SprintId = @sprint_id
      AND (@status IS NULL OR w.Status = @status)
    ORDER BY w.Priority, w.CreatedDate ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_get_stalled_work_items
    @stale_days INT = 7
AS
BEGIN
    SET NOCOUNT ON;
    SELECT w.WorkItemId, w.SprintId, s.SprintName, w.Title, w.Type, w.Priority, w.Status,
           w.AssignedTo, w.StoryPoints, w.GitHubIssueRef, w.CreatedDate, w.ResolvedDate, w.Notes
    FROM WorkItems w
    INNER JOIN Sprints s ON w.SprintId = s.SprintId
    WHERE w.Status IN ('Active', 'New')
      AND w.CreatedDate <= DATEADD(day, -@stale_days, GETDATE())
      AND w.ResolvedDate IS NULL
    ORDER BY w.CreatedDate ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_get_latest_health_metrics
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 h.MetricId, h.RecordedDate, h.SprintId, s.SprintName,
           h.BugOpenCount, h.BugCriticalCount, h.SprintCompletionRate, h.VelocityTrend,
           h.BlockerCount, h.ReleaseReadinessScore, h.Notes
    FROM HealthMetrics h
    INNER JOIN Sprints s ON h.SprintId = s.SprintId
    ORDER BY h.RecordedDate DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_get_health_metrics_trend
    @days INT = 14
AS
BEGIN
    SET NOCOUNT ON;
    SELECT h.MetricId, h.RecordedDate, h.SprintId, s.SprintName,
           h.BugOpenCount, h.BugCriticalCount, h.SprintCompletionRate, h.VelocityTrend,
           h.BlockerCount, h.ReleaseReadinessScore, h.Notes
    FROM HealthMetrics h
    INNER JOIN Sprints s ON h.SprintId = s.SprintId
    WHERE h.RecordedDate >= DATEADD(day, -@days, GETDATE())
    ORDER BY h.RecordedDate ASC;
END
GO

-- ------------------------------------------------------------
-- 8. VERIFICATION QUERIES
-- Run these to confirm data loaded correctly.
-- ------------------------------------------------------------

-- Sprint summary
SELECT
    SprintId,
    SprintName,
    Status,
    PlannedPoints,
    CompletedPoints,
    RolloverPoints,
    TeamVelocity
FROM Sprints
ORDER BY SprintId;

-- Work item counts by sprint and status
SELECT
    s.SprintName,
    wi.Status,
    COUNT(*) AS ItemCount
FROM WorkItems wi
JOIN Sprints s ON wi.SprintId = s.SprintId
GROUP BY s.SprintName, wi.Status, s.SprintId
ORDER BY s.SprintId, wi.Status;

-- Current critical blockers (the demo money shot)
SELECT
    wi.Title,
    wi.Type,
    wi.Priority,
    wi.Status,
    wi.AssignedTo,
    wi.GitHubIssueRef,
    wi.Notes
FROM WorkItems wi
WHERE wi.Priority = 'Critical'
  AND wi.Status IN ('Active', 'Blocked')
  AND wi.SprintId = 5
ORDER BY wi.WorkItemId;

-- Latest health metric snapshot
SELECT TOP 1 *
FROM HealthMetrics
ORDER BY RecordedDate DESC;

-- Release readiness trend (last 10 days)
SELECT
    RecordedDate,
    ReleaseReadinessScore,
    BugCriticalCount,
    BlockerCount,
    VelocityTrend
FROM HealthMetrics
ORDER BY RecordedDate DESC
OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;

-- Release forecast (same logic as the get_release_forecast tool)
-- Expected: 320 points remaining, 8 or 9 sprints left depending on
-- run date, projected shortfall at current pace (33 pts/sprint).
;WITH Done AS (
    SELECT SUM(CompletedPoints) AS CompletedToDate FROM Sprints
),
Pace AS (
    SELECT
        (SELECT TOP 1 TeamVelocity FROM Sprints WHERE Status = 'Completed' ORDER BY SprintId DESC) AS CurrentVelocity,
        (SELECT AVG(TeamVelocity) FROM (SELECT TOP 3 TeamVelocity FROM Sprints WHERE Status = 'Completed' ORDER BY SprintId DESC) t) AS Avg3Velocity,
        (SELECT EndDate FROM Sprints WHERE Status = 'Active') AS CurrentSprintEnd
)
SELECT
    r.ReleaseName,
    r.TargetDate,
    r.TotalScopePoints - d.CompletedToDate                                    AS RemainingPoints,
    DATEDIFF(day, p.CurrentSprintEnd, r.TargetDate) / r.SprintLengthDays      AS SprintsRemaining,
    p.CurrentVelocity,
    p.Avg3Velocity,
    p.CurrentVelocity * (DATEDIFF(day, p.CurrentSprintEnd, r.TargetDate) / r.SprintLengthDays) AS ProjectedPointsAtCurrentPace
FROM ReleasePlan r CROSS JOIN Done d CROSS JOIN Pace p;

-- Feature flag state (should be 0 before the demo)
SELECT FlagName, IsEnabled FROM FeatureFlags;

-- Stored procedures for the connector agent (expect 7)
SELECT name FROM sys.procedures WHERE name LIKE 'usp[_]get[_]%' ORDER BY name;

GO

-- ============================================================
-- CORRELATION MAP: SQL <-> GITHUB ISSUES
-- Use this during demo prep to align your narrative.
-- ============================================================
--
-- SQL Critical Bugs (WorkItems, Sprint 5)     GitHub Issue
-- -------------------------------------------+--------------
-- Auth token refresh fails under load         #25
-- Dashboard load time regression              #26
-- Data sync drops records batch >500          #27
--
-- SQL Stalled Feature (WorkItems, Sprint 5)   GitHub Issue
-- -------------------------------------------+--------------
-- User notification preferences: UI           #28
-- (No activity in 12+ days, maps to GitHub
--  issue #28 with no recent commits)
--
-- SQL Performance Theme                        GitHub Issues
-- -------------------------------------------+--------------
-- Dashboard load >4s (Sprint 3 rollover)       #18
-- Dashboard regression (Sprint 5 blocker)      #26
-- CDN configuration                            #29
-- Memory leak in WebSocket                     #31
-- Lazy load panels (resolved Sprint 5)         N/A
-- (Performance issues appear across 5+
--  GitHub issues, reinforcing the pattern
--  the agent will surface in the demo)
--
-- SQL VelocityTrend decline                    GitHub Issues
-- -------------------------------------------+--------------
-- Declining since Sprint 3                    #18 (perf audit
--   -> Sprint 4 critical bugs introduced       triggered decline)
--   -> Sprint 5 stalled feature + blockers    #25, #26, #27, #28
--
-- ============================================================
-- CONNECTION STRING REFERENCE
-- ============================================================
-- Local (demo):
--   Server=localhost;Database=ProjectOrion;
--   Trusted_Connection=True;TrustServerCertificate=True;
--
-- Azure SQL (production story):
--   Server=<your-server>.database.windows.net;
--   Database=ProjectOrion;
--   User Id=<username>;Password=<password>;
--   Encrypt=True;TrustServerCertificate=False;
-- ============================================================