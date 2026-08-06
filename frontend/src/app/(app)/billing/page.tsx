'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useI18n } from '@/app/i18n/context';
import { billingAPI } from '@/services/api';
import type { Invoice } from '@/types/api';

export default function BillingPage() {
  const { t, locale } = useI18n();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await billingAPI.getHistory();
      setInvoices(response.data?.invoices ?? []);
    } catch {
      setError(t('billing.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return { variant: 'success' as const, label: t('billing.statusPaid') };
      case 'open':
        return { variant: 'warning' as const, label: t('billing.statusOpen') };
      case 'void':
        return { variant: 'neutral' as const, label: t('billing.statusVoid') };
      case 'uncollectible':
        return { variant: 'danger' as const, label: t('billing.statusUncollectible') };
      default:
        return { variant: 'neutral' as const, label: status };
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '--';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={t('billing.title')} />
        <Skeleton count={5} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('billing.title')} description={t('billing.description')} />

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

      {invoices.length === 0 ? (
        <EmptyState
          icon="📄"
          title={t('billing.emptyTitle')}
          description={t('billing.emptyDescription')}
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        {t('billing.date')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                        {t('billing.description')}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                        {t('billing.amount')}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                        {t('billing.status')}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                        {t('billing.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => {
                      const statusBadge = getStatusBadge(invoice.status);
                      return (
                        <tr
                          key={invoice.id}
                          className="border-b border-gray-50 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {formatDate(invoice.created)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {invoice.description}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                            {formatAmount(invoice.amount_paid, invoice.currency)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              {invoice.invoice_url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    window.open(invoice.invoice_url!, '_blank')
                                  }
                                >
                                  {t('billing.view')}
                                </Button>
                              )}
                              {invoice.invoice_pdf && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    window.open(invoice.invoice_pdf!, '_blank')
                                  }
                                >
                                  {t('billing.download')}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {invoices.map((invoice) => {
              const statusBadge = getStatusBadge(invoice.status);
              return (
                <Card key={invoice.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {invoice.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(invoice.created)}
                      </p>
                    </div>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mb-3">
                    {formatAmount(invoice.amount_paid, invoice.currency)}
                  </p>
                  <div className="flex gap-2">
                    {invoice.invoice_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          window.open(invoice.invoice_url!, '_blank')
                        }
                      >
                        {t('billing.view')}
                      </Button>
                    )}
                    {invoice.invoice_pdf && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          window.open(invoice.invoice_pdf!, '_blank')
                        }
                      >
                        {t('billing.download')}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
