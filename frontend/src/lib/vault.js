import db from './db.js';
import {
    randomBytes, toBase64, fromBase64,
    generateDeviceKey, wrapKeyWithPin, unwrapKeyWithPin, wrapWithRawKey, unwrapWithRawKey,
} from './crypto.js';
import { registerBiometricGate, unlockBiometricGate } from './biometricGate.js';

const VAULT_ID = 'current';
const MAX_ATTEMPTS_BEFORE_WIPE = 10;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_BASE_MS = 30_000;

export class InvalidPinError extends Error {}
export class LockedOutError extends Error {
    constructor(remainingMs) { super('Demasiados intentos. Espera un momento.'); this.remainingMs = remainingMs; }
}
export class VaultWipedError extends Error {}

export const vaultExists = async () => !!(await db.authVault.get(VAULT_ID));

export const hasBiometricGate = async () => {
    const vault = await db.authVault.get(VAULT_ID);
    return !!vault?.biometricCredentialId;
};

// Crea (o reemplaza) el vault de este dispositivo: genera una device key nueva,
// la envuelve con el PIN, y cifra el refreshToken con ella.
export const createVault = async ({ pin, refreshToken }) => {
    const deviceKeyBytes = await generateDeviceKey();
    const pinSalt = randomBytes(16);
    const pinWrap = await wrapKeyWithPin(pin, pinSalt, deviceKeyBytes);
    const tokenWrap = await wrapWithRawKey(deviceKeyBytes, new TextEncoder().encode(refreshToken));

    await db.authVault.put({
        id: VAULT_ID,
        pinSalt: toBase64(pinSalt),
        pinWrapIv: pinWrap.iv,
        pinWrapCiphertext: pinWrap.ciphertext,
        tokenIv: tokenWrap.iv,
        tokenCiphertext: tokenWrap.ciphertext,
        biometricCredentialId: null,
        deviceKeyPlainForBiometric: null,
        failedAttempts: 0,
        lockedUntil: null,
        createdAt: Date.now(),
    });
};

const recordFailedAttempt = async (vault) => {
    const failedAttempts = (vault.failedAttempts || 0) + 1;
    if (failedAttempts >= MAX_ATTEMPTS_BEFORE_WIPE) {
        await db.authVault.delete(VAULT_ID);
        throw new VaultWipedError('Demasiados intentos fallidos. Inicia sesión de nuevo.');
    }
    let lockedUntil = null;
    if (failedAttempts >= LOCKOUT_THRESHOLD) {
        lockedUntil = Date.now() + LOCKOUT_BASE_MS * Math.pow(2, failedAttempts - LOCKOUT_THRESHOLD);
    }
    await db.authVault.update(VAULT_ID, { failedAttempts, lockedUntil });
};

const checkLockout = (vault) => {
    if (vault.lockedUntil && Date.now() < vault.lockedUntil) {
        throw new LockedOutError(vault.lockedUntil - Date.now());
    }
};

// Descifra el vault con el PIN. Devuelve también la device key en claro (bytes)
// para que, si el caller lo necesita (ej. activar la huella desde Perfil),
// no tenga que pedir el PIN una segunda vez en el mismo flujo.
export const unlockWithPin = async (pin) => {
    const vault = await db.authVault.get(VAULT_ID);
    if (!vault) throw new VaultWipedError('No hay sesión guardada en este dispositivo.');
    checkLockout(vault);

    let deviceKeyBytes;
    try {
        deviceKeyBytes = await unwrapKeyWithPin(pin, fromBase64(vault.pinSalt), {
            iv: vault.pinWrapIv, ciphertext: vault.pinWrapCiphertext,
        });
    } catch {
        await recordFailedAttempt(vault);
        throw new InvalidPinError('PIN incorrecto');
    }

    await db.authVault.update(VAULT_ID, { failedAttempts: 0, lockedUntil: null });
    const tokenBytes = await unwrapWithRawKey(deviceKeyBytes, { iv: vault.tokenIv, ciphertext: vault.tokenCiphertext });
    const refreshToken = new TextDecoder().decode(tokenBytes);
    return { refreshToken, deviceKeyBytes };
};

export const destroyVault = async () => { await db.authVault.delete(VAULT_ID); };

// ── Gate biométrico local (atajo de conveniencia, no un 2do factor cripto) ──

// Requiere la device key ya en claro (normalmente recién salida de un
// unlockWithPin exitoso) para no tener que derivar nada nuevo — solo guarda
// una copia de esa misma clave, cuya única protección es que el código solo
// la lee después de que el sensor biométrico confirme localmente.
export const enableBiometricGate = async (deviceKeyBytes) => {
    const credentialId = await registerBiometricGate();
    await db.authVault.update(VAULT_ID, {
        biometricCredentialId: credentialId,
        deviceKeyPlainForBiometric: toBase64(deviceKeyBytes),
    });
};

export const disableBiometricGate = async () => {
    await db.authVault.update(VAULT_ID, { biometricCredentialId: null, deviceKeyPlainForBiometric: null });
};

export const unlockWithBiometric = async () => {
    const vault = await db.authVault.get(VAULT_ID);
    if (!vault?.biometricCredentialId) throw new Error('No hay huella configurada en este dispositivo');
    checkLockout(vault);

    const ok = await unlockBiometricGate(vault.biometricCredentialId);
    if (!ok) throw new InvalidPinError('No se pudo validar la huella');

    const deviceKeyBytes = fromBase64(vault.deviceKeyPlainForBiometric);
    const tokenBytes = await unwrapWithRawKey(deviceKeyBytes, { iv: vault.tokenIv, ciphertext: vault.tokenCiphertext });
    return { refreshToken: new TextDecoder().decode(tokenBytes), deviceKeyBytes };
};
