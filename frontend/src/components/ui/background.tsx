export function LandingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
          maskImage: 'linear-gradient(to bottom, black, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 80%)',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--background)/0.92)_45%,hsl(var(--background))_100%)]" />
    </div>
  );
}
