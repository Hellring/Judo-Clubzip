export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center">
      <div className="max-w-3xl text-center space-y-6 px-4">
        <h1 className="text-5xl font-bold tracking-tight text-primary">JudoClub Manager</h1>
        <p className="text-xl text-muted-foreground">Professional management for serious judo clubs.</p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <a href="/sign-in" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Sign In
          </a>
          <a href="/sign-up" className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}
