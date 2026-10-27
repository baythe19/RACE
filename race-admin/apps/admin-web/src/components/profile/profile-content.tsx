import { useForm } from 'react-hook-form';

import { formatDate, formatDateTime } from '@race/utils';
import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '@race/ui';

import { useProfile } from '@/hooks/use-profile';

type ProfileFormValues = {
  name: string;
  email: string;
  phone: string;
  department: string;
};

export function ProfileContent() {
  const { data: profile, isLoading, isError, refetch } = useProfile();

  const profileForm = useForm<ProfileFormValues>({
    values: profile
      ? {
          name: profile.name,
          email: profile.email,
          phone: profile.phone || '—',
          department: profile.department,
        }
      : undefined,
  });

  if (isLoading) return <LoadingState message="Loading profile..." />;
  if (isError || !profile) {
    return <ErrorState message="Failed to load profile" onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Image</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar
            fallback={profile.name.charAt(0)}
            alt={profile.name}
            src={profile.avatarUrl}
            className="h-20 w-20 text-2xl"
          />
          <p className="max-w-sm text-sm text-[#9CA3AF]">
            Platform admin avatar upload is not available. Identity is loaded from the live session
            (`/admin/auth/me`).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-body">
            Name and email are managed via backend env (`ADMIN_NAME` / `ADMIN_EMAIL`). They cannot be
            edited from this panel for the env-backed platform admin.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">Full Name</label>
              <input
                className="flex h-10 w-full rounded-lg border border-[#EEEEEE] bg-surface-muted px-3 text-sm"
                disabled
                {...profileForm.register('name')}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">Email</label>
              <input
                type="email"
                className="flex h-10 w-full rounded-lg border border-[#EEEEEE] bg-surface-muted px-3 text-sm"
                disabled
                {...profileForm.register('email')}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">Phone</label>
              <input
                className="flex h-10 w-full rounded-lg border border-[#EEEEEE] bg-surface-muted px-3 text-sm"
                disabled
                {...profileForm.register('phone')}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A2E]">Department</label>
              <input
                className="flex h-10 w-full rounded-lg border border-[#EEEEEE] bg-surface-muted px-3 text-sm"
                disabled
                {...profileForm.register('department')}
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm text-[#9CA3AF]">
                Role: {profile.role} · Session {formatDate(profile.joinedAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password Change</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-body">
            Update <code className="rounded bg-white px-1">ADMIN_PASSWORD</code> in the backend
            environment and restart the API. In-app password change is disabled for the env-backed
            platform admin.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.loginActivity.length === 0 ? (
            <p className="text-sm text-muted">No stored login activity for this admin session.</p>
          ) : (
            <ul className="divide-y divide-[#EEEEEE]">
              {profile.loginActivity.map((activity) => (
                <li
                  key={activity.id}
                  className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-[#1A1A2E]">{activity.device}</p>
                    <p className="text-sm text-[#555555]">
                      {activity.location} · {activity.ipAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={activity.status} />
                    <span className="text-sm text-[#9CA3AF]">
                      {formatDateTime(activity.timestamp)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
