import type { Metadata } from 'next';
import { requireRole, SELLING } from '@/server/guards';
import { PosScreen } from './pos-screen';

export const metadata: Metadata = { title: 'Punto de venta' };

export default async function PosPage({
  params,
}: PageProps<'/[organizationId]/sales'>) {
  await requireRole((await params).organizationId, SELLING, 'pos');
  return <PosScreen />;
}
