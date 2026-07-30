import { useLanguage } from '../context/LanguageContext'

const planOrder = ['free', 'pro', 'max']

function PricingPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-surface-border bg-surface-raised p-8 shadow-sm shadow-black/10">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('pricingPage.heading')}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{t('pricingPage.title')}</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">{t('pricingPage.subtitle')}</p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {planOrder.map((planKey) => {
          const isFeatured = planKey === 'pro'
          return (
            <article
              key={planKey}
              className={`rounded-3xl border p-6 shadow-sm transition ${
                isFeatured
                  ? 'border-accent bg-accent/10 shadow-accent/20'
                  : 'border-surface-border bg-surface-raised shadow-black/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">{t(`pricingPage.plans.${planKey}.name`)}</h2>
                {isFeatured && (
                  <span className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                    {t('pricingPage.popular')}
                  </span>
                )}
              </div>

              <p className="mt-4 text-3xl font-bold text-white">{t(`pricingPage.plans.${planKey}.price`)}</p>
              <p className="mt-1 text-sm text-slate-400">{t('pricingPage.perMonth')}</p>

              <ul className="mt-6 space-y-3">
                {[1, 2, 3].map((featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-accent" />
                    <span>{t(`pricingPage.plans.${planKey}.feature${featureIndex}`)}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="mt-8 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-surface-base transition hover:bg-accent-hover"
              >
                {t('pricingPage.getStarted')}
              </button>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default PricingPage
