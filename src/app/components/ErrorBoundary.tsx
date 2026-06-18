import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link, useRouteError, isRouteErrorResponse } from "react-router";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[Viterra] ErrorBoundary:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorFallback />;
    }
    return this.props.children;
  }
}

export function RouteErrorFallback() {
  const error = useRouteError();
  let message = "Ocurrió un error inesperado.";
  if (isRouteErrorResponse(error)) {
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }
  return <AppErrorFallback message={message} />;
}

function AppErrorFallback({ message = "Ocurrió un error inesperado." }: { message?: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-brand-canvas px-6 text-center">
      <h1 className="font-heading text-xl font-semibold text-brand-navy">Algo salió mal</h1>
      <p className="max-w-md text-sm text-brand-navy/70">{message}</p>
      <Link
        to="/"
        className="rounded-md border border-brand-navy px-5 py-2 text-sm font-medium text-brand-navy hover:bg-brand-navy hover:text-white"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
