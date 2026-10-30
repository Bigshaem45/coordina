import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card } from './ui';
import { Icon } from './Icon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled COORDINA error caught by boundary:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-slate-900 dark:bg-midnight-950 dark:text-slate-100">
          <Card className="max-w-md p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50 text-coral-500 dark:bg-coral-500/15 dark:text-coral-400">
              <Icon name="error" className="text-3xl" />
            </div>
            <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
            <p className="muted mt-1 text-xs">
              {this.state.error?.message ?? 'An unexpected render error occurred.'}
            </p>
            <div className="mt-5 flex gap-2">
              <Button full variant="outline" onClick={() => (window.location.href = '/')}>
                Go to Home
              </Button>
              <Button full onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

