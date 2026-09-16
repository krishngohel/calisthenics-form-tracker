import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="card p-8">
        <h1 className="mb-2 text-xl font-bold text-foreground">Page not found</h1>
        <p className="mb-6 text-sm text-muted">That page does not exist.</p>
        <Link href="/skills" className="btn-primary text-sm">
          Browse learning paths
        </Link>
      </div>
    </div>
  );
}
