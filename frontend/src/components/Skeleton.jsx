import '../styles/Skeleton.css';

// Miniaturas de carga. Cada una reutiliza las clases reales de su pantalla (filas,
// tarjetas, tablas), para que al llegar los datos el contenido no salte de lugar.

const repetir = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

// Anchos distintos por fila, para que se parezca a texto real
const ANCHOS = ['70', '50', '80', '40', '60'];
const ancho = (i, salto = 0) => ANCHOS[(i + salto) % ANCHOS.length];

// Una barra. forma: texto | titulo | chip | boton | avatar | imagen | barra
export const Sk = ({ ancho: a = '100', forma = 'texto' }) => (
    <span className={`skeleton skeleton--${forma} skeleton--ancho-${a}`} />
);

// Avisa a los lectores de pantalla que se está cargando y aparece con un leve
// retraso, para que una carga rápida no llegue a parpadear.
const Zona = ({ children, className = '' }) => (
    <div className={`skeleton-zona ${className}`} role="status" aria-busy="true" aria-label="Cargando">
        <div className="skeleton-zona__contenido" aria-hidden="true">{children}</div>
    </div>
);

// ── Inicio ──────────────────────────────────────────────
export const SkeletonMovimientos = ({ filas = 5 }) => (
    <Zona>
        {repetir(filas, i => (
            <div key={i} className="mov__item">
                <div className="mov__item-inner">
                    <div className="mov__card-body">
                        <div className="mov__icon"><Sk ancho="60" /></div>
                        <div className="mov__info skeleton-pila">
                            <Sk forma="titulo" ancho={ancho(i, 3)} />
                            <Sk ancho={ancho(i)} />
                            <Sk ancho={ancho(i, 1)} />
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </Zona>
);

export const SkeletonBitacora = ({ filas = 6 }) => (
    <Zona>
        <div className="bit__list-wrap">
            {repetir(filas, i => (
                <div key={i} className="bit__item">
                    <div className="bit__card">
                        <div className="bit__card-r1">
                            <div className="bit__card-horas skeleton-crece"><Sk forma="titulo" ancho={ancho(i, 2)} /></div>
                            <div className="bit__card-r1-right"><Sk forma="chip" /></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </Zona>
);

export const SkeletonRegistro = ({ filas = 4 }) => (
    <Zona>
        <div className="reg__list">
            {repetir(filas, i => (
                <div key={i} className="reg__entry">
                    <div className="reg__entry-inner">
                        <div className="reg__narrativa skeleton-pila">
                            <Sk />
                            <Sk />
                            <Sk ancho={ancho(i)} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </Zona>
);

export const SkeletonGrafica = () => (
    <Zona className="ws__chart-cargando">
        <div className="skeleton-grafica">
            {repetir(9, i => <span key={i} className="skeleton skeleton--columna" />)}
        </div>
    </Zona>
);

// ── Placas, Personas y Extensiones ──────────────────────
// Los títulos de las columnas se muestran de verdad: ya se conocen de antemano
export const SkeletonTabla = ({ columnas, titulos, filas = 8 }) => (
    <Zona>
        <div className="ftable__scroll">
            <div className={`ftable__head ${columnas}`}>
                {titulos.map(t => <span key={t} className="ftable__head-cell">{t}</span>)}
            </div>
            <div className="ftable">
                {repetir(filas, i => (
                    <div key={i} className="ftable__row-wrap">
                        <div className={`ftable__row ${columnas}`}>
                            {titulos.map((t, j) => (
                                <span key={t} className="ftable__cell"><Sk ancho={ancho(i, j)} /></span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </Zona>
);

// ── Firmas ──────────────────────────────────────────────
export const SkeletonFirmas = ({ tarjetas = 6 }) => (
    <Zona>
        <div className="firma__grid firma__coleccion">
            {repetir(tarjetas, i => (
                <div key={i} className="firma__card skeleton-pila">
                    <Sk forma="imagen" />
                    <Sk forma="titulo" ancho={ancho(i)} />
                    <Sk forma="chip" />
                    <Sk ancho={ancho(i, 1)} />
                </div>
            ))}
        </div>
    </Zona>
);

// ── Plataformas y Nominativos ───────────────────────────
export const SkeletonPlataformas = ({ secciones = 4 }) => (
    <Zona>
        {repetir(secciones, i => (
            <div key={i} className="plat__seccion">
                <div className="plat__seccion-header">
                    <Sk forma="boton" />
                    <span className="plat__seccion-titulo skeleton-crece"><Sk forma="titulo" ancho={ancho(i)} /></span>
                    <Sk forma="chip" />
                </div>
            </div>
        ))}
    </Zona>
);

// ── Flujos ──────────────────────────────────────────────
export const SkeletonFlujoEtiquetas = ({ cantidad = 4 }) => (
    <Zona>
        <div className="flujo__tags-row">
            {repetir(cantidad, i => (
                <div key={i} className="flujo__tag skeleton-pila skeleton-etiqueta">
                    <Sk forma="titulo" ancho="80" />
                    <Sk ancho="50" />
                </div>
            ))}
        </div>
    </Zona>
);

export const SkeletonFlujoMeses = () => (
    <Zona>
        <div className="flujo__mes-grid">
            {repetir(12, i => (
                <div key={i} className="flujo__mes-tile"><Sk forma="titulo" ancho="60" /></div>
            ))}
        </div>
    </Zona>
);

export const SkeletonFlujoDias = ({ filas = 5 }) => (
    <Zona>
        <div className="flujos__dias">
            {repetir(filas, i => (
                <div key={i} className="flujo__card">
                    <div className="flujo__card-info skeleton-pila">
                        <Sk forma="titulo" ancho={ancho(i, 2)} />
                        <Sk ancho="40" />
                    </div>
                </div>
            ))}
        </div>
    </Zona>
);

// ── Jefes Inmediatos ────────────────────────────────────
export const SkeletonFuncionarios = ({ tarjetas = 4 }) => (
    <Zona>
        {repetir(tarjetas, i => (
            <div key={i} className="fp__card">
                <div className="fp__card-top">
                    <div className="fp__card-rol-fila">
                        <span className="skeleton-crece"><Sk ancho={ancho(i)} /></span>
                        <Sk forma="chip" />
                    </div>
                    <div className="fp__card-fechas">
                        <span className="skeleton-crece"><Sk ancho="50" /></span>
                        <Sk forma="chip" />
                    </div>
                </div>
                <div className="fp__card-nombre"><Sk forma="titulo" ancho={ancho(i, 1)} /></div>
                <Sk forma="barra" />
                <div className="fp__card-pie">
                    <div className="fp__card-back skeleton-crece">
                        <Sk forma="avatar" />
                        <div className="fp__card-back-info skeleton-pila skeleton-crece">
                            <Sk ancho="40" />
                            <Sk ancho={ancho(i, 2)} />
                        </div>
                    </div>
                    <Sk forma="chip" />
                </div>
            </div>
        ))}
    </Zona>
);

// ── Calendario ──────────────────────────────────────────
export const SkeletonCalendario = () => (
    <Zona>
        <div className="cal__grupo">
            <div className="cal__grupo-btn"><span className="skeleton-crece"><Sk forma="titulo" ancho="50" /></span></div>
        </div>
        <div className="cal__tabs skeleton-reparto">
            {repetir(3, i => <Sk key={i} forma="chip" />)}
        </div>
        <div className="cal__mes">
            <div className="cal__mes-nav">
                <Sk forma="boton" />
                <Sk forma="titulo" ancho="40" />
                <Sk forma="boton" />
            </div>
            <div className="cal__semana">
                {repetir(7, i => <div key={i} className="cal__semana-dia"><Sk ancho="60" /></div>)}
            </div>
            <div className="cal__mes-grid">
                {repetir(35, i => <div key={i} className="cal__dia"><Sk ancho="50" /></div>)}
            </div>
        </div>
    </Zona>
);

// ── Administración ──────────────────────────────────────
export const SkeletonUsuarios = ({ tarjetas = 5 }) => (
    <Zona>
        <div className="adm__lista">
            {repetir(tarjetas, i => (
                <div key={i} className="adm__card">
                    <Sk forma="avatar" />
                    <div className="adm__card-info skeleton-pila skeleton-crece">
                        <Sk forma="titulo" ancho={ancho(i)} />
                        <Sk ancho={ancho(i, 2)} />
                        <Sk ancho="40" />
                    </div>
                </div>
            ))}
        </div>
    </Zona>
);

export const SkeletonComentarios = ({ tarjetas = 3 }) => (
    <Zona>
        <div className="adm__lista">
            {repetir(tarjetas, i => (
                <div key={i} className="adm__comentario skeleton-pila">
                    <Sk forma="titulo" ancho={ancho(i, 3)} />
                    <Sk ancho="40" />
                    <Sk />
                    <Sk ancho={ancho(i)} />
                </div>
            ))}
        </div>
    </Zona>
);

// ── Pantalla completa (al abrir la app) ─────────────────
// El tema se aplica solo aquí: la página todavía no lo ha puesto en el documento
const leerTema = () => {
    try { return localStorage.getItem('flujo-theme') || 'dark'; } catch { return 'dark'; }
};

export const SkeletonApp = () => (
    <div className="skeleton-app" data-theme={leerTema()}>
        <div className="ws__wrapper">
            <div className="ws__topbar">
                <div className="ws__topbar-btn" />
                <span className="ws__topbar-title"><Sk forma="titulo" ancho="30" /></span>
                <div className="ws__topbar-acciones">
                    <div className="ws__topbar-btn" />
                    <div className="ws__topbar-btn" />
                </div>
            </div>
            <div className="ws__body">
                <div className="ws__vista-tabs skeleton-reparto">
                    {repetir(3, i => <Sk key={i} forma="chip" />)}
                </div>
                <SkeletonMovimientos />
            </div>
            <div className="ws__navbar">
                {repetir(3, i => <div key={i} className="ws__nav-btn"><Sk forma="boton" /></div>)}
            </div>
        </div>
    </div>
);
