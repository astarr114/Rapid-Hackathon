// TODO: Swap fake freshness data for real BigQuery metadata queries

type FreshnessStatus = 'OK' | 'LATE' | 'CRITICAL';

interface FreshnessResult {
  table: string;
  lastTimestamp: string;
  freshnessMinutes: number;
  status: FreshnessStatus;
}

interface ImpactView {
  name: string;
  type: string;
  owner: string;
}

const demoFreshness: Record<string, Omit<FreshnessResult, 'table'>> = {
  'analytics.ga4_events_daily': {
    lastTimestamp: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    freshnessMinutes: 300,
    status: 'CRITICAL',
  },
  'analytics.ga4_events_intraday': {
    lastTimestamp: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    freshnessMinutes: 180,
    status: 'LATE',
  },
  'crm.salesforce_accounts': {
    lastTimestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    freshnessMinutes: 10,
    status: 'OK',
  },
  'commerce.shopify_orders': {
    lastTimestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    freshnessMinutes: 40,
    status: 'LATE',
  },
  'marketing.marketo_leads': {
    lastTimestamp: new Date(Date.now() - 1440 * 60 * 1000).toISOString(),
    freshnessMinutes: 1440,
    status: 'CRITICAL',
  },
  'support.zendesk_tickets': {
    lastTimestamp: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
    freshnessMinutes: 95,
    status: 'LATE',
  },
  'warehouse.postgres_orders': {
    lastTimestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    freshnessMinutes: 12,
    status: 'OK',
  },
};

const impactByTable: Record<string, { views: ImpactView[]; dashboards: string[] }> = {
  ga4_events_daily: {
    views: [
      { name: 'demo-analytics-prod.analytics.sales_dashboard', type: 'view', owner: 'sales-team' },
      { name: 'demo-analytics-prod.analytics.marketing_funnel', type: 'view', owner: 'growth-team' },
      { name: 'demo-analytics-prod.analytics.executive_kpis', type: 'view', owner: 'exec-team' },
    ],
    dashboards: ['Executive KPI Dashboard', 'Sales Performance', 'Marketing Attribution'],
  },
  shopify_orders: {
    views: [
      { name: 'demo-analytics-prod.analytics.revenue_daily', type: 'view', owner: 'finance-team' },
      { name: 'demo-analytics-prod.analytics.order_funnel', type: 'view', owner: 'growth-team' },
    ],
    dashboards: ['Finance Daily Revenue', 'E-commerce Overview'],
  },
  zendesk_tickets: {
    views: [
      { name: 'demo-analytics-prod.analytics.support_overview', type: 'view', owner: 'support-team' },
      { name: 'demo-analytics-prod.analytics.csat_metrics', type: 'view', owner: 'support-team' },
    ],
    dashboards: ['Customer Support Overview', 'CSAT Tracker'],
  },
  salesforce_accounts: {
    views: [
      { name: 'demo-analytics-prod.analytics.crm_pipeline', type: 'view', owner: 'sales-ops' },
    ],
    dashboards: ['CRM Pipeline Dashboard'],
  },
};

export function checkFreshness(tables: string[]) {
  const results: FreshnessResult[] = tables.map((table) => {
    const demo = demoFreshness[table];
    if (demo) return { table, ...demo };
    return {
      table,
      lastTimestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      freshnessMinutes: 60,
      status: 'OK' as FreshnessStatus,
    };
  });

  const breached = results.filter((r) => r.status !== 'OK').length;
  return {
    checkedAt: new Date().toISOString(),
    tables: results,
    summary:
      breached > 0
        ? `${breached} table(s) breaching freshness SLA — GA4 and support tables most affected`
        : 'All tables within freshness SLA',
  };
}

export function checkImpact(projectId: string, datasetId: string, tableId: string) {
  const fullTable = `${projectId}.${datasetId}.${tableId}`;
  const impact = impactByTable[tableId] ?? {
    views: [
      { name: `${projectId}.${datasetId}.${tableId}_summary`, type: 'view', owner: 'analytics-team' },
    ],
    dashboards: ['General Analytics Dashboard'],
  };

  const viewCount = impact.views.length;
  const dashCount = impact.dashboards.length;

  const downstreamViewNames = impact.views.map((v) => v.name);

  return {
    upstream_table: fullTable,
    table: fullTable,
    downstream_views: downstreamViewNames,
    downstreamViews: impact.views,
    affectedDashboards: impact.dashboards,
    summary: `Stale data in ${fullTable} impacts ${viewCount} downstream view(s) and ${dashCount} dashboard(s): ${impact.dashboards.join(', ')}. Estimated business impact: delayed reporting for dependent teams.`,
  };
}

export function checkImpactForConnectorTable(primaryTable: string) {
  const parts = primaryTable.split('.');
  if (parts.length >= 3) {
    const [project, dataset, table] = parts;
    return checkImpact(project, dataset, table);
  }
  return checkImpact('demo-analytics-prod', 'analytics', primaryTable.replace(/^.*\./, ''));
}
