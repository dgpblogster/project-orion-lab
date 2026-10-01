#!/bin/bash
# ============================================================
# PROJECT ORION: GITHUB ISSUES CREATION SCRIPT
# ============================================================
# Prerequisites:
#   1. GitHub CLI installed: https://cli.github.com
#   2. Authenticated: gh auth login
#   3. Repo created: update REPO below before running
#
# Usage:
#   chmod +x create-github-issues.sh
#   ./create-github-issues.sh
#
# Notes:
#   - Issues are created in order (#1 to #35)
#   - Closed issues are created then immediately closed
#   - Labels are created first to avoid errors
#   - GitHubIssueRef in SQL seed data maps to these issue numbers
#   - Run this ONCE against a fresh repo
# ============================================================

REPO="dgpblogster/project-orion"   # <-- UPDATE THIS before running
# No assignees - personal account

echo "============================================================"
echo " PROJECT ORION: Creating Repository and GitHub Issues"
echo " Repo: $REPO"
echo "============================================================"

# ------------------------------------------------------------
# STEP 0: CREATE REPOSITORY
# ------------------------------------------------------------
echo ""
echo "[0/4] Creating repository..."

gh repo create project-orion \
  --public \
  --description "Project Orion: Enterprise customer-facing web application" \
  --confirm

echo "Repository created: https://github.com/$REPO"

# ------------------------------------------------------------
# STEP 1: CREATE LABELS
# ------------------------------------------------------------
echo ""
echo "[1/4] Creating labels..."

gh label create "enhancement"  --color "84b6eb" --description "New feature or improvement"          --repo $REPO --force
gh label create "bug"          --color "d73a4a" --description "Something is not working"             --repo $REPO --force
gh label create "critical"     --color "b60205" --description "Critical priority, blocks release"    --repo $REPO --force
gh label create "minor"        --color "e4e669" --description "Low impact bug"                       --repo $REPO --force
gh label create "in-progress"  --color "0075ca" --description "Currently being worked on"            --repo $REPO --force
gh label create "tech-debt"    --color "cfd3d7" --description "Technical debt item"                  --repo $REPO --force
gh label create "docs"         --color "0075ca" --description "Documentation update"                 --repo $REPO --force
gh label create "performance"  --color "e99695" --description "Performance related"                  --repo $REPO --force
gh label create "security"     --color "b60205" --description "Security related"                     --repo $REPO --force
gh label create "blocked"      --color "b60205" --description "Blocked, cannot proceed"              --repo $REPO --force
gh label create "stale"        --color "cfd3d7" --description "No activity for 12+ days"             --repo $REPO --force

echo "Labels created."

# ------------------------------------------------------------
# STEP 2: CREATE ISSUES
# Note: GitHub issues auto-increment. Creating in order gives
# us #1 through #35 matching the SQL GitHubIssueRef values.
# ------------------------------------------------------------
echo ""
echo "[2/4] Creating issues..."

# ----------------------------------------------------------
# SPRINT 1 ISSUES (#1 - #3): Closed, healthy
# ----------------------------------------------------------

# #1
gh issue create \
  --repo "$REPO" \
  --title "Design system component library" \
  --body "## Summary
Establish the core component library for Project Orion's UI layer. This includes buttons, inputs, modals, cards, and typography tokens to ensure visual consistency across all features.

## Acceptance Criteria
- [ ] Component library initialized (Storybook or equivalent)
- [ ] Core components: Button, Input, Modal, Card, Badge, Alert
- [ ] Typography and color tokens defined
- [ ] README with usage examples

## Notes
Foundation for all UI work in subsequent sprints. Prioritize accessibility (ARIA labels, keyboard nav) from the start." \
  --label "enhancement" \

gh issue close 1 --repo "$REPO" --comment "Component library shipped in Sprint 1. All core components delivered and documented."

# #2
gh issue create \
  --repo "$REPO" \
  --title "User authentication: login flow" \
  --body "## Summary
Implement the end-to-end login flow including email/password authentication, JWT token issuance, and session management.

## Acceptance Criteria
- [ ] Login page with email/password fields
- [ ] JWT issued on successful authentication
- [ ] Token stored securely (httpOnly cookie)
- [ ] Redirect to dashboard on success
- [ ] Error handling: invalid credentials, account locked
- [ ] Rate limiting on login endpoint

## Notes
Critical path item. All authenticated routes depend on this." \
  --label "enhancement,in-progress" \

gh issue close 2 --repo "$REPO" --comment "Login flow complete. JWT auth, session management, and rate limiting all shipped."

# #3
gh issue create \
  --repo "$REPO" \
  --title "Dashboard layout: skeleton" \
  --body "## Summary
Build the responsive dashboard shell: navigation, sidebar, header, and main content area. No data panels yet, just the structural layout.

## Acceptance Criteria
- [ ] Responsive grid layout (desktop + tablet)
- [ ] Navigation sidebar with route placeholders
- [ ] Header with user avatar and logout
- [ ] Main content area with panel slots
- [ ] Loading skeleton states

## Notes
Unblocks all dashboard feature work in Sprint 2+." \
  --label "enhancement" \

gh issue close 3 --repo "$REPO" --comment "Dashboard skeleton shipped. Responsive layout verified on desktop and tablet breakpoints."

# ----------------------------------------------------------
# SPRINT 2 ISSUES (#4 - #9): Closed, peak velocity
# ----------------------------------------------------------

# #4
gh issue create \
  --repo "$REPO" \
  --title "User profile: edit and update" \
  --body "## Summary
Allow users to view and edit their profile information including name, email, avatar, and notification preferences.

## Acceptance Criteria
- [ ] Profile view page
- [ ] Edit form with validation
- [ ] Avatar upload (max 2MB, jpg/png)
- [ ] Email change requires re-verification
- [ ] Success/error toast notifications

## Notes
Avatar upload size limit enforced at API layer, not just frontend." \
  --label "enhancement" \

gh issue close 4 --repo "$REPO" --comment "User profile edit shipped. Avatar upload, email verification, and notification prefs all working."

# #5
gh issue create \
  --repo "$REPO" \
  --title "Dashboard: metrics panels v1" \
  --body "## Summary
Implement the first version of dashboard metrics panels. Static data for now, real-time in v2.

## Panels to implement:
- Summary card: total users, active sessions
- Recent activity feed
- Quick stats: requests/day, error rate
- Placeholder panels for Sprint 3 features

## Acceptance Criteria
- [ ] Four panels rendered on dashboard
- [ ] Data from API (polling, not WebSocket yet)
- [ ] Empty states handled gracefully
- [ ] Responsive on all breakpoints" \
  --label "enhancement" \

gh issue close 5 --repo "$REPO" --comment "Dashboard metrics v1 shipped. Polling-based data, four panels, empty states handled."

# #6
gh issue create \
  --repo "$REPO" \
  --title "Search: basic full-text implementation" \
  --body "## Summary
Implement full-text search across users, documents, and activity records.

## Acceptance Criteria
- [ ] Search bar in header (global)
- [ ] Results page with type-grouped results
- [ ] Minimum 3 characters to trigger search
- [ ] Debounced input (300ms)
- [ ] Result count displayed
- [ ] No results state handled

## Notes
Advanced filters scoped to Sprint 3 (#12)." \
  --label "enhancement" \

gh issue close 6 --repo "$REPO" --comment "Basic full-text search shipped. Advanced filters tracked in #12."

# #7
gh issue create \
  --repo "$REPO" \
  --title "Role-based access control: admin vs user" \
  --body "## Summary
Implement RBAC with two roles: admin and standard user. Admins have access to user management, audit logs, and system settings.

## Acceptance Criteria
- [ ] Role assigned at user creation
- [ ] Route guards on admin-only pages
- [ ] API middleware enforces role on all endpoints
- [ ] Admin panel: user list, role assignment
- [ ] Audit log: admin actions recorded

## Notes
Critical path. Several Sprint 3 features depend on admin panel being available." \
  --label "enhancement,in-progress" \

gh issue close 7 --repo "$REPO" --comment "RBAC shipped. Admin and user roles enforced at both route and API level."

# #8
gh issue create \
  --repo "$REPO" \
  --title "Export: CSV download for reports" \
  --body "## Summary
Allow users to export report data as CSV from the dashboard.

## Acceptance Criteria
- [ ] Export button on report panels
- [ ] CSV generated server-side
- [ ] File named with report type and date
- [ ] Large exports handled asynchronously (>1000 rows)
- [ ] Download link emailed for async exports

## Notes
Scheduled report delivery tracked separately in #19." \
  --label "enhancement" \

gh issue close 8 --repo "$REPO" --comment "CSV export shipped. Async handling for large exports working via email delivery."

# #9
gh issue create \
  --repo "$REPO" \
  --title "Bug: login redirect loop on token expiry" \
  --body "## Summary
Users are experiencing an infinite redirect loop when their JWT token expires mid-session. The app attempts to redirect to login, but the expired token check re-triggers the redirect before the login page loads.

## Steps to Reproduce
1. Log in and remain idle for 60+ minutes
2. Attempt any authenticated action
3. Observe: page enters redirect loop, browser shows 'too many redirects'

## Expected Behavior
Token expiry should redirect cleanly to login page with a session expired message.

## Root Cause
Token refresh check runs before route guard clears the expired token from storage." \
  --label "bug" \

gh issue close 9 --repo "$REPO" --comment "Fixed. Route guard now clears expired token before redirect. Verified no loop on expiry."

# ----------------------------------------------------------
# SPRINT 3 ISSUES (#10 - #20): Mix of closed and rollovers
# ----------------------------------------------------------

# #10
gh issue create \
  --repo "$REPO" \
  --title "Dashboard: metrics panels v2 (real-time)" \
  --body "## Summary
Upgrade dashboard panels from polling to real-time WebSocket updates.

## Acceptance Criteria
- [ ] WebSocket connection established on dashboard load
- [ ] Panels update without page refresh
- [ ] Graceful fallback to polling if WebSocket unavailable
- [ ] Connection status indicator in header
- [ ] Reconnect logic on disconnect

## Notes
Depends on #5 (v1) being stable." \
  --label "enhancement" \

gh issue close 10 --repo "$REPO" --comment "Real-time dashboard shipped. WebSocket with polling fallback. Memory leak in WebSocket connections flagged in #31 for Sprint 5."

# #11
gh issue create \
  --repo "$REPO" \
  --title "Notifications: email delivery integration" \
  --body "## Summary
Integrate transactional email delivery for system notifications using SendGrid.

## Acceptance Criteria
- [ ] SendGrid integration configured
- [ ] Welcome email on user registration
- [ ] Password reset email flow
- [ ] Notification digest email (daily/weekly)
- [ ] Unsubscribe link in all emails
- [ ] Email templates match design system

## Notes
In-app notification banner tracked in #16. Push notifications in #21." \
  --label "enhancement" \

gh issue close 11 --repo "$REPO" --comment "Email delivery integration shipped via SendGrid. All transactional emails tested."

# #12
gh issue create \
  --repo "$REPO" \
  --title "Search: advanced filters" \
  --body "## Summary
Add advanced filter capabilities to the search results page.

## Filters to implement:
- Date range
- Content type (user, document, activity)
- Status (active, archived)
- Author/owner

## Acceptance Criteria
- [ ] Filter panel on search results page
- [ ] Filters applied client-side for small result sets
- [ ] Filters passed as query params (shareable URLs)
- [ ] Active filters shown as dismissible chips
- [ ] Clear all filters option

## Notes
Depends on #6 (basic search) being stable." \
  --label "enhancement" \

gh issue close 12 --repo "$REPO" --comment "Advanced filters shipped. Date range, type, status, and author filters all working. URLs shareable."

# #13
gh issue create \
  --repo "$REPO" \
  --title "Performance: API response time audit" \
  --body "## Summary
Conduct a full audit of API endpoint response times under realistic load. Identify and document any endpoints exceeding 500ms p95.

## Scope
- All authenticated endpoints
- Load simulation: 50 concurrent users
- Test environment: staging

## Findings
Dashboard /api/metrics endpoint showing 4.2s p95 under load. Root cause: N+1 query pattern in metrics aggregation. Tracked in #18.

All other endpoints within acceptable thresholds." \
  --label "performance" \

gh issue close 13 --repo "$REPO" --comment "Audit complete. One critical finding: dashboard metrics N+1 query. Tracked in #18."

# #14
gh issue create \
  --repo "$REPO" \
  --title "Bug: profile image upload fails for files larger than 2MB" \
  --body "## Summary
Profile image uploads fail silently for files larger than 2MB. The user sees a spinner that never resolves, with no error message displayed.

## Steps to Reproduce
1. Navigate to profile edit page
2. Attempt to upload an image >2MB
3. Observe: spinner, no error, no upload

## Expected Behavior
Clear error message: 'Image must be under 2MB. Please resize and try again.'

## Root Cause
API returns 413 but frontend error handler doesn't catch it. Silent failure." \
  --label "bug,minor" \

gh issue close 14 --repo "$REPO" --comment "Fixed. Frontend now catches 413 and displays appropriate error message."

# #15
gh issue create \
  --repo "$REPO" \
  --title "Bug: search returns stale cache results" \
  --body "## Summary
Search results are returning stale data up to 15 minutes after records are updated or deleted. Users searching for recently modified content see outdated results.

## Steps to Reproduce
1. Update a user record or document
2. Search for the updated record within 15 minutes
3. Observe: old values returned in results

## Expected Behavior
Search results should reflect the current state of records within 60 seconds.

## Root Cause
Search index cache TTL set to 15 minutes. Should be 60 seconds for user-facing data." \
  --label "bug" \

gh issue close 15 --repo "$REPO" --comment "Fixed. Cache TTL reduced to 60 seconds. Search index invalidation on write also implemented."

# #16
gh issue create \
  --repo "$REPO" \
  --title "User notifications: in-app banner" \
  --body "## Summary
Implement an in-app notification banner system for real-time alerts to users.

## Notification types:
- System alerts (maintenance, degraded service)
- User-specific alerts (profile update, password change)
- Admin broadcasts

## Acceptance Criteria
- [ ] Banner appears at top of page
- [ ] Dismiss button per notification
- [ ] Max 3 banners visible at once
- [ ] Notifications persist until dismissed
- [ ] Admin broadcast interface

## Notes
Email notifications in #11. Push notifications in #21." \
  --label "enhancement" \

gh issue close 16 --repo "$REPO" --comment "In-app notification banner shipped. Dismiss, stacking, and admin broadcast all working."

# #17
gh issue create \
  --repo "$REPO" \
  --title "Tech debt: refactor auth token handling" \
  --body "## Summary
The current auth token handling is spread across three separate middleware layers with inconsistent refresh logic. This needs consolidation before Sprint 4 security work.

## Problems
- Token refresh logic duplicated in api-client.ts, auth-middleware.ts, and session-service.ts
- No centralized token expiry handling (see #9 for a symptom)
- Refresh race condition possible under concurrent requests

## Proposed Solution
Centralize all token logic in a single AuthService class. All middleware delegates to it.

## Notes
This refactor is blocking clean resolution of the auth token refresh bug discovered in Sprint 4 (#25)." \
  --label "tech-debt" \

gh issue close 17 --repo "$REPO" --comment "Auth token handling refactored into centralized AuthService. Refresh race condition resolved. Note: Sprint 4 load testing revealed a new failure mode under high concurrency tracked in #25."

# #18
gh issue create \
  --repo "$REPO" \
  --title "Performance: dashboard load time exceeds 4s on production" \
  --body "## Summary
Dashboard metrics endpoint (/api/metrics) is taking 4-8 seconds to respond under production load. This was identified during the Sprint 3 performance audit (#13).

## Symptoms
- p95 response time: 4.2s (staging), 6.1s (production)
- CPU spike on database server during dashboard load
- Multiple users loading dashboard simultaneously makes it worse

## Root Cause
N+1 query pattern in MetricsAggregationService. For each user session, the service issues individual queries instead of a single aggregated query.

## Proposed Fix
Replace individual queries with a single aggregated SQL query using window functions. Add a composite index on (userId, createdAt).

## Impact
Affects all users on every dashboard load. High visibility issue." \
  --label "bug,performance,in-progress" \

gh issue close 18 --repo "$REPO" --comment "Partial fix shipped in Sprint 4. N+1 query resolved, composite index added. Load time reduced from 6.1s to 2.1s on production. However, a regression was introduced post-fix and is tracked in #26."

# #19
gh issue create \
  --repo "$REPO" \
  --title "Data export: scheduled report delivery" \
  --body "## Summary
Allow users to schedule automated report exports delivered via email on a daily or weekly cadence.

## Acceptance Criteria
- [ ] Schedule configuration UI (frequency, time, format)
- [ ] Background job processes scheduled exports
- [ ] Email delivery with attached CSV
- [ ] Pause/resume/delete schedule
- [ ] Execution history log

## Notes
One-time CSV export already shipped in #8. This adds scheduling on top." \
  --label "enhancement" \

gh issue close 19 --repo "$REPO" --comment "Scheduled report delivery shipped. Daily/weekly cadence, email delivery, and history log all working."

# #20
gh issue create \
  --repo "$REPO" \
  --title "Mobile: offline mode basic support" \
  --body "## Summary
Implement basic offline support so users can view recently loaded dashboard data when network connectivity is lost.

## Acceptance Criteria
- [ ] Service worker caches last dashboard state
- [ ] Offline indicator banner shown
- [ ] Read-only access to cached data
- [ ] Auto-sync on reconnect

## Notes
Descoped from Sprint 3 due to complexity. Moved to backlog pending prioritization in Q1 planning." \
  --label "enhancement" \


# #20 stays open (descoped to backlog)
echo "Issue #20 created and left open (descoped to backlog)."

# ----------------------------------------------------------
# SPRINT 4 ISSUES (#21 - #24): Closed
# ----------------------------------------------------------

# #21
gh issue create \
  --repo "$REPO" \
  --title "Notifications: push notification support" \
  --body "## Summary
Extend the notification system to support browser push notifications for real-time alerts.

## Acceptance Criteria
- [ ] Web Push API integration
- [ ] Permission request flow (non-intrusive)
- [ ] Notification preferences: enable/disable push
- [ ] Push triggers: new message, system alert, task assigned
- [ ] Works on Chrome, Firefox, Edge, Safari

## Notes
In-app banner in #16. Email delivery in #11. This completes the notification triad." \
  --label "enhancement" \

gh issue close 21 --repo "$REPO" --comment "Push notifications shipped. All three browsers tested. Permission flow UX reviewed and approved."

# #22
gh issue create \
  --repo "$REPO" \
  --title "Dashboard: user activity heatmap" \
  --body "## Summary
Add a user activity heatmap panel to the dashboard showing activity patterns by hour and day of week.

## Acceptance Criteria
- [ ] Heatmap visualization (7 days x 24 hours grid)
- [ ] Color intensity based on activity volume
- [ ] Tooltip showing exact count on hover
- [ ] Time zone aware (user's local time)
- [ ] Date range selector (last 7, 30, 90 days)

## Notes
Uses existing activity event data. No new API endpoints required." \
  --label "enhancement" \

gh issue close 22 --repo "$REPO" --comment "Activity heatmap shipped. Time zone handling and date range selector both working."

# #23
gh issue create \
  --repo "$REPO" \
  --title "Bug: session timeout not invalidating tokens on server" \
  --body "## Summary
When a user's session times out on the client, the JWT token is not being invalidated server-side. An attacker with access to the token can continue making authenticated API calls indefinitely.

## Steps to Reproduce
1. Log in and capture JWT token
2. Wait for session timeout (client-side logout)
3. Use captured token to call authenticated API endpoint
4. Observe: API returns 200, not 401

## Expected Behavior
On session timeout, token should be added to server-side blocklist and all subsequent requests rejected with 401.

## Security Impact
HIGH. Active exploitation would require token interception, but this represents a meaningful security gap." \
  --label "bug,security" \

gh issue close 23 --repo "$REPO" --comment "Fixed. Token blocklist implemented using Redis. Server-side invalidation on timeout and explicit logout both working."

# #24
gh issue create \
  --repo "$REPO" \
  --title "Tech debt: eliminate deprecated API calls" \
  --body "## Summary
Several components still reference v1 API endpoints that are marked for deprecation. These need to be migrated to v2 before the v1 endpoints are removed at release.

## Affected Components
- UserProfileCard: uses /api/v1/users/:id
- ActivityFeed: uses /api/v1/activity
- NotificationBadge: uses /api/v1/notifications/count

## Acceptance Criteria
- [ ] All three components migrated to v2 endpoints
- [ ] v1 calls removed from codebase
- [ ] Regression tests pass
- [ ] No v1 references in client code

## Notes
v1 endpoints will be formally deprecated in Sprint 5 (#33)." \
  --label "tech-debt" \

gh issue close 24 --repo "$REPO" --comment "All v1 API references removed. Three components migrated to v2 endpoints."

# ----------------------------------------------------------
# SPRINT 4/5 CRITICAL BLOCKERS (#25 - #27): OPEN
# These are the three issues blocking release.
# Correlated to SQL HealthMetrics BugCriticalCount = 3.
# ----------------------------------------------------------

# #25 - CRITICAL BLOCKER
gh issue create \
  --repo "$REPO" \
  --title "Bug: auth token refresh fails under concurrent load" \
  --body "## Summary
JWT token refresh is failing intermittently when multiple requests are made simultaneously with an expiring token. Users are being logged out unexpectedly during active sessions.

## Steps to Reproduce
1. Simulate 5+ concurrent API requests with a token within 60 seconds of expiry
2. Observe: some requests return 401, user session terminated
3. Consistent reproduction at >50 concurrent users in load test

## Expected Behavior
Token refresh should be handled atomically. Only one refresh request should fire; all concurrent requests should queue and use the refreshed token.

## Root Cause (Identified)
Race condition in AuthService.refreshToken(). Multiple concurrent requests each detect the expiring token and attempt simultaneous refresh. Server issues multiple new tokens; only the last one is valid. Earlier requests get logged out.

## Impact
CRITICAL. Affects all users in active sessions under normal production load. Reproduced consistently in staging.

## Status
In active investigation. Proposed fix: mutex lock on refresh operation with request queuing. Implementation in progress but requires load test validation before merge.

## Linked SQL Record
Correlates to WorkItems.WorkItemId for Sprint 5 critical blocker: 'auth token refresh fails under load'" \
  --label "bug,critical,blocked,in-progress" \


# #26 - CRITICAL BLOCKER
gh issue create \
  --repo "$REPO" \
  --title "Bug: dashboard load time regression after performance fix" \
  --body "## Summary
The Sprint 4 fix for #18 (N+1 query) resolved the original slow query but introduced a new performance regression. Dashboard load time on production has increased from the pre-fix baseline of 1.8s to 6-8s.

## Timeline
- Sprint 3: Dashboard load identified as slow (4-8s) due to N+1 query (#18)
- Sprint 4: N+1 query fixed, load time drops to ~2s
- Sprint 4 (post-fix): New regression observed within 48 hours. Load time back to 6-8s.

## Root Cause (Identified)
The new aggregated query introduced in the fix performs a full table scan on the events table (47M rows) because the query planner is not using the composite index due to a parameter sniffing issue.

## Proposed Fix
Force index hint on the aggregation query. Alternatively, pre-aggregate into a summary table updated via background job.

## Impact
CRITICAL. Every dashboard load takes 6-8s. Directly impacts all users. Release blocked.

## Status
Fix in code review. Requires staging validation and load test before production deploy." \
  --label "bug,critical,in-progress,performance" \


# #27 - CRITICAL BLOCKER
gh issue create \
  --repo "$REPO" \
  --title "Bug: data sync job drops records when batch size exceeds 500" \
  --body "## Summary
The nightly data sync job silently drops records when processing batches larger than 500 items. Affected records are not retried and no error is raised. Data loss is occurring in production.

## Steps to Reproduce
1. Queue a sync job with >500 records
2. Monitor sync job execution logs
3. Observe: first 500 records processed, remainder silently dropped

## Expected Behavior
All records should be processed. If batch size limits are required, batches should be split automatically. Any failures should be logged and retried.

## Root Cause (Identified)
Underlying message queue has a 500-item payload limit. The sync service assumes unlimited batch size and does not implement batching or retry logic.

## Impact
CRITICAL. Data integrity risk. Nightly sync has been silently dropping records for an unknown period. Audit of affected records in progress.

## Status
Fix being tested in staging. Batch splitting implemented (100 records/batch). Retry logic with exponential backoff added. Requires data audit before production deploy to identify affected records." \
  --label "bug,critical,in-progress" \


# ----------------------------------------------------------
# SPRINT 5 ACTIVE ISSUES (#28 - #33)
# ----------------------------------------------------------

# #28 - STALLED (12 days no activity)
gh issue create \
  --repo "$REPO" \
  --title "User notification preferences: UI" \
  --body "## Summary
Build the notification preferences UI allowing users to configure which notifications they receive and via which channel (in-app, email, push).

## Acceptance Criteria
- [ ] Preferences page under account settings
- [ ] Toggle per notification type per channel
- [ ] Changes saved immediately (no save button)
- [ ] Default preferences applied on new account creation
- [ ] Preferences respected by all notification channels

## Dependencies
Blocked by instability in the notification API introduced alongside the push notification work in Sprint 4 (#21). API returns inconsistent responses under load, making the preferences UI non-deterministic.

## Status
Development started at the beginning of Sprint 4. No commits or updates in the last 12+ days due to API dependency blocker. Waiting on notification API stabilization before resuming.

## Notes
This feature is visible in the sprint but has been effectively stalled for 12 days. Tied to the declining sprint completion rate visible in project health metrics." \
  --label "enhancement,in-progress,blocked" \


# #29
gh issue create \
  --repo "$REPO" \
  --title "Performance: CDN configuration for static assets" \
  --body "## Summary
Configure CDN (Azure Front Door) for all static assets to reduce load times for geographically distributed users.

## Assets to CDN-enable
- JavaScript bundles
- CSS files
- Image assets
- Font files

## Acceptance Criteria
- [ ] Azure Front Door configured for static asset origin
- [ ] Cache-Control headers set appropriately per asset type
- [ ] Cache busting via content hash in filenames
- [ ] Performance baseline vs. CDN comparison documented
- [ ] Rollback plan documented

## Expected Impact
Estimated 40-60% reduction in asset load time for users outside primary region." \
  --label "performance,in-progress" \


# #30
gh issue create \
  --repo "$REPO" \
  --title "Bug: search index has up to 3-minute lag on newly created content" \
  --body "## Summary
Content created or updated in the last 3 minutes does not appear in search results. Users creating new records and immediately searching for them cannot find them.

## Steps to Reproduce
1. Create a new user record or document
2. Immediately search for it by name
3. Observe: no results returned
4. Wait 3 minutes and search again
5. Observe: record now appears

## Expected Behavior
New content should be searchable within 30 seconds of creation.

## Root Cause
Search index update job runs on a 3-minute cron interval. Should use event-driven indexing triggered on write operations.

## Proposed Fix
Replace cron-based indexing with write-triggered index updates via message queue." \
  --label "bug,in-progress" \


# #31
gh issue create \
  --repo "$REPO" \
  --title "Performance: memory leak in WebSocket connection handling" \
  --body "## Summary
Memory usage on the application server increases steadily over time, correlating with WebSocket connection churn. The server requires a restart every ~18 hours to prevent OOM.

## Symptoms
- Memory baseline: 512MB on startup
- Memory after 18 hours: ~3.8GB
- Leak rate: ~180MB/hour under normal load
- No memory increase when WebSocket connections disabled

## Root Cause (Suspected)
Event listeners registered on WebSocket connect are not being cleaned up on disconnect. Each disconnected socket leaves dangling listeners attached to the EventEmitter.

## Reproduction
Simulate 200 WebSocket connect/disconnect cycles. Monitor heap using clinic.js or Node.js --inspect.

## Impact
High. Server requires scheduled restart to stay operational. Risk of OOM crash during high-traffic periods." \
  --label "bug,performance,in-progress" \


# #32
gh issue create \
  --repo "$REPO" \
  --title "Bug: notification badge count shows incorrect number" \
  --body "## Summary
The notification badge count in the header does not match the actual number of unread notifications. In most cases it shows a higher number than the actual unread count.

## Steps to Reproduce
1. Log in with an account that has unread notifications
2. Note badge count in header
3. Open notifications panel
4. Observe: actual unread count is lower than badge

## Expected Behavior
Badge count should exactly match the number of unread notifications.

## Root Cause (Suspected)
Badge count endpoint (/api/v1/notifications/count) was not migrated as part of the v1 deprecation work (#24) and is still returning counts inclusive of dismissed notifications." \
  --label "bug" \


# #33
gh issue create \
  --repo "$REPO" \
  --title "Tech debt: remove legacy feature flags from v1" \
  --body "## Summary
Remove all v1 feature flags from the codebase now that v1 features are fully shipped. Approximately 14 feature flags remain in the code that are all permanently enabled and serve no purpose.

## Feature Flags to Remove
- ENABLE_DASHBOARD_V2 (always true since Sprint 3)
- ENABLE_PUSH_NOTIFICATIONS (always true since Sprint 4)
- ENABLE_ADVANCED_SEARCH (always true since Sprint 3)
- ENABLE_RBAC (always true since Sprint 2)
- ... and 10 others (full list in feature-flags.ts)

## Acceptance Criteria
- [ ] All v1 feature flags removed from feature-flags.ts
- [ ] All conditional branches for removed flags cleaned up
- [ ] No regressions (all tests pass)" \
  --label "tech-debt" \


# ----------------------------------------------------------
# RESOLVED SPRINT 5 ISSUES (#34 - #35): Closed
# ----------------------------------------------------------

# #34
gh issue create \
  --repo "$REPO" \
  --title "Bug: incorrect timezone applied to scheduled report exports" \
  --body "## Summary
Scheduled report exports are using UTC timestamps instead of the user's configured timezone. Report data for US-based users is shifted by 5-8 hours, making daily reports show data from the wrong day.

## Steps to Reproduce
1. Configure timezone to US/Eastern in account settings
2. Schedule a daily report for 8:00 AM
3. Receive report email
4. Observe: report covers 8:00 AM - 8:00 AM UTC, not Eastern

## Root Cause
Report scheduler reads user timezone setting from profile but passes UTC to the report generator. Timezone conversion missing in ReportSchedulerService." \
  --label "bug" \

gh issue close 34 --repo "$REPO" --comment "Fixed. Timezone conversion added to ReportSchedulerService. Reports now use user's configured timezone correctly."

# #35
gh issue create \
  --repo "$REPO" \
  --title "Bug: chart tooltip overflows container on dashboard panels" \
  --body "## Summary
Tooltips on dashboard chart panels overflow outside their container when hovering over data points near the right or bottom edge of the chart. The tooltip is clipped or appears partially off-screen.

## Steps to Reproduce
1. Open dashboard
2. Hover over data points in the rightmost column or bottom row of any chart
3. Observe: tooltip clips or extends beyond chart boundary

## Expected Behavior
Tooltip should reposition automatically to stay within the visible chart area.

## Root Cause
Tooltip position is calculated from the data point coordinates without checking viewport/container boundaries." \
  --label "bug,minor" \

gh issue close 35 --repo "$REPO" --comment "Fixed. Tooltip now detects container boundaries and repositions to stay within chart area."

# ------------------------------------------------------------
# STEP 3: SUMMARY
# ------------------------------------------------------------
echo ""
echo "[3/4] Done."
echo ""
echo "============================================================"
echo " PROJECT ORION: Issue Creation Complete"
echo "============================================================"
echo ""
echo " Total issues created: 35"
echo ""
echo " OPEN ISSUES (agent demo targets):"
echo "   #20  Mobile offline mode (descoped to backlog)"
echo "   #25  CRITICAL: Auth token refresh fails under load"
echo "   #26  CRITICAL: Dashboard load time regression"
echo "   #27  CRITICAL: Data sync drops records batch >500"
echo "   #28  STALLED:  User notification preferences UI (12 days)"
echo "   #29  Performance: CDN configuration"
echo "   #30  Bug: search indexing lag"
echo "   #31  Performance: WebSocket memory leak"
echo "   #32  Bug: notification badge count incorrect"
echo "   #33  Tech debt: remove v1 feature flags"
echo ""
echo " CLOSED ISSUES: #1-#19, #21-#24, #34-#35"
echo ""
echo " CORRELATION MAP (SQL <-> GitHub):"
echo "   SQL critical blockers (Sprint 5)  ->  #25, #26, #27"
echo "   SQL stalled feature (Sprint 5)    ->  #28"
echo "   SQL performance theme             ->  #13, #18, #26, #29, #31"
echo "   SQL velocity decline              ->  #18 triggered it; #25-#28 sustain it"
echo ""
echo " NEXT STEP: Run the demo agent query:"
echo "   'What is blocking the Project Orion release?'"
echo "   Agent should surface #25, #26, #27 from GitHub"
echo "   and BugCriticalCount=3, ReleaseReadinessScore=52 from SQL"
echo "============================================================"
