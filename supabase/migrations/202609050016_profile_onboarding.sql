-- Issue #19: distinguish completed onboarding from an auth-triggered profile row.
begin;

alter table public.profiles
  add column onboarding_completed_at timestamptz;

-- Existing profiles with a saved display name already satisfy the original
-- profile contract. New auth-triggered rows keep NULL, even when signup
-- metadata prefilled their name, so every new account sees onboarding once.
update public.profiles
set onboarding_completed_at = coalesce(updated_at, created_at, now())
where onboarding_completed_at is null
  and btrim(name) <> ''
  and length(name) <= 100
  and length(major) <= 120
  and length(interests) <= 500
  and length(coalesce(avatar_url, '')) <= 2048
  and (avatar_url is null or (
    avatar_url ~ '^https://[^[:space:]@/]+([/?#].*)?$'
    and avatar_url !~ '^https://[^/]*:.*@'
  ));

grant update (onboarding_completed_at) on public.profiles to authenticated;

commit;
