/*
 * Unit tests for the filterable game data-access helpers.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterableGames(db: Database): Promise<{ strategyId: number; puzzleId: number; pubOneId: number; pubTwoId: number }> {
    const [strategy] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'strategy' })
        .returning({ id: categories.id });
    const [puzzle] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'puzzle' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'one' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'two' })
        .returning({ id: publishers.id });

    await db.insert(games).values([
        { title: 'Alpha', description: 'alpha', starRating: 4, categoryId: strategy.id, publisherId: pubOne.id },
        { title: 'Beta', description: 'beta', starRating: 4, categoryId: strategy.id, publisherId: pubTwo.id },
        { title: 'Gamma', description: 'gamma', starRating: 4, categoryId: puzzle.id, publisherId: pubOne.id },
    ]);

    return { strategyId: strategy.id, puzzleId: puzzle.id, pubOneId: pubOne.id, pubTwoId: pubTwo.id };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('filters games by one or more categories', async () => {
        const { strategyId, puzzleId } = await seedFilterableGames(db);

        expect((await getAllGames(db, { categoryIds: [strategyId] })).map((game) => game.title))
            .toEqual(['Alpha', 'Beta']);
        expect((await getAllGames(db, { categoryIds: [strategyId, puzzleId] })).map((game) => game.title))
            .toEqual(['Alpha', 'Beta', 'Gamma']);
    });

    it('filters games by publisher and combines publisher and category filters', async () => {
        const { strategyId, pubOneId, pubTwoId } = await seedFilterableGames(db);

        expect((await getAllGames(db, { publisherId: pubOneId })).map((game) => game.title))
            .toEqual(['Alpha', 'Gamma']);
        expect((await getAllGames(db, { categoryIds: [strategyId], publisherId: pubTwoId })).map((game) => game.title))
            .toEqual(['Beta']);
    });

    it('returns an empty list when filters match no games', async () => {
        const { strategyId, pubTwoId } = await seedFilterableGames(db);
        const gamesForImpossibleCombination = await getAllGames(db, {
            categoryIds: [strategyId],
            publisherId: 99999,
        });

        expect(gamesForImpossibleCombination).toEqual([]);
        expect(await getAllGames(db, { categoryIds: [99999] })).toEqual([]);
        expect(pubTwoId).toEqual(expect.any(Number));
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});
