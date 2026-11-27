import React from 'react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: 'forest' | 'royal';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  tone = 'forest',
}) => {
  const iconTone =
    tone === 'royal' ? 'bg-lavender text-royal' : 'bg-sage text-forest';

  return (
    <section className="cs-card mx-auto max-w-2xl p-8 text-center">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${iconTone}`}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-muted">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  );
};
