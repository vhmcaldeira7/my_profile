import type { StringKey } from '../i18n';

/**
 * The "Experience with" sphere. Labels are proper names and stay untranslated; the one PT phrase among them
 * ("SOC e MDR") reuses the dictionary key the prototype gave it. `star` marks the terms drawn larger, in the accent.
 */
export interface Chip {
  label: string;
  star?: boolean;
  key?: StringKey;
}

export const chips: readonly Chip[] = [
  { label: 'SDD', star: true },
  { label: 'Harness Engineering', star: true },
  { label: 'Context Engineering', star: true },
  { label: 'DDD', star: true },
  { label: 'Clean Architecture', star: true },
  { label: 'Cloud Computing', star: true },
  { label: 'Hexagonal Architecture', star: true },
  { label: 'Unit Tests', star: true },
  { label: 'OKR' },
  { label: 'KPI' },
  { label: 'People Management' },
  { label: 'Management 3.0' },
  { label: 'Microservices', star: true },
  { label: 'Application Lifecycle Management' },
  { label: 'Team Topologies', star: true },
  { label: 'Claude Code' },
  { label: 'skills' },
  { label: 'n8n' },
  { label: 'Product Management', star: true },
  { label: 'Roadmap Build' },
  { label: 'PCI DSS' },
  { label: 'ISO 27001' },
  { label: 'SOC e MDR', key: 'pc.soc' },
  { label: 'Retail' },
  { label: 'Fintech' },
  { label: 'Security' },
  { label: 'Relational Databases' },
  { label: 'No SQL' },
  { label: 'Application Performance' },
  { label: 'Finops' },
  { label: 'Redis' },
  { label: 'Docker and containers' },
  { label: 'CI / CD' },
  { label: 'GitHub Actions' },
  { label: 'Datadog and observability', star: true },
  { label: 'Kubernetes' },
  { label: 'Scrum' },
  { label: 'CMMI' },
  { label: 'Tech Leader' },
  { label: 'PHP / Java / Node' },
  { label: 'PostgreSQL' },
  { label: 'Apache' },
  { label: 'SonarQube' },
];
