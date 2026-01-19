// frontend/src/components/ErrorBoundary.jsx

import React from 'react';

/**
 * A simple error boundary component for React.  When a descendant throws
 * during rendering, in a lifecycle method, or in the constructor, this
 * component will catch the error, log it, and display a fallback UI
 * instead of the broken component tree.  This improves user experience
 * by preventing the entire app from crashing due to a single component.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state to trigger fallback UI on next render
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details.  In a real app, you might send this
    // information to an error reporting service (Sentry, LogRocket, etc.).
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      // Render a fallback UI.  Keep it simple and non-interactive.
      return (
        <div className="errorBoundary">
          <h2>Something went wrong.</h2>
          <p>We apologize for the inconvenience. Please try refreshing the page.</p>
        </div>
      );
    }
    // When there's no error, render children normally.
    return this.props.children;
  }
}

export default ErrorBoundary;
