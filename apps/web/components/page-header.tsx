import Link from "next/link";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: string;
  actionHref?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  actionHref
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>

      {action && actionHref ? (
        <Link className="primary-button link-button" href={actionHref}>{action}</Link>
      ) : action ? (
        <button className="primary-button" type="button">{action}</button>
      ) : null}
    </header>
  );
}
