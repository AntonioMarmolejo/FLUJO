// Helpers criptográficos puros (Web Crypto API). Sin dependencias de Dexie/React
// para que sean fáciles de razonar y probar por separado.

const PBKDF2_ITERATIONS = 600_000; // guideline OWASP 2023 para PBKDF2-SHA256

export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

export const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

export const fromBase64 = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

// Deriva una AES-GCM key a partir del PIN + salt. Nunca se guarda esta clave,
// se recalcula cada vez que el usuario escribe su PIN.
export const deriveKeyFromPin = async (pin, saltBytes) => {
    const pinKey = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        pinKey,
        { name: 'AES-GCM', length: 256 },
        true, // extraíble: se exporta para guardar la device key envuelta
        ['encrypt', 'decrypt']
    );
};

// Genera la "device key" real que cifra el refreshToken — aleatoria, una sola vez.
export const generateDeviceKey = async () => {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const raw = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(raw);
};

const importRawAesKey = (rawBytes) =>
    crypto.subtle.importKey('raw', rawBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);

// Cifra `plaintextBytes` con `kek` (una CryptoKey AES-GCM). IV nuevo en cada llamada.
export const wrapWithKey = async (kek, plaintextBytes) => {
    const iv = randomBytes(12);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, plaintextBytes);
    return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
};

// Descifra. Lanza si el PIN/clave no coincide (el tag de autenticación de GCM falla).
export const unwrapWithKey = async (kek, { iv, ciphertext }) => {
    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(iv) }, kek, fromBase64(ciphertext)
    );
    return new Uint8Array(plaintext);
};

// Variante de wrap/unwrap que recibe la device key como bytes crudos (no CryptoKey)
// — conveniencia para cifrar/descifrar el refreshToken con la device key ya generada.
export const wrapWithRawKey = async (rawKeyBytes, plaintextBytes) =>
    wrapWithKey(await importRawAesKey(rawKeyBytes), plaintextBytes);

export const unwrapWithRawKey = async (rawKeyBytes, payload) =>
    unwrapWithKey(await importRawAesKey(rawKeyBytes), payload);

export const wrapKeyWithPin = async (pin, saltBytes, rawKeyBytes) =>
    wrapWithKey(await deriveKeyFromPin(pin, saltBytes), rawKeyBytes);

export const unwrapKeyWithPin = async (pin, saltBytes, payload) =>
    unwrapWithKey(await deriveKeyFromPin(pin, saltBytes), payload);
