import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, storeSettingsTable } from "@workspace/db";
import type { StoreSettings } from "@workspace/db";
import {
  GetSettingsResponse,
  GetAdminSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";

const router = Router();

const DEFAULT_PRICE_TIERS = [
  { name: "Under Ksh 500", min: 0, max: 500 },
  { name: "Ksh 500 – 2,000", min: 500, max: 2000 },
  { name: "Ksh 2,000 – 5,000", min: 2000, max: 5000 },
  { name: "Over Ksh 5,000", min: 5000, max: null },
];

async function getOrCreateSettings() {
  const rows = await db.select().from(storeSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(storeSettingsTable)
    .values({
      storeName: "My Shop",
      whatsappNumber: "",
      currency: "KES",
      currencySymbol: "KSh",
    })
    .returning();

  return created;
}

// Public shape: never expose secret API keys. Replace them with boolean
// "configured" flags so the storefront can decide whether to show the M-Pesa
// button / AI features without learning the keys.
function toPublicSettings(s: StoreSettings) {
  const { sunpayApiKey, brevoApiKey, anthropicApiKey, ...rest } = s;
  return {
    ...rest,
    priceTiers: s.priceTiers ?? DEFAULT_PRICE_TIERS,
    sunpayConfigured: !!sunpayApiKey,
    brevoConfigured: !!brevoApiKey,
    anthropicConfigured: !!anthropicApiKey,
  };
}

function toAdminSettings(s: StoreSettings) {
  return {
    ...toPublicSettings(s),
    sunpayApiKey: s.sunpayApiKey,
    brevoApiKey: s.brevoApiKey,
    anthropicApiKey: s.anthropicApiKey,
  };
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(GetSettingsResponse.parse(toPublicSettings(settings)));
});

router.get("/admin/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(GetAdminSettingsResponse.parse(toAdminSettings(settings)));
});

router.put("/admin/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await getOrCreateSettings();
  const { priceTiers, salesNotificationEmail, ...restData } = parsed.data;
  const normalizedSalesEmail =
    typeof salesNotificationEmail === "string"
      ? salesNotificationEmail.trim() || null
      : salesNotificationEmail;
  const dbSet = {
    ...restData,
    ...(salesNotificationEmail !== undefined ? { salesNotificationEmail: normalizedSalesEmail } : {}),
    ...(priceTiers !== undefined
      ? { priceTiers: priceTiers.map((t) => ({ name: t.name, min: t.min, max: t.max ?? null })) }
      : {}),
  };
  const [updated] = await db
    .update(storeSettingsTable)
    .set(dbSet)
    .where(eq(storeSettingsTable.id, existing.id))
    .returning();

  res.json(UpdateSettingsResponse.parse(toAdminSettings(updated)));
});

export default router;
