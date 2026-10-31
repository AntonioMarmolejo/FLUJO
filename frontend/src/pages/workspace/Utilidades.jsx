import { useState } from 'react';
import { PantallaFirmas } from './Firmas';
import { PantallaPlataformas } from './Plataformas';

// ── Pantalla Utilidades ────────────────────────────────────
const UTIL_ITEMS = [
    {
        id: 'firmas', label: 'Firmas\nFuncionarios',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M17 3a2.828 2.828 0 114 4L8 20l-5 1 1-5L17 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'plataformas', label: 'Plataformas y\nNominativos',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="3" y="13" width="18" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="3" width="18" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
    },
    {
        id: 'mapas', label: 'Mapas de\nLocaciones',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 13 6 13s6-7.75 6-13c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.8"/></svg>,
    },
    {
        id: 'distancias', label: 'Distancias',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 12l3.5-3M3 12l3.5 3M21 12l-3.5-3M21 12l-3.5 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'codigos-radio', label: 'Códigos\nde Radio',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="7" y="8" width="10" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M10 3h4M12 3v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="17" r="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
    {
        id: 'nominativo-radio', label: 'Nominativo\nRadio',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 20c0-3.5 3.1-6 7-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 13l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'nominativo-personal', label: 'Nominativo\nPersonal',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M1 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="18" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M16 20c0-2.5 1.5-4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    },
    {
        id: 'luminarias', label: 'Control de\nLuminarias',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M9 21h6M12 3a6 6 0 016 6c0 2.4-1.2 4.5-3 5.7V17H9v-2.3C7.2 13.5 6 11.4 6 9a6 6 0 016-6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
        id: 'consignas-permanentes', label: 'Consignas\nPermanentes',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8"/><path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    },
    {
        id: 'novedades-importantes', label: 'Novedades\nImportantes',
        icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
];

export const PantallaUtilidades = ({ turnoActivo, onDetalleChange, platSearchQuery }) => {
    const [detalle, setDetalleRaw] = useState(null);
    const setDetalle = tile => { setDetalleRaw(tile); onDetalleChange?.(tile?.id ?? null); };

    if (detalle) {
        return (
            <div className="util-detalle">
                <button className="util-back-btn" onClick={() => setDetalle(null)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Volver
                </button>
                {detalle.id === 'firmas' ? (
                    <PantallaFirmas turnoActivo={turnoActivo} />
                ) : detalle.id === 'plataformas' ? (
                    <PantallaPlataformas turnoActivo={turnoActivo} search={platSearchQuery} />
                ) : (
                    <>
                        <h2 className="util-detalle-titulo">{detalle.label.replace('\n', ' ')}</h2>
                        <div className="util-detalle-contenido">
                            <p className="ws-empty">Próximamente</p>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="util-grid">
            {UTIL_ITEMS.map(u => (
                <button key={u.id} className="util-tile" onClick={() => setDetalle(u)}>
                    <div className="util-tile-icon">{u.icon}</div>
                    <span className="util-tile-label">{u.label}</span>
                </button>
            ))}
        </div>
    );
};
