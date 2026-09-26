import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      let parsedDetails: Record<string, unknown> | null = null;
      try {
        parsedDetails = JSON.parse(this.state.errorMessage) as Record<string, unknown>;
      } catch {
        parsedDetails = null;
      }

      return (
        <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-[#111827] border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h2 className="text-base font-semibold tracking-tight">
                Security or Database Operation Rejected
              </h2>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              The operation was halted by a security boundary or network constraint.
            </p>

            {parsedDetails ? (
              <pre className="p-3 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(parsedDetails, null, 2)}
              </pre>
            ) : (
              <p className="p-3 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs font-mono text-slate-300 break-words">
                {this.state.errorMessage}
              </p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reload Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
