import { Component } from 'react';
import { Button, EmptyState } from '@/components/ui';

// Last line of defence: a render crash shows a friendly screen with a way out, never a blank page.
export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { if (import.meta.env.DEV) console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <EmptyState illustration="error" title="Something went wrong on our side" description="Your parcels are safe. Reload to continue."
          action={<Button onClick={() => window.location.assign('/')}>Reload SlotDrop</Button>} />
      </div>
    );
  }
}
