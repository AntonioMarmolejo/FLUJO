import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleReload() {
        window.location.href = '/';
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    gap: '1rem',
                    fontFamily: 'sans-serif',
                    textAlign: 'center',
                    padding: '2rem',
                }}>
                    <h2 style={{ fontSize: '1.5rem', color: '#dc2626' }}>
                        Algo salió mal
                    </h2>
                    <p style={{ color: '#6b7280', maxWidth: '400px' }}>
                        Ocurrió un error inesperado. Puedes volver al inicio e intentarlo de nuevo.
                    </p>
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            fontSize: '1rem',
                        }}
                    >
                        Volver al inicio
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
