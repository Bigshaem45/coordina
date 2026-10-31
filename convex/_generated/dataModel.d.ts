import { GenericId } from 'convex/values';
import schema from '../schema';

export type TableNames =
  | 'users'
  | 'organizers'
  | 'organizer_verifications'
  | 'spaces'
  | 'events'
  | 'event_verifications'
  | 'venue_confirmations'
  | 'orders'
  | 'tickets'
  | 'squads'
  | 'squad_votes'
  | 'documents'
  | 'audit_logs'
  | 'notifications';

export type Id<TableName extends TableNames> = GenericId<TableName>;
export type Doc<TableName extends TableNames> = any;
export type DataModel = any;

