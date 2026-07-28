import { Component } from "react";
import { RefreshCw } from "lucide-react";

// Class component: getDerivedStateFromError has no hook equivalent, so a render
// crash anywhere below this point can only be caught here.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info?.componentStack);
  }

  handleReload = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-base-100">
        <div className="card bg-base-200 max-w-md w-full">
          <div className="card-body items-center text-center gap-3">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-base-content/70">
              This page didn&apos;t load correctly. Reloading usually fixes it.
            </p>
            <button
              onClick={this.handleReload}
              className="btn btn-primary mt-2 gap-2"
            >
              <RefreshCw className="size-4" />
              Reload Kendro
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
