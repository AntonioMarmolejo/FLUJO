import '../styles/PinScreen.css';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// Teclado numérico + indicador de dígitos, reutilizado por LockScreen y
// CreatePinScreen. Es puramente presentacional: el que lo usa decide qué
// hacer con cada dígito (crear PIN, confirmar PIN, desbloquear vault...).
const PinPad = ({ length = 6, value, onDigit, onBackspace, error, shake, disabled, extraKey }) => (
    <>
        <div className={`pin-dots${error ? ' error' : ''}${shake ? ' shake' : ''}`}>
            {Array.from({ length }).map((_, i) => (
                <span key={i} className={`pin-dot${i < value.length ? ' filled' : ''}`} />
            ))}
        </div>
        <div className="pin-keypad">
            {KEYS.map(k => (
                <button key={k} className="pin-key" type="button" disabled={disabled}
                    onClick={() => onDigit(k)}>{k}</button>
            ))}
            {extraKey || <span className="pin-key ghost" />}
            <button className="pin-key" type="button" disabled={disabled} onClick={() => onDigit('0')}>0</button>
            <button className="pin-key" type="button" disabled={disabled || !value.length} onClick={onBackspace}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 4H8l-7 8 7 8h13a1 1 0 001-1V5a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M13 9l4 6M17 9l-4 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    </>
);

export default PinPad;
