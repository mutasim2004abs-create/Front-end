interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ eyebrow, title, subtitle }: ScreenHeaderProps): JSX.Element {
  return (
    <header className="mb-5">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h1 className="text-2xl font-extrabold leading-tight text-white">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-gray">{subtitle}</p> : null}
    </header>
  );
}
