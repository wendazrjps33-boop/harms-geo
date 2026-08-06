'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useI18n } from '@/app/i18n/context';
import { teamAPI } from '@/services/api';
import type { TeamMember, TeamRole } from '@/types/api';

export default function TeamPage() {
  const { t } = useI18n();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as TeamRole });
  const [inviting, setInviting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const response = await teamAPI.getMembers();
      setMembers(response.data?.members ?? []);
    } catch {
      setError(t('team.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email) return;

    setInviting(true);
    try {
      await teamAPI.invite(inviteForm);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'member' });
      await loadMembers();
    } catch (err: unknown) {
      const error = err as { data?: { detail?: string } };
      setError(error.data?.detail || t('team.inviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: number, newRole: TeamRole) => {
    setActionLoading(memberId);
    try {
      await teamAPI.updateRole(memberId, { role: newRole });
      await loadMembers();
    } catch {
      setError(t('team.roleUpdateFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (memberId: number) => {
    if (!window.confirm(t('team.removeConfirm'))) return;

    setActionLoading(memberId);
    try {
      await teamAPI.remove(memberId);
      await loadMembers();
    } catch {
      setError(t('team.removeFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const roleOptions = [
    { value: 'admin', label: t('team.roleAdmin') },
    { value: 'member', label: t('team.roleMember') },
  ];

  const getRoleBadgeVariant = (role: TeamRole) => {
    switch (role) {
      case 'owner':
        return 'info' as const;
      case 'admin':
        return 'warning' as const;
      case 'member':
        return 'neutral' as const;
      default:
        return 'neutral' as const;
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={t('team.title')} />
        <Skeleton count={3} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('team.title')}
        description={t('team.description')}
        actions={
          <Button onClick={() => setShowInviteModal(true)}>
            {t('team.inviteMember')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button
            onClick={() => setError('')}
            className="text-danger-dark/60 hover:text-danger-dark"
          >
            ✕
          </button>
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState
          icon="👥"
          title={t('team.emptyTitle')}
          description={t('team.emptyDescription')}
          action={
            <Button onClick={() => setShowInviteModal(true)}>
              {t('team.inviteFirst')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <Card key={member.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-semibold">
                  {(member.name || member.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {member.name || member.email}
                  </p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={getRoleBadgeVariant(member.role)}>
                  {t(
                    `team.role${member.role.charAt(0).toUpperCase() + member.role.slice(1)}`
                  )}
                </Badge>

                {member.status === 'pending' && (
                  <Badge variant="warning">{t('team.pending')}</Badge>
                )}

                {member.role !== 'owner' && (
                  <div className="flex gap-2">
                    <Select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value as TeamRole)
                      }
                      options={roleOptions}
                      disabled={actionLoading === member.id}
                      className="w-32"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                      loading={actionLoading === member.id}
                    >
                      {t('team.remove')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title={t('team.inviteTitle')}
      >
        <div className="space-y-4">
          <Input
            label={t('team.emailLabel')}
            type="email"
            value={inviteForm.email}
            onChange={(e) =>
              setInviteForm({ ...inviteForm, email: e.target.value })
            }
            placeholder={t('team.emailPlaceholder')}
          />
          <Select
            label={t('team.roleLabel')}
            value={inviteForm.role}
            onChange={(e) =>
              setInviteForm({ ...inviteForm, role: e.target.value as TeamRole })
            }
            options={roleOptions}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleInvite} loading={inviting}>
              {t('team.sendInvite')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
