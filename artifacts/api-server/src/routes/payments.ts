import { Router } from "express";
import { requireAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { paymentsTable, athletesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function formatPayment(p: typeof paymentsTable.$inferSelect) {
  const athlete = await db.query.athletesTable.findFirst({ where: eq(athletesTable.id, p.athleteId) });
  return {
    ...p,
    createdAt: p.createdAt.toISOString(),
    athlete: athlete ? { ...athlete, createdAt: athlete.createdAt.toISOString() } : null,
  };
}

router.get("/", async (req, res) => {
  const clubId = req.query.clubId ? parseInt(req.query.clubId as string) : undefined;
  const athleteId = req.query.athleteId ? parseInt(req.query.athleteId as string) : undefined;
  const status = req.query.status as string | undefined;

  let payments = await db.select().from(paymentsTable);

  if (clubId) payments = payments.filter(p => p.clubId === clubId);
  if (athleteId) payments = payments.filter(p => p.athleteId === athleteId);
  if (status) payments = payments.filter(p => p.status === status);

  const result = await Promise.all(payments.map(formatPayment));
  return res.json(result);
});

router.post("/", requireAuth(), async (req, res) => {
  const { athleteId, clubId, amount, currency, description, dueDate, notes } = req.body;
  if (!athleteId || !clubId || amount === undefined || !description) {
    return res.status(400).json({ error: "athleteId, clubId, amount, description are required" });
  }
  const [payment] = await db.insert(paymentsTable)
    .values({ athleteId, clubId, amount, currency: currency ?? "RUB", description, dueDate, notes, status: "pending" })
    .returning();
  return res.status(201).json(await formatPayment(payment));
});

router.patch("/:paymentId", requireAuth(), async (req, res) => {
  const paymentId = parseInt(req.params.paymentId as string);
  const { amount, description, dueDate, paidAt, status, notes } = req.body;
  const [updated] = await db.update(paymentsTable)
    .set({ amount, description, dueDate, paidAt, status, notes })
    .where(eq(paymentsTable.id, paymentId))
    .returning();
  if (!updated) return res.status(404).json({ error: "Payment not found" });
  return res.json(await formatPayment(updated));
});

router.delete("/:paymentId", requireAuth(), async (req, res) => {
  const paymentId = parseInt(req.params.paymentId as string);
  await db.delete(paymentsTable).where(eq(paymentsTable.id, paymentId));
  return res.status(204).send();
});

export default router;
