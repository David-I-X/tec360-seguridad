/**
 * Utilidades compartidas de dominio para servicios Tec360 en app móvil.
 */

import { API_URL } from '@/lib/api';

export const QUICK_MECHANICS_TYPES = [
  'oil_change',
  'tire_change',
  'battery_service',
  'brake_service',
  'chain_kit_service',
  'spark_bulbs_wipers',
] as const;

export function isQuickMechanicsService(service: any): boolean {
  if (!service) return false;
  const type = String(service.service_type || '').toLowerCase();
  const category = String(service.service_metadata?.service_category || '').toLowerCase();
  return (
    (QUICK_MECHANICS_TYPES as readonly string[]).includes(type) ||
    category === 'quick_mechanics' ||
    category.includes('mechanic')
  );
}

export function requiresVehicleInspection(service: any): boolean {
  if (!service) return false;
  const type = String(service.service_type || '').toLowerCase();
  if (type === 'vehicle_recovery') return false;
  return !isQuickMechanicsService(service);
}

export function getClientObservations(service: any): {
  primary: string | null;
  notes: string | null;
} {
  const rawDesc = typeof service?.description === 'string' ? service.description.trim() : '';
  const desc = rawDesc && rawDesc.toLowerCase() !== 'sin descripción' ? rawDesc : '';
  const rawNotesSource =
    typeof service?.client_notes === 'string'
      ? service.client_notes
      : typeof service?.service_metadata?.client_notes === 'string'
        ? service.service_metadata.client_notes
        : '';
  const rawNotes = rawNotesSource.trim();
  const notes =
    rawNotes && rawNotes.toLowerCase() !== 'sin descripción' && rawNotes !== desc ? rawNotes : '';

  return {
    primary: desc || notes || null,
    notes: desc && notes ? notes : null,
  };
}

export function getMobileImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const staticUrl = API_URL.replace(/\/api\/?$/, '');
  return `${staticUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}
