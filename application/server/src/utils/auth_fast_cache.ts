import { User } from "@web-speed-hackathon-2026/server/src/models";

interface AuthCredential {
  id: string;
  passwordHash: string;
  username: string;
}

const knownUsernames = new Set<string>();
const credentialByUsername = new Map<string, AuthCredential>();

let isWarm = false;
let warmingPromise: Promise<void> | null = null;

function setWarmCache(credentials: AuthCredential[]): void {
  knownUsernames.clear();
  credentialByUsername.clear();
  for (const credential of credentials) {
    knownUsernames.add(credential.username);
    credentialByUsername.set(credential.username, credential);
  }
  isWarm = true;
}

export async function ensureAuthFastCacheWarm(): Promise<void> {
  if (isWarm) {
    return;
  }
  if (warmingPromise !== null) {
    await warmingPromise;
    return;
  }

  warmingPromise = (async () => {
    const users = await User.unscoped().findAll({
      attributes: ["id", "password", "username"],
    });
    const credentials: AuthCredential[] = [];
    for (const user of users) {
      const passwordHash = user.getDataValue("password");
      if (typeof passwordHash !== "string") {
        continue;
      }

      credentials.push({
        id: user.id,
        passwordHash,
        username: user.username,
      });
    }
    setWarmCache(credentials);
  })();

  try {
    await warmingPromise;
  } finally {
    warmingPromise = null;
  }
}

export function clearAuthFastCache(): void {
  knownUsernames.clear();
  credentialByUsername.clear();
  isWarm = false;
  warmingPromise = null;
}

export function isKnownUsername(username: string): boolean {
  return knownUsernames.has(username);
}

export function getCachedCredentialByUsername(username: string): AuthCredential | undefined {
  return credentialByUsername.get(username);
}

export function cacheCredential(credential: AuthCredential): void {
  knownUsernames.add(credential.username);
  credentialByUsername.set(credential.username, credential);
}

export function deleteCachedCredentialByUsername(username: string): void {
  knownUsernames.delete(username);
  credentialByUsername.delete(username);
}
