import type { Decimal } from '@/lib/api/types';

export interface SalesSummary {
  byMethod?: Array<{ method: string; total: number }>;
  saleCount: number;
  gross: Decimal;
  discount: Decimal;
  salesTotal: Decimal;
  returnsTotal: Decimal;
  netTax: Decimal;
  netTotal: Decimal;
  netSalesExcludingTax: Decimal;
  averageTicket: Decimal;
  topProducts: Array<{
    variantId: string;
    sku: string;
    name: string;
    grossQuantity: Decimal | null;
    total: Decimal | null;
  }>;
}

import type { Series } from '@/components/charts/series';

export interface DashboardData {
  trend?: Series;
  period: { from: string; to: string };
  timeZone: string;
  sales: SalesSummary;
  openCashSessions: number;
  lowStockAlerts: number;
}
