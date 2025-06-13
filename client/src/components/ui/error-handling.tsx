import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="max-w-md w-full p-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message || 'An unexpected error occurred'}
        </AlertDescription>
      </Alert>
      
      <div className="mt-4 flex space-x-2">
        <Button onClick={retry} className="flex-1">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="flex-1"
        >
          Reload Page
        </Button>
      </div>
      
      <details className="mt-4">
        <summary className="text-sm text-muted-foreground cursor-pointer">
          Technical Details
        </summary>
        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
          {error.stack}
        </pre>
      </details>
    </div>
  </div>
);

// Network Error Component
export const NetworkError: React.FC<{ retry: () => void }> = ({ retry }) => (
  <Alert variant="destructive">
    <WifiOff className="h-4 w-4" />
    <AlertTitle>Connection Error</AlertTitle>
    <AlertDescription>
      Unable to connect to the server. Please check your connection and try again.
    </AlertDescription>
    <Button onClick={retry} size="sm" className="mt-2">
      <RefreshCw className="h-4 w-4 mr-2" />
      Retry
    </Button>
  </Alert>
);

// Loading Spinner Component
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]} ${className}`} />
  );
};

// Page Loading Component
export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Inline Loading Component
export const InlineLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center py-8">
    <LoadingSpinner className="mr-2" />
    <span className="text-sm text-muted-foreground">{message}</span>
  </div>
);
