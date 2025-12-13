# Product Requirements Document: Supabase to Convex Migration Completion

**Project:** The Flying Bus - Complete Backend Migration
**Date:** December 11, 2025
**Status:** In Progress (58% Complete)
**Branch:** add-email
**Current Environment:** Dev deployment with partial migration

---

## Executive Summary

This PRD outlines the complete migration strategy from Supabase (PostgreSQL + Edge Functions) to Convex for The Flying Bus application. The migration is currently 58% complete with backend infrastructure fully deployed, but requires comprehensive frontend integration, authentication migration, and service layer updates.

### Current State
- ✅ **Backend Complete**: 72 Convex functions deployed to production
- ✅ **Data Migrated**: 83 core records migrated successfully
- ✅ **Infrastructure**: ConvexProvider integrated, wrapper services created
- ⚠️ **Services**: Only 2 of ~70 services migrated (articleQueryService, articleMutationService)
- ⚠️ **Dependencies**: 123 files still importing from Supabase
- ⚠️ **Authentication**: Still using Supabase Auth (planned)

### Deployments
- **Production Convex**: https://polished-avocet-511.convex.cloud
- **Dev Convex**: https://aromatic-pelican-422.convex.cloud (83 records imported)
- **Supabase**: Running in parallel during transition

---

## 1. Project Goals & Success Criteria

### Primary Goals
1. **Complete Service Migration**: Migrate all 123 Supabase-dependent files to use Convex
2. **Real-time Functionality**: Replace manual Supabase subscriptions with Convex reactive queries
3. **Zero Downtime**: Maintain parallel operation during migration
4. **Improved Performance**: Leverage Convex's automatic caching and reactivity
5. **Type Safety**: Full TypeScript integration with generated Convex types
6. **Production Ready**: Deploy to production with comprehensive testing

### Success Criteria
- ✅ 100% of services using Convex instead of Supabase
- ✅ All 764 TypeScript files building without Supabase dependencies
- ✅ Authentication flow functional (keeping Supabase Auth)
- ✅ Real-time updates working across all components
- ✅ Test coverage maintained or improved (>80%)
- ✅ Production deployment successful with <1% error rate
- ✅ Performance metrics improved (faster page loads, reduced API calls)

---

## 2. Current Architecture Analysis

### 2.1 Completed Work (58%)

#### Backend Infrastructure ✅
```
convex/
├── schema.ts                    ✅ Complete schema (19 tables)
├── articles.ts                  ✅ 11 functions
├── profiles.ts                  ✅ 9 functions
├── comments.ts                  ✅ 10 functions
├── categories.ts                ✅ 8 functions
├── videoArticles.ts             ✅ 4 functions
├── debateArticles.ts            ✅ 4 functions
├── tags.ts                      ✅ 8 functions
├── invitations.ts               ✅ 12 functions
├── activities.ts                ✅ 6 functions
└── importData.ts                ✅ Data import complete
```

#### Frontend Infrastructure ✅
```
src/
├── lib/convex.ts                ✅ Client initialized
├── main.tsx                     ✅ ConvexProvider integrated
├── services/convex/             ✅ 3 wrapper services created
│   ├── articleConvexService.ts
│   ├── commentConvexService.ts
│   └── profileConvexService.ts
└── hooks/convex/                ✅ 4 example hook files
    ├── useArticles.ts
    ├── useComments.ts
    ├── useProfiles.ts
    └── useCategories.ts
```

#### Partially Migrated Services (2/70) ⚠️
```
✅ src/services/articles/articleQueryService.ts      - Using Convex
✅ src/services/articles/articleMutationService.ts   - Using Convex
```

### 2.2 Remaining Work (42%)

#### High-Impact Services (Must Migrate First)
```
🔴 CRITICAL - Core Functionality
├── src/services/commentService.ts
├── src/services/userService.ts
├── src/services/auth/profileService.ts
├── src/utils/categoryUtils.ts
├── src/hooks/useComments.tsx
├── src/hooks/useArticlePagination.tsx
└── src/data/articles/index.ts

🟡 HIGH PRIORITY - Article Management
├── src/services/articles/articleSubmissionService.ts
├── src/services/articles/articleReviewService.ts
├── src/services/articles/draft/unifiedDraftService.ts
├── src/services/articles/articleMetricsService.ts
├── src/utils/articles/trackArticleView.ts
├── src/utils/articles/fetchVideo.ts
└── src/utils/articles/fetchDebate.ts

🟡 HIGH PRIORITY - Admin Features
├── src/services/moderationService.ts
├── src/services/invitationService.ts
├── src/services/roleService.ts
├── src/services/dashboardService.ts
├── src/hooks/useDashboardMetrics.ts
├── src/hooks/useDebateVoting.ts
└── src/components/Admin/**/*.tsx (multiple files)

🟢 MEDIUM PRIORITY - Supporting Services
├── src/services/storyboardService.ts
├── src/services/mediaService.ts
├── src/services/activityService.ts
├── src/services/auditLogService.ts
├── src/services/tokenService.ts
└── src/services/settingsService.ts

🟢 LOW PRIORITY - Monitoring & Utilities
├── src/services/emailMonitoringService.ts
├── src/services/monitoringService.ts
├── src/services/securityMonitoringService.ts
├── src/services/roleMonitoringService.ts
└── src/utils/logger/storage.ts
```

#### Components Requiring Updates
```
Admin Components (~40 files)
├── src/components/Admin/ArticleEditor/**/*.tsx
├── src/components/Admin/Author/**/*.tsx
├── src/components/Admin/Moderation/**/*.tsx
└── src/pages/Admin/**/*.tsx

Article Components (~20 files)
├── src/components/Articles/DebateVote/*.ts
├── src/components/Articles/*.tsx
└── src/pages/Articles/*.tsx

Profile & Settings (~10 files)
├── src/components/Profile/**/*.tsx
└── src/components/Settings/**/*.tsx
```

### 2.3 Files Still Using Supabase (123 Total)

**Distribution:**
- Services: ~70 files
- Components: ~30 files
- Hooks: ~10 files
- Utils: ~10 files
- Tests: ~3 files

---

## 3. Migration Strategy & Phases

### Phase 1: Critical Path Migration (Weeks 1-2)
**Goal:** Migrate core functionality that blocks other work

#### Week 1: Core Services
```
Day 1-2: Comment System
├── Migrate commentService.ts
├── Migrate useComments.tsx hook
├── Update comment-related components
└── Test comment creation, moderation, likes

Day 3-4: User & Profile Services
├── Migrate userService.ts
├── Migrate auth/profileService.ts
├── Update profile components
└── Test profile CRUD operations

Day 5: Category & Utilities
├── Migrate categoryUtils.ts
├── Update category lookups
└── Test category filtering
```

#### Week 2: Article Management
```
Day 1-2: Article Workflows
├── Migrate articleSubmissionService.ts
├── Migrate articleReviewService.ts
├── Migrate draft/unifiedDraftService.ts
└── Test complete article lifecycle

Day 3-4: Article Features
├── Migrate articleMetricsService.ts
├── Migrate trackArticleView.ts
├── Migrate fetchVideo.ts & fetchDebate.ts
└── Test article types (standard, video, debate)

Day 5: Hooks Migration
├── Migrate useArticlePagination.tsx
├── Migrate useDebateVoting.ts
└── Test real-time updates
```

### Phase 2: Admin & Moderation (Weeks 3-4)
**Goal:** Complete admin dashboard and moderation features

#### Week 3: Admin Services
```
Day 1-2: Moderation & Invitations
├── Migrate moderationService.ts
├── Migrate invitationService.ts
├── Update moderation components
└── Test invitation workflows

Day 3-4: Dashboard & Roles
├── Migrate dashboardService.ts
├── Migrate roleService.ts
├── Migrate useDashboardMetrics.ts
└── Test admin metrics

Day 5: Article Editor
├── Update Admin/ArticleEditor components
├── Test all article types creation
└── Test draft/publish workflows
```

#### Week 4: Admin Components
```
Day 1-3: Component Migration
├── Update Author components
├── Update Moderation components
├── Update Dashboard pages
└── Test admin workflows end-to-end

Day 4-5: Testing & Bug Fixes
├── Integration testing
├── Bug fixes
└── Performance optimization
```

### Phase 3: Supporting Features (Week 5)
**Goal:** Migrate remaining services and utilities

```
Day 1-2: Content Services
├── Migrate storyboardService.ts
├── Migrate mediaService.ts
└── Test media uploads & storyboards

Day 3: Activity & Audit
├── Migrate activityService.ts
├── Migrate auditLogService.ts
└── Test logging

Day 4-5: Utilities & Cleanup
├── Migrate tokenService.ts
├── Migrate settingsService.ts
├── Update remaining utils
└── Test edge cases
```

### Phase 4: Testing & Optimization (Week 6)
**Goal:** Comprehensive testing and production preparation

```
Day 1-2: Testing
├── Unit tests for all migrated services
├── Integration tests
├── E2E tests for critical flows
└── Load testing

Day 3-4: Performance Optimization
├── Query optimization
├── Index review
├── Caching strategy
└── Bundle size optimization

Day 5: Production Prep
├── Final code review
├── Documentation updates
├── Deployment checklist
└── Rollback plan validation
```

### Phase 5: Production Deployment (Week 7)
**Goal:** Safe production rollout

```
Day 1: Data Migration to Production
├── Export final data from Supabase
├── Import to production Convex
├── Verify data integrity
└── Run migration scripts

Day 2-3: Staged Rollout
├── Deploy to staging
├── Smoke tests
├── Deploy to production (canary)
├── Monitor metrics

Day 4-5: Full Rollout & Monitoring
├── Complete production rollout
├── 24/7 monitoring
├── Bug fixes if needed
└── Performance validation
```

---

## 4. Technical Implementation Details

### 4.1 Service Migration Pattern

**Standard Migration Template:**
```typescript
// BEFORE (Supabase)
import { supabase } from '@/integrations/supabase/client';

export async function getComments(articleId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(*)')
    .eq('article_id', articleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// AFTER (Convex - Service Layer)
import { api } from '../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { Id } from '../../convex/_generated/dataModel';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);

export async function getComments(articleId: string) {
  const comments = await convex.query(api.comments.getByArticle, {
    articleId: articleId as Id<"articles">
  });
  return comments;
}

// AFTER (Convex - React Hook - PREFERRED)
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function useArticleComments(articleId: Id<"articles">) {
  return useQuery(api.comments.getByArticle, { articleId });
}
```

### 4.2 Real-time Subscriptions Migration

**Before (Supabase):**
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('comments')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'comments',
      filter: `article_id=eq.${articleId}`
    }, (payload) => {
      setComments(prev => [...prev, payload.new]);
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [articleId]);
```

**After (Convex - Automatic):**
```typescript
// Just use the query hook - it's automatically reactive!
const comments = useQuery(api.comments.getByArticle, { articleId });
// Component re-renders automatically when comments change
```

### 4.3 Authentication Strategy

**Keep Supabase Auth (No Migration):**
```typescript
// Continue using Supabase for authentication
import { supabase } from '@/integrations/supabase/client';

// Login/signup stays the same
await supabase.auth.signInWithPassword({ email, password });

// Only profile CRUD operations migrate to Convex
import { useProfile } from '@/hooks/convex/useProfiles';
const profile = useProfile(userId);
```

**Rationale:**
- Supabase Auth is stable and working
- Migration would require password reset for all users
- Focus migration effort on data operations only
- Profile data lives in Convex, auth tokens in Supabase

### 4.4 File Storage Strategy

**Phase 1: Keep Supabase Storage (Temporary)**
```typescript
// Continue using Supabase Storage for now
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.storage
  .from('media')
  .upload(path, file);
```

**Phase 2: Migrate to Convex File Storage (Future)**
```typescript
// Convex file upload (implement later)
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const uploadFile = useMutation(api.files.upload);
await uploadFile({ file: fileData });
```

**Decision:** Defer file storage migration to Phase 3 to focus on core functionality first.

---

## 5. Data Migration & Validation

### 5.1 Production Data Migration Plan

```bash
# Step 1: Export all data from Supabase
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $SUPABASE_HOST \
  -U postgres \
  -d postgres \
  --data-only \
  --table=public.* \
  > production_data.sql

# Step 2: Convert to JSON for Convex import
node scripts/export_to_convex.js production_data.sql

# Step 3: Import to production Convex
CONVEX_DEPLOYMENT=polished-avocet-511 \
  node import_to_prod.js

# Step 4: Validate data integrity
CONVEX_DEPLOYMENT=polished-avocet-511 \
  npx convex run testQueries:validateDataIntegrity
```

### 5.2 Data Validation Checklist

```
✅ Record counts match (Supabase vs Convex)
✅ Foreign key relationships intact
✅ Timestamps preserved
✅ User profiles complete
✅ Articles with all metadata
✅ Comments linked correctly
✅ Categories and tags present
✅ Media asset references valid
✅ No duplicate records
✅ No missing required fields
```

### 5.3 Parallel Operation Strategy

**During Migration:**
1. Both Supabase and Convex run in parallel
2. Gradual cutover service by service
3. Write operations to both systems (temporary)
4. Read from Convex for migrated services
5. Fallback to Supabase if Convex fails

**Post-Migration:**
1. All reads/writes to Convex
2. Supabase kept as backup for 30 days
3. Final cutover after validation period
4. Supabase decommissioned

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Coverage Requirements:**
- All migrated services: >90%
- All Convex functions: >85%
- All hooks: >80%
- Overall: >80%

**Test Files to Create/Update:**
```
src/services/convex/__tests__/
├── articleConvexService.test.ts
├── commentConvexService.test.ts
├── profileConvexService.test.ts
└── [all migrated services].test.ts

src/hooks/convex/__tests__/
├── useArticles.test.ts
├── useComments.test.ts
├── useProfiles.test.ts
└── useCategories.test.ts
```

### 6.2 Integration Tests

**Critical Flows:**
```typescript
// Article lifecycle
test('complete article workflow', async () => {
  // Create draft
  const articleId = await createArticle({ status: 'draft' });

  // Submit for review
  await submitArticle(articleId);

  // Approve
  await approveArticle(articleId);

  // Publish
  await publishArticle(articleId);

  // Verify published
  const article = await getArticle(articleId);
  expect(article.status).toBe('published');
});

// Comment moderation
test('comment moderation workflow', async () => {
  const commentId = await createComment(articleId, 'test');
  await flagComment(commentId);
  await moderateComment(commentId, 'approved');
  const comment = await getComment(commentId);
  expect(comment.status).toBe('approved');
});

// Real-time updates
test('real-time article updates', async () => {
  const { result } = renderHook(() => useArticle(articleId));

  await updateArticle(articleId, { title: 'Updated' });

  // Should automatically re-render with new data
  await waitFor(() => {
    expect(result.current?.title).toBe('Updated');
  });
});
```

### 6.3 E2E Tests

**User Flows:**
- User registration → profile creation → first comment
- Author login → create article → submit → publish
- Admin login → view queue → approve article → view analytics
- User reads article → video plays → leaves comment → receives notification

### 6.4 Performance Tests

**Metrics to Track:**
```
- Page load time (target: <2s)
- Time to interactive (target: <3s)
- API response time (target: <200ms p95)
- Real-time update latency (target: <1s)
- Bundle size (target: <500KB initial)
- Memory usage (no leaks)
- Query count per page (minimize)
```

---

## 7. Deployment & Rollback Plan

### 7.1 Deployment Checklist

**Pre-Deployment:**
```
✅ All tests passing (unit, integration, E2E)
✅ Code review completed
✅ Performance benchmarks met
✅ Security audit passed
✅ Data migration tested on staging
✅ Rollback plan documented
✅ Monitoring alerts configured
✅ Team notified of deployment
```

**Deployment Steps:**
```
1. Freeze Supabase writes (maintenance mode)
2. Export final Supabase data
3. Import to production Convex
4. Validate data integrity
5. Deploy frontend to staging
6. Smoke tests on staging
7. Deploy to production (canary 10%)
8. Monitor for 1 hour
9. Increase to 50%
10. Monitor for 2 hours
11. Deploy to 100%
12. Enable Convex writes
13. 24-hour monitoring period
```

### 7.2 Rollback Plan

**Automatic Rollback Triggers:**
- Error rate >5% for 5 minutes
- API latency >2s p95 for 10 minutes
- Data integrity check fails
- Critical feature broken

**Rollback Procedure:**
```
1. Revert frontend deployment
2. Switch environment variable to Supabase URL
3. Clear Convex client cache
4. Validate Supabase connectivity
5. Resume normal operations on Supabase
6. Post-mortem analysis
```

### 7.3 Monitoring & Alerts

**Key Metrics:**
```javascript
// Error tracking
- Convex query failures
- Mutation failures
- Authentication errors
- Network errors

// Performance
- Query latency (p50, p95, p99)
- Mutation latency
- Page load time
- Real-time update latency

// Business metrics
- User signups
- Article views
- Comments posted
- Admin actions
```

**Alert Thresholds:**
- Error rate >1% → Warning
- Error rate >5% → Critical
- Latency >500ms p95 → Warning
- Latency >2s p95 → Critical

---

## 8. Risk Assessment & Mitigation

### 8.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | CRITICAL | LOW | Multiple backups, validation scripts, parallel operation |
| Performance degradation | HIGH | MEDIUM | Load testing, optimization, caching strategy |
| Type errors from ID changes | MEDIUM | HIGH | TypeScript strict mode, comprehensive testing |
| Real-time subscription failures | HIGH | LOW | Fallback to polling, error boundaries |
| Authentication issues | CRITICAL | LOW | Keep Supabase Auth, no changes to auth flow |
| File upload failures | MEDIUM | MEDIUM | Keep Supabase Storage initially, migrate later |

### 8.2 Timeline Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Underestimated complexity | Schedule slip | 20% buffer built into timeline |
| Unforeseen dependencies | Scope creep | Strict prioritization, MVP focus |
| Team availability | Resource constraint | Cross-training, documentation |
| Production bugs | Extended support | Gradual rollout, quick rollback |

### 8.3 Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| User disruption | Churn | Zero-downtime deployment, communication |
| Feature freeze | Missed opportunities | Parallel development on feature branch |
| Cost overrun | Budget impact | Monitor Convex usage, optimize queries |

---

## 9. Success Metrics & KPIs

### 9.1 Migration Progress

**Weekly Checkpoints:**
```
Week 1: 70% complete (core services)
Week 2: 80% complete (article management)
Week 3: 85% complete (admin features)
Week 4: 90% complete (components)
Week 5: 95% complete (utilities)
Week 6: 98% complete (testing)
Week 7: 100% complete (production)
```

### 9.2 Technical KPIs

**Code Quality:**
- Test coverage: >80%
- TypeScript strict mode: 100%
- No Supabase imports: 0 (except auth)
- ESLint errors: 0

**Performance:**
- Page load: <2s
- API latency: <200ms p95
- Real-time updates: <1s
- Bundle size: <500KB

### 9.3 Business KPIs

**User Impact:**
- Error rate: <0.5%
- Uptime: >99.9%
- User satisfaction: >4.5/5
- Support tickets: <baseline

**Development Velocity:**
- New feature development: 20% faster
- Bug fix time: 30% faster
- Deploy frequency: 2x increase

---

## 10. Documentation Requirements

### 10.1 Developer Documentation

**Required Documents:**
```
✅ CONVEX_MIGRATION_PRD.md (this document)
✅ CONVEX_MIGRATION_GUIDE.md (already exists)
✅ CONVEX_USAGE_EXAMPLES.md (already exists)
⏳ CONVEX_API_REFERENCE.md (to create)
⏳ CONVEX_TESTING_GUIDE.md (to create)
⏳ CONVEX_TROUBLESHOOTING.md (to create)
```

### 10.2 Operational Documentation

```
⏳ PRODUCTION_DEPLOYMENT_RUNBOOK.md
⏳ MONITORING_PLAYBOOK.md
⏳ INCIDENT_RESPONSE_GUIDE.md
⏳ DATA_MIGRATION_PROCEDURES.md
```

### 10.3 Code Documentation

**JSDoc Requirements:**
- All public functions
- All React hooks
- All Convex queries/mutations
- Complex algorithms

---

## 11. Team & Resources

### 11.1 Required Roles

**Development Team:**
- Backend Developer: Convex functions, data migration
- Frontend Developer: React hooks, component updates
- QA Engineer: Testing, validation
- DevOps: Deployment, monitoring

**Estimated Effort:**
- Backend: 2 weeks (80 hours)
- Frontend: 3 weeks (120 hours)
- Testing: 1.5 weeks (60 hours)
- DevOps: 1 week (40 hours)
- **Total: 300 hours (7.5 weeks)**

### 11.2 External Dependencies

**Tools & Services:**
- Convex deployment (already provisioned)
- Testing infrastructure
- Monitoring tools (Sentry, DataDog, etc.)
- CI/CD pipeline updates

---

## 12. Post-Migration Activities

### 12.1 Immediate (Week 8)

```
✅ Remove Supabase dependencies from package.json
✅ Archive Supabase migration files
✅ Update all documentation
✅ Team knowledge sharing session
✅ Celebrate! 🎉
```

### 12.2 Short-term (Weeks 8-12)

```
- Monitor production for 30 days
- Optimize slow queries
- Fine-tune indexes
- Implement additional Convex features
- Migrate file storage to Convex
- Decommission Supabase (after 30 days)
```

### 12.3 Long-term (Months 3-6)

```
- Performance analysis and optimization
- Developer experience improvements
- Advanced Convex features (actions, scheduled jobs)
- Documentation refinement
- Lessons learned retrospective
```

---

## 13. Open Questions & Decisions Needed

### 13.1 Technical Decisions

**Q1: Should we migrate file storage immediately or defer?**
- **Recommendation:** Defer to Phase 3 (post-migration)
- **Rationale:** Focus on core functionality first, storage is working

**Q2: Keep Supabase Auth or migrate to Clerk/Auth0?**
- **Recommendation:** Keep Supabase Auth
- **Rationale:** Auth is stable, migration is high risk, low benefit

**Q3: Full cutover or gradual rollout?**
- **Recommendation:** Gradual rollout with feature flags
- **Rationale:** Reduce risk, enable quick rollback

### 13.2 Process Decisions

**Q1: Code freeze during migration?**
- **Recommendation:** Feature branch development only
- **Rationale:** Prevent merge conflicts, focused effort

**Q2: How to handle hotfixes during migration?**
- **Recommendation:** Apply to both Supabase and Convex
- **Rationale:** Maintain parity during transition

---

## 14. Appendices

### Appendix A: File Migration Checklist

Complete list of 123 files requiring migration available in separate tracking document.

### Appendix B: Convex Function Reference

See `CONVEX_MIGRATION_GUIDE.md` for complete function list.

### Appendix C: Testing Scenarios

See `CONVEX_TESTING_GUIDE.md` (to be created).

### Appendix D: Deployment Scripts

```bash
# Deploy to production
./scripts/deploy-convex-production.sh

# Rollback
./scripts/rollback-convex-production.sh

# Data migration
./scripts/migrate-data-to-convex.sh
```

---

## 15. Approval & Sign-off

**Required Approvals:**
- [ ] Tech Lead - Architecture review
- [ ] Product Manager - Feature parity confirmation
- [ ] DevOps - Infrastructure readiness
- [ ] QA Lead - Test plan approval

**Target Start Date:** Immediately
**Target Completion Date:** 7 weeks from start
**Next Review:** Weekly progress check-ins

---

**Document Version:** 1.0
**Last Updated:** December 11, 2025
**Author:** Claude Code
**Status:** Ready for Review
