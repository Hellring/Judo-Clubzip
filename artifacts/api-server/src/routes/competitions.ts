import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { db } from "@workspace/db";
import {
  competitionsTable,
  weightCategoriesTable,
  participantsTable,
  athletesTable,
  fightsTable,
} from "@workspace/db";
import { eq, count, and, sql } from "drizzle-orm";

const router = Router();

async function getParticipantCount(competitionId: number) {
  const [r] = await db
    .select({ count: count() })
    .from(participantsTable)
    .where(eq(participantsTable.competitionId, competitionId));
  return Number(r?.count ?? 0);
}

function formatComp(c: typeof competitionsTable.$inferSelect, participantCount: number) {
  return { ...c, createdAt: c.createdAt.toISOString(), participantCount };
}

router.get("/", async (req, res) => {
  const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
  const comps = clubId
    ? await db.select().from(competitionsTable).where(eq(competitionsTable.clubId, clubId))
    : await db.select().from(competitionsTable);
  const result = await Promise.all(
    comps.map(async (c) => formatComp(c, await getParticipantCount(c.id)))
  );
  return res.json(result);
});

router.post("/", requireAuth(), async (req, res) => {
  const { clubId, name, location, lat, lng, date, format, fightDurationSeconds } = req.body;
  if (!clubId || !name || !date || !format) {
    return res.status(400).json({ error: "clubId, name, date, format are required" });
  }
  const [comp] = await db
    .insert(competitionsTable)
    .values({ clubId, name, location, lat, lng, date, format, fightDurationSeconds: fightDurationSeconds ?? 240 })
    .returning();
  return res.status(201).json(formatComp(comp, 0));
});

router.get("/:competitionId", async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const comp = await db.query.competitionsTable.findFirst({
    where: eq(competitionsTable.id, competitionId),
  });
  if (!comp) return res.status(404).json({ error: "Competition not found" });

  const categories = await db
    .select()
    .from(weightCategoriesTable)
    .where(eq(weightCategoriesTable.competitionId, competitionId));

  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      const [r] = await db
        .select({ count: count() })
        .from(participantsTable)
        .where(
          and(
            eq(participantsTable.competitionId, competitionId),
            eq(participantsTable.categoryId, cat.id)
          )
        );
      return { ...cat, participantCount: Number(r?.count ?? 0) };
    })
  );

  return res.json({
    ...formatComp(comp, await getParticipantCount(competitionId)),
    categories: categoriesWithCount,
  });
});

router.patch("/:competitionId", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { name, location, lat, lng, date, format, fightDurationSeconds, status } = req.body;
  const [updated] = await db
    .update(competitionsTable)
    .set({ name, location, lat, lng, date, format, fightDurationSeconds, status })
    .where(eq(competitionsTable.id, competitionId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Competition not found" });
  return res.json(formatComp(updated, await getParticipantCount(competitionId)));
});

router.delete("/:competitionId", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  await db.delete(competitionsTable).where(eq(competitionsTable.id, competitionId));
  return res.status(204).send();
});

// Weight categories
router.get("/:competitionId/categories", async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const cats = await db
    .select()
    .from(weightCategoriesTable)
    .where(eq(weightCategoriesTable.competitionId, competitionId));
  const result = await Promise.all(
    cats.map(async (cat) => {
      const [r] = await db
        .select({ count: count() })
        .from(participantsTable)
        .where(
          and(
            eq(participantsTable.competitionId, competitionId),
            eq(participantsTable.categoryId, cat.id)
          )
        );
      return { ...cat, participantCount: Number(r?.count ?? 0) };
    })
  );
  return res.json(result);
});

router.post("/:competitionId/categories", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { name, gender, maxWeightKg } = req.body;
  if (!name || !gender) return res.status(400).json({ error: "name, gender are required" });
  const [cat] = await db
    .insert(weightCategoriesTable)
    .values({ competitionId, name, gender, maxWeightKg })
    .returning();
  return res.status(201).json({ ...cat, participantCount: 0 });
});

router.patch("/:competitionId/categories/:categoryId", requireAuth(), async (req, res) => {
  const categoryId = parseInt(req.params.categoryId as string);
  const competitionId = parseInt(req.params.competitionId as string);
  const { durationSeconds, wazaAriForIppon } = req.body as { durationSeconds?: number | null; wazaAriForIppon?: number };
  const updateData: Record<string, unknown> = {};
  if (durationSeconds !== undefined) updateData.durationSeconds = durationSeconds;
  if (wazaAriForIppon !== undefined) updateData.wazaAriForIppon = wazaAriForIppon;
  const [updated] = await db.update(weightCategoriesTable).set(updateData).where(eq(weightCategoriesTable.id, categoryId)).returning();
  if (!updated) return res.status(404).json({ error: "Category not found" });
  const [r] = await db.select({ count: count() }).from(participantsTable).where(and(eq(participantsTable.competitionId, competitionId), eq(participantsTable.categoryId, categoryId)));
  return res.json({ ...updated, participantCount: Number(r?.count ?? 0) });
});

router.delete("/:competitionId/categories/:categoryId", requireAuth(), async (req, res) => {
  const categoryId = parseInt(req.params.categoryId as string);
  await db.delete(weightCategoriesTable).where(eq(weightCategoriesTable.id, categoryId));
  return res.status(204).send();
});

// Participants
router.get("/:competitionId/participants", async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const participants = await db
    .select()
    .from(participantsTable)
    .where(eq(participantsTable.competitionId, competitionId));
  const result = await Promise.all(
    participants.map(async (p) => {
      const athlete = await db.query.athletesTable.findFirst({
        where: eq(athletesTable.id, p.athleteId),
      });
      return {
        ...p,
        athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null,
      };
    })
  );
  return res.json(result);
});

router.post("/:competitionId/participants", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { athleteId, categoryId, seed } = req.body;
  if (!athleteId || !categoryId) {
    return res.status(400).json({ error: "athleteId, categoryId are required" });
  }
  const [p] = await db
    .insert(participantsTable)
    .values({ competitionId, athleteId, categoryId, seed })
    .returning();
  const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, athleteId) });
  return res.status(201).json({
    ...p,
    athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null,
  });
});

router.delete("/:competitionId/participants/:participantId", requireAuth(), async (req, res) => {
  const participantId = parseInt(req.params.participantId as string);
  await db.delete(participantsTable).where(eq(participantsTable.id, participantId));
  return res.status(204).send();
});

// Generate bracket
router.post("/:competitionId/generate-bracket", requireAuth(), async (req, res) => {
  const competitionId = parseInt(req.params.competitionId as string);
  const { categoryId } = req.body;
  if (!categoryId) return res.status(400).json({ error: "categoryId is required" });

  const comp = await db.query.competitionsTable.findFirst({
    where: eq(competitionsTable.id, competitionId),
  });
  if (!comp) return res.status(404).json({ error: "Competition not found" });

  const participants = await db
    .select()
    .from(participantsTable)
    .where(
      and(
        eq(participantsTable.competitionId, competitionId),
        eq(participantsTable.categoryId, categoryId)
      )
    );

  // Delete existing fights for this category
  await db
    .delete(fightsTable)
    .where(
      and(
        eq(fightsTable.competitionId, competitionId),
        eq(fightsTable.categoryId, categoryId)
      )
    );

  const athleteIds = participants.map((p) => p.athleteId);
  const shuffled = [...athleteIds].sort(() => Math.random() - 0.5);
  const fights: (typeof fightsTable.$inferSelect)[] = [];

  if (comp.format === "olympic") {
    // Single elimination bracket
    const rounds: number[][][] = [];
    let current = shuffled;
    let round = 1;
    while (current.length > 1) {
      const roundFights: number[][] = [];
      for (let i = 0; i < current.length - 1; i += 2) {
        roundFights.push([current[i], current[i + 1]]);
      }
      if (current.length % 2 === 1) {
        // Bye - carry last athlete forward
        roundFights.push([current[current.length - 1], -1]);
      }
      rounds.push(roundFights);
      current = roundFights.map(() => -1); // placeholder for next round
      round++;
    }

    let position = 1;
    for (let r = 0; r < rounds.length; r++) {
      for (const [a1, a2] of rounds[r]) {
        const [fight] = await db
          .insert(fightsTable)
          .values({
            competitionId,
            categoryId,
            athlete1Id: a1 > 0 ? a1 : null,
            athlete2Id: a2 > 0 ? a2 : null,
            round: r + 1,
            position: position++,
          })
          .returning();
        fights.push(fight);
      }
    }
  } else {
    // Round robin — every athlete fights every other athlete
    let position = 1;
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        const [fight] = await db
          .insert(fightsTable)
          .values({
            competitionId,
            categoryId,
            athlete1Id: shuffled[i],
            athlete2Id: shuffled[j],
            round: 1,
            position: position++,
          })
          .returning();
        fights.push(fight);
      }
    }
  }

  // Load athletes for response
  const result = await Promise.all(
    fights.map(async (f) => {
      const a1 = f.athlete1Id
        ? await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, f.athlete1Id) })
        : null;
      const a2 = f.athlete2Id
        ? await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, f.athlete2Id) })
        : null;
      return {
        ...f,
        athlete1: a1 ? { ...a1, createdAt: a1.createdAt.toISOString() } : null,
        athlete2: a2 ? { ...a2, createdAt: a2.createdAt.toISOString() } : null,
      };
    })
  );

  return res.json(result);
});

export default router;
