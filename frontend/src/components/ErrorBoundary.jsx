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
        <Alert variant="danger" className="m-4">
          <Alert.Heading>Something went wrong</Alert.Heading>
          <p>There was an error loading this page. Try refreshing or going back.</p>
          <Button variant="outline-danger" onClick={() => window.location.reload()}>
            Refresh page
          </Button>
        </Alert>
      );
    }
    return this.props.children;
  }
}
