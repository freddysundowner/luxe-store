import type { Request, Response, NextFunction } from "express";
import {
  createHmac,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";

// Maximum lifetime of a token issued by /admin/login.
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// HMAC secret used to sign admin session tokens. Prefer an explicit
// ADMIN_TOKEN_SECRET; otherwise derive a value from ADMIN_PASSWORD plus a
// per-process random component. Rotating ADMIN_PASSWORD invalidates all
// previously-issued tokens, which is the desired behaviour.
const TOKEN_SECRET =
  process.env.ADMIN_TOKEN_SECRET ??
  `${ADMIN_PASSWORD}:${process.env.ADMIN_TOKEN_SALT ?? randomBytes(16).toString("hex")}`;

function sign(payload: string): string {
  return createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
}

export function issueAdminToken(): string {
  const payload = `admin:${Date.now()}:${randomBytes(8).toString("hex")}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`, "utf8").toString("base64url");
}

function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function isValidAdminToken(token: string): boolean {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const lastDot = decoded.lastIndexOf(".");
  if (lastDot < 0) return false;

  const payload = decoded.slice(0, lastDot);
  const providedSig = decoded.slice(lastDot + 1);

  // Verify HMAC signature in constant time so attackers can't probe it.
  const expectedSig = sign(payload);
  if (!constantTimeEquals(providedSig, expectedSig)) return false;

  // Payload must be of the form admin:<ts>:<nonce>.
  const parts = payload.split(":");
  if (parts.length !== 3 || parts[0] !== "admin") return false;

  const ts = Number(parts[1]);
  if (!Number.isFinite(ts)) return false;

  const ageMs = Date.now() - ts;
  if (ageMs < 0 || ageMs > TOKEN_MAX_AGE_MS) return false;

  return true;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  if (isValidAdminToken(match[1].trim())) {
    next();
    return;
  }
  res.status(401).json({ error: "Invalid or expired admin token" });
}
