-- AUTH schema
\copy auth.audit_log_entries          TO 'auth__audit_log_entries.csv'          CSV HEADER
\copy auth.flow_state                 TO 'auth__flow_state.csv'                 CSV HEADER
\copy auth.identities                 TO 'auth__identities.csv'                 CSV HEADER
\copy auth.instances                  TO 'auth__instances.csv'                  CSV HEADER
\copy auth.mfa_amr_claims             TO 'auth__mfa_amr_claims.csv'             CSV HEADER
\copy auth.mfa_challenges             TO 'auth__mfa_challenges.csv'             CSV HEADER
\copy auth.mfa_factors                TO 'auth__mfa_factors.csv'                CSV HEADER
\copy auth.oauth_authorizations       TO 'auth__oauth_authorizations.csv'       CSV HEADER
\copy auth.oauth_clients              TO 'auth__oauth_clients.csv'              CSV HEADER
\copy auth.oauth_consents             TO 'auth__oauth_consents.csv'             CSV HEADER
\copy auth.one_time_tokens            TO 'auth__one_time_tokens.csv'            CSV HEADER
\copy auth.refresh_tokens             TO 'auth__refresh_tokens.csv'             CSV HEADER
\copy auth.saml_providers             TO 'auth__saml_providers.csv'             CSV HEADER
\copy auth.saml_relay_states          TO 'auth__saml_relay_states.csv'          CSV HEADER
\copy auth.schema_migrations          TO 'auth__schema_migrations.csv'          CSV HEADER
\copy auth.sessions                   TO 'auth__sessions.csv'                   CSV HEADER
\copy auth.sso_domains                TO 'auth__sso_domains.csv'                CSV HEADER
\copy auth.sso_providers              TO 'auth__sso_providers.csv'              CSV HEADER
\copy auth.users                      TO 'auth__users.csv'                      CSV HEADER

-- EXTENSIONS schema
\copy extensions.pg_stat_statements       TO 'extensions__pg_stat_statements.csv'       CSV HEADER
\copy extensions.pg_stat_statements_info  TO 'extensions__pg_stat_statements_info.csv'  CSV HEADER

-- NET schema
\copy net._http_response          TO 'net___http_response.csv'         CSV HEADER
\copy net.http_request_queue      TO 'net__http_request_queue.csv'     CSV HEADER

-- PUBLIC schema (your main app data)
\copy public.achievement_types        TO 'public__achievement_types.csv'        CSV HEADER
\copy public.active_invitation_tokens TO 'public__active_invitation_tokens.csv' CSV HEADER
\copy public.activities               TO 'public__activities.csv'               CSV HEADER
\copy public.article_reviews          TO 'public__article_reviews.csv'          CSV HEADER
\copy public.article_revisions        TO 'public__article_revisions.csv'        CSV HEADER
\copy public.article_tags             TO 'public__article_tags.csv'             CSV HEADER
\copy public.article_views            TO 'public__article_views.csv'            CSV HEADER
\copy public.article_votes            TO 'public__article_votes.csv'            CSV HEADER
\copy public.articles                 TO 'public__articles.csv'                 CSV HEADER
\copy public.audit_logs               TO 'public__audit_logs.csv'               CSV HEADER
\copy public.categories               TO 'public__categories.csv'               CSV HEADER
\copy public.comment_likes            TO 'public__comment_likes.csv'            CSV HEADER
\copy public.comments                 TO 'public__comments.csv'                 CSV HEADER
\copy public.debate_articles          TO 'public__debate_articles.csv'          CSV HEADER
\copy public.email_events             TO 'public__email_events.csv'             CSV HEADER
\copy public.email_metrics            TO 'public__email_metrics.csv'            CSV HEADER
\copy public.email_system_dashboard   TO 'public__email_system_dashboard.csv'   CSV HEADER
\copy public.flagged_content          TO 'public__flagged_content.csv'          CSV HEADER
\copy public.invitation_requests      TO 'public__invitation_requests.csv'      CSV HEADER
\copy public.invitation_tokens        TO 'public__invitation_tokens.csv'        CSV HEADER
\copy public.media_assets             TO 'public__media_assets.csv'             CSV HEADER
\copy public.performance_logs         TO 'public__performance_logs.csv'         CSV HEADER
\copy public.privacy_settings         TO 'public__privacy_settings.csv'         CSV HEADER
\copy public.profiles                 TO 'public__profiles.csv'                 CSV HEADER
\copy public.rate_limit_attempts      TO 'public__rate_limit_attempts.csv'      CSV HEADER
\copy public.rate_limits              TO 'public__rate_limits.csv'              CSV HEADER
\copy public.recent_audit_events      TO 'public__recent_audit_events.csv'      CSV HEADER
\copy public.registration_contexts    TO 'public__registration_contexts.csv'    CSV HEADER
\copy public.storyboard_episodes      TO 'public__storyboard_episodes.csv'      CSV HEADER
\copy public.storyboard_series        TO 'public__storyboard_series.csv'        CSV HEADER
\copy public.system_configuration     TO 'public__system_configuration.csv'     CSV HEADER
\copy public.tags                     TO 'public__tags.csv'                     CSV HEADER
\copy public.user_achievements        TO 'public__user_achievements.csv'        CSV HEADER
\copy public.user_reading_stats       TO 'public__user_reading_stats.csv'       CSV HEADER
\copy public.video_articles           TO 'public__video_articles.csv'           CSV HEADER

-- REALTIME schema
\copy realtime.messages              TO 'realtime__messages.csv'              CSV HEADER
\copy realtime.messages_2025_12_02   TO 'realtime__messages_2025_12_02.csv'   CSV HEADER
\copy realtime.messages_2025_12_03   TO 'realtime__messages_2025_12_03.csv'   CSV HEADER
\copy realtime.messages_2025_12_04   TO 'realtime__messages_2025_12_04.csv'   CSV HEADER
\copy realtime.messages_2025_12_05   TO 'realtime__messages_2025_12_05.csv'   CSV HEADER
\copy realtime.messages_2025_12_06   TO 'realtime__messages_2025_12_06.csv'   CSV HEADER
\copy realtime.schema_migrations     TO 'realtime__schema_migrations.csv'     CSV HEADER
\copy realtime.subscription          TO 'realtime__subscription.csv'          CSV HEADER

-- STORAGE schema
\copy storage.buckets                    TO 'storage__buckets.csv'                    CSV HEADER
\copy storage.buckets_analytics          TO 'storage__buckets_analytics.csv'          CSV HEADER
\copy storage.buckets_vectors            TO 'storage__buckets_vectors.csv'            CSV HEADER
\copy storage.migrations                 TO 'storage__migrations.csv'                 CSV HEADER
\copy storage.objects                    TO 'storage__objects.csv'                    CSV HEADER
\copy storage.prefixes                   TO 'storage__prefixes.csv'                   CSV HEADER
\copy storage.s3_multipart_uploads       TO 'storage__s3_multipart_uploads.csv'       CSV HEADER
\copy storage.s3_multipart_uploads_parts TO 'storage__s3_multipart_uploads_parts.csv' CSV HEADER
\copy storage.vector_indexes             TO 'storage__vector_indexes.csv'             CSV HEADER

-- SUPABASE_FUNCTIONS schema
\copy supabase_functions.hooks       TO 'supabase_functions__hooks.csv'       CSV HEADER
\copy supabase_functions.migrations  TO 'supabase_functions__migrations.csv'  CSV HEADER

-- SUPABASE_MIGRATIONS schema
\copy supabase_migrations.schema_migrations TO 'supabase_migrations__schema_migrations.csv' CSV HEADER
\copy supabase_migrations.seed_files        TO 'supabase_migrations__seed_files.csv'        CSV HEADER

-- VAULT schema
\copy vault.decrypted_secrets   TO 'vault__decrypted_secrets.csv'   CSV HEADER
\copy vault.secrets             TO 'vault__secrets.csv'             CSV HEADER
