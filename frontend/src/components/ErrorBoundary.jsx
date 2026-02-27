import { Component } from 'react';
import { Alert, Button } from 'react-bootstrap';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          variant="danger"
          className="m-4 d-flex flex-column"
          style={{
            borderLeft: '4px solid var(--bs-danger)',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <span className="me-2 mb-2" aria-hidden>⚠️</span>
          <Alert.Heading>Something went wrong</Alert.Heading>
          <p className="mb-3">There was an error loading this page. Try refreshing or going back.</p>
          <Button variant="outline-danger" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
        </Alert>
      );
    }
    return this.props.children;
  }
}
