// Gate biométrico LOCAL para desbloquear el vault — deliberadamente separado
// de AuthContext.jsx / webauthn.controller.js (ese es el login completo,
// verificado contra el servidor; esto NUNCA habla con el backend).
//
// El challenge se genera aquí mismo, en el cliente, y no se guarda ni se
// verifica en ningún lado: lo único que importa es si la promesa de
// navigator.credentials.get() resuelve o no. Que resuelva ES la confirmación
// de identidad (el sensor del sistema operativo ya validó localmente) — no es
// un factor criptográfico independiente, es un atajo de conveniencia sobre el
// mismo secreto que protege el PIN (ver vault.js).
const RP_NAME = 'Flujo (desbloqueo local)';

export const isBiometricGateSupported = async () => {
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
};

// Crea una credencial de plataforma nueva, exclusiva para este gate local.
// Devuelve el credentialId en base64 para guardarlo junto al vault.
export const registerBiometricGate = async () => {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
        publicKey: {
            challenge,
            rp: { name: RP_NAME },
            user: { id: userId, name: 'desbloqueo-local', displayName: 'Desbloqueo local' },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
            timeout: 60_000,
            attestation: 'none',
        },
    });
    if (!credential) throw new Error('No se pudo crear la credencial biométrica');
    return btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
};

// Dispara el sensor nativo (huella/Face ID/Windows Hello). Resuelve `true`
// solo si el sistema operativo confirmó la identidad localmente.
export const unlockBiometricGate = async (credentialIdB64) => {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const idBytes = Uint8Array.from(atob(credentialIdB64), c => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge,
            allowCredentials: [{ id: idBytes, type: 'public-key' }],
            userVerification: 'required',
            timeout: 60_000,
        },
    });
    return !!assertion;
};
