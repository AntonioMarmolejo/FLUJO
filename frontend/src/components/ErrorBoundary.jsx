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
                <div className="error-pantalla">
                    <h2 className="error-pantalla__titulo">
                        Algo salió mal
                    </h2>
                    <p className="error-pantalla__texto">
                        Ocurrió un error inesperado. Puedes volver al inicio e intentarlo de nuevo.
                    </p>
                    <button
                        className="error-pantalla__btn"
                        onClick={this.handleReload}
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
