import { db } from "@workspace/db";
import {
  clubsTable,
  athletesTable,
  paymentsTable,
  competitionsTable,
  weightCategoriesTable,
  participantsTable,
  fightsTable,
  usersTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Create clubs
  const [club1] = await db.insert(clubsTable).values({
    name: "Самбо-70 Москва",
    city: "Москва",
    country: "Россия",
    description: "Ведущий спортивный клуб дзюдо в Москве. Основан в 1970 году.",
  }).returning();

  const [club2] = await db.insert(clubsTable).values({
    name: "Динамо Санкт-Петербург",
    city: "Санкт-Петербург",
    country: "Россия",
    description: "Спортивный клуб дзюдо при обществе Динамо.",
  }).returning();

  console.log("Created clubs:", club1.id, club2.id);

  // Create athletes for club 1
  const athletes1 = await db.insert(athletesTable).values([
    { clubId: club1.id, firstName: "Иван", lastName: "Петров", gender: "male", birthDate: "2005-03-15", weightKg: 66, belt: "Синий", phone: "+7 916 123-45-67" },
    { clubId: club1.id, firstName: "Алексей", lastName: "Сидоров", gender: "male", birthDate: "2004-07-22", weightKg: 73, belt: "Коричневый", phone: "+7 916 234-56-78" },
    { clubId: club1.id, firstName: "Мария", lastName: "Иванова", gender: "female", birthDate: "2006-01-10", weightKg: 52, belt: "Зелёный", parentName: "Светлана Иванова", parentPhone: "+7 916 345-67-89" },
    { clubId: club1.id, firstName: "Дмитрий", lastName: "Козлов", gender: "male", birthDate: "2003-11-05", weightKg: 81, belt: "Чёрный", phone: "+7 916 456-78-90" },
    { clubId: club1.id, firstName: "Анна", lastName: "Новикова", gender: "female", birthDate: "2005-06-18", weightKg: 57, belt: "Синий", parentName: "Ольга Новикова", parentPhone: "+7 916 567-89-01" },
    { clubId: club1.id, firstName: "Сергей", lastName: "Морозов", gender: "male", birthDate: "2004-02-28", weightKg: 60, belt: "Зелёный" },
  ]).returning();

  // Create athletes for club 2
  const athletes2 = await db.insert(athletesTable).values([
    { clubId: club2.id, firstName: "Николай", lastName: "Волков", gender: "male", birthDate: "2005-08-12", weightKg: 66, belt: "Синий" },
    { clubId: club2.id, firstName: "Екатерина", lastName: "Белова", gender: "female", birthDate: "2004-04-03", weightKg: 52, belt: "Коричневый" },
    { clubId: club2.id, firstName: "Андрей", lastName: "Тихонов", gender: "male", birthDate: "2003-09-25", weightKg: 73, belt: "Чёрный" },
  ]).returning();

  console.log("Created athletes:", athletes1.length + athletes2.length);

  // Create payments
  await db.insert(paymentsTable).values([
    { clubId: club1.id, athleteId: athletes1[0].id, amount: 3500, currency: "RUB", description: "Абонемент — Январь 2026", status: "paid", paidAt: "2026-01-05", dueDate: "2026-01-10" },
    { clubId: club1.id, athleteId: athletes1[0].id, amount: 3500, currency: "RUB", description: "Абонемент — Февраль 2026", status: "paid", paidAt: "2026-02-03", dueDate: "2026-02-10" },
    { clubId: club1.id, athleteId: athletes1[1].id, amount: 3500, currency: "RUB", description: "Абонемент — Январь 2026", status: "paid", paidAt: "2026-01-08", dueDate: "2026-01-10" },
    { clubId: club1.id, athleteId: athletes1[1].id, amount: 3500, currency: "RUB", description: "Абонемент — Февраль 2026", status: "pending", dueDate: "2026-02-10" },
    { clubId: club1.id, athleteId: athletes1[2].id, amount: 3500, currency: "RUB", description: "Абонемент — Январь 2026", status: "overdue", dueDate: "2026-01-10" },
    { clubId: club1.id, athleteId: athletes1[3].id, amount: 5000, currency: "RUB", description: "Взнос за соревнования", status: "pending", dueDate: "2026-03-01" },
    { clubId: club1.id, athleteId: athletes1[4].id, amount: 3500, currency: "RUB", description: "Абонемент — Февраль 2026", status: "pending", dueDate: "2026-02-10" },
    { clubId: club1.id, athleteId: athletes1[5].id, amount: 3500, currency: "RUB", description: "Абонемент — Январь 2026", status: "overdue", dueDate: "2026-01-10" },
  ]);

  console.log("Created payments");

  // Create a competition
  const [comp1] = await db.insert(competitionsTable).values({
    clubId: club1.id,
    name: "Первенство клуба — Зима 2026",
    date: "2026-02-15",
    location: "Москва, зал ЦСКА",
    format: "olympic",
    fightDurationSeconds: 240,
    status: "active",
  }).returning();

  const [comp2] = await db.insert(competitionsTable).values({
    clubId: club1.id,
    name: "Открытый турнир по дзюдо",
    date: "2026-03-20",
    location: "Москва, Лужники",
    format: "round_robin",
    fightDurationSeconds: 300,
    status: "draft",
  }).returning();

  console.log("Created competitions:", comp1.id, comp2.id);

  // Create weight categories
  const [cat1] = await db.insert(weightCategoriesTable).values({
    competitionId: comp1.id,
    name: "до 66 кг (муж)",
    gender: "male",
    maxWeightKg: 66,
  }).returning();

  const [cat2] = await db.insert(weightCategoriesTable).values({
    competitionId: comp1.id,
    name: "до 57 кг (жен)",
    gender: "female",
    maxWeightKg: 57,
  }).returning();

  // Add participants (male athletes in cat1)
  const maleAthletes = athletes1.filter(a => a.gender === "male");
  for (let i = 0; i < Math.min(4, maleAthletes.length); i++) {
    await db.insert(participantsTable).values({
      competitionId: comp1.id,
      athleteId: maleAthletes[i].id,
      categoryId: cat1.id,
      seed: i + 1,
    });
  }

  // Add female athletes to cat2
  const femaleAthletes = athletes1.filter(a => a.gender === "female");
  for (const a of femaleAthletes) {
    await db.insert(participantsTable).values({
      competitionId: comp1.id,
      athleteId: a.id,
      categoryId: cat2.id,
    });
  }

  console.log("Created categories and participants");

  // Create bracket fights (quarterfinal + semifinal structure for 4 athletes)
  const a1 = maleAthletes[0];
  const a2 = maleAthletes[1];
  const a3 = maleAthletes[2];
  const a4 = maleAthletes[3];

  // QF1 — finished, a1 won by ippon
  const [fight1] = await db.insert(fightsTable).values({
    competitionId: comp1.id,
    categoryId: cat1.id,
    athlete1Id: a1.id,
    athlete2Id: a2.id,
    winnerId: a1.id,
    athlete1Ippon: 1,
    athlete1WazaAri: 0,
    athlete1Shido: 0,
    athlete2Ippon: 0,
    athlete2WazaAri: 1,
    athlete2Shido: 1,
    status: "finished",
    round: 1,
    position: 1,
    startedAt: "2026-02-15T10:00:00Z",
    finishedAt: "2026-02-15T10:02:30Z",
    durationSeconds: 150,
  }).returning();

  // QF2 — finished, a3 won by waza-ari
  const [fight2] = await db.insert(fightsTable).values({
    competitionId: comp1.id,
    categoryId: cat1.id,
    athlete1Id: a3.id,
    athlete2Id: a4.id,
    winnerId: a3.id,
    athlete1Ippon: 0,
    athlete1WazaAri: 2,
    athlete1Shido: 0,
    athlete2Ippon: 0,
    athlete2WazaAri: 1,
    athlete2Shido: 2,
    status: "finished",
    round: 1,
    position: 2,
    startedAt: "2026-02-15T10:15:00Z",
    finishedAt: "2026-02-15T10:19:00Z",
    durationSeconds: 240,
  }).returning();

  // SF1 — pending (a1 vs a3 — the two winners)
  await db.insert(fightsTable).values({
    competitionId: comp1.id,
    categoryId: cat1.id,
    athlete1Id: a1.id,
    athlete2Id: a3.id,
    status: "pending",
    round: 2,
    position: 1,
    athlete1Ippon: 0,
    athlete1WazaAri: 0,
    athlete1Shido: 0,
    athlete2Ippon: 0,
    athlete2WazaAri: 0,
    athlete2Shido: 0,
  });

  console.log("Created fights");
  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
