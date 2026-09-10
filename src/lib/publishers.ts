/*
 * Publisher lookup helpers for static page data.
 * This module exposes read-only queries for the publishers catalog so Astro pages
 * can render publisher names without coupling directly to the database schema.
 */
import { asc } from 'drizzle-orm';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';
import type { Database } from './db';

/**
 * Retrieves every publisher in the catalog sorted alphabetically by name.
 *
 * @param db - Database connection used to read publisher records.
 * @returns A promise resolving to a list of publishers ordered by name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}
