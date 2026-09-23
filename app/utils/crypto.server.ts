/**
 * Symmetric AES-256-GCM encryption helpers.
 * Runs ONLY on the server — never bundled for the browser.
 *
 * Env var required: MAIL_ENCRYPTION_KEY (32-char / 256-bit hex string)
 * Optional: CRYPTO_SALT (per-deployment salt for key derivation)
 * Falls back to a deterministic key derived from VITE_ADMIN_PASSWORD
 * if the env var is not set (dev-only convenience — set the var in prod).
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce recommended for GCM
const TAG_BYTES = 16;

/** Derive a 32-byte key from an arbitrary passphrase using a per-deployment salt. */
function deriveKey(passphrase: string): Buffer {
	const salt = (process.env.CRYPTO_SALT || process.env.VITE_ADMIN_PASSWORD || "opuszen-mail-salt-default").slice(0, 32);
	return scryptSync(passphrase, salt, 32);
}

function getKey(): Buffer {
	const raw = process.env.MAIL_ENCRYPTION_KEY;
	if (raw) {
		if (raw.length === 64) return Buffer.from(raw, "hex"); // hex-encoded 32 bytes
		if (raw.length >= 32) return Buffer.from(raw.slice(0, 32));
		return deriveKey(raw);
	}
	// Fallback (dev only)
	if (process.env.NODE_ENV === "production") {
		throw new Error("[crypto.server] MAIL_ENCRYPTION_KEY environment variable is strictly required in production!");
	}
	const fallback = process.env.VITE_ADMIN_PASSWORD || "changeme-set-MAIL_ENCRYPTION_KEY";
	return deriveKey(fallback);
}

/**
 * Encrypts a plaintext string.
 * @returns base64-encoded iv:tag:ciphertext
 */
export function encrypt(plaintext: string): string {
	const key = getKey();
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	// Encode as iv_hex:tag_hex:ciphertext_base64
	return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypts a previously encrypted string.
 * Returns the original plaintext, or "" on failure.
 */
export function decrypt(encoded: string): string {
	try {
		const parts = encoded.split(":");
		if (parts.length < 3) return encoded; // legacy / plain — return as-is
		const iv = Buffer.from(parts[0], "hex");
		const tag = Buffer.from(parts[1], "hex");
		const ciphertext = Buffer.from(parts.slice(2).join(":"), "base64");
		const key = getKey();
		const decipher = createDecipheriv(ALGORITHM, key, iv);
		decipher.setAuthTag(tag);
		return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
	} catch {
		return ""; // decryption failed — bad key or corrupted data
	}
}
