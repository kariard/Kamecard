import type { ReactNode } from 'react'

interface PageIntroProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageIntro({ eyebrow, title, description, actions }: PageIntroProps) {
  return (
    <section className="page-intro">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-intro__description">{description}</p> : null}
      </div>
      {actions ? <div className="page-intro__actions">{actions}</div> : null}
    </section>
  )
}
