import { useLanguage } from '../context/LanguageContext'

const navItems = [
  { label: 'nav.overview', active: true },
  { label: 'nav.userManagement' },
  { label: 'nav.requestHistory' },
  { label: 'nav.aiMonitor' },
]

const stats = [
  { label: 'dashboard.usersTotal', value: '67M', delta: '+2.5%', helper: 'dashboard.activeUsers' },
  { label: 'dashboard.totalRequests', value: '67.67K', delta: '-1.2%', helper: 'dashboard.requests' },
  { label: 'dashboard.averageLatency', value: '6.7s', delta: null, helper: 'dashboard.latency' },
  { label: 'dashboard.successRate', value: '99.67%', delta: null, helper: 'dashboard.success' },
]

function DashboardPage() {
  const { t } = useLanguage()

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="hidden rounded-3xl border border-surface-border bg-surface-raised p-6 lg:block">
        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">
            {t('nav.dashboard')}
          </div>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                item.active
                  ? 'bg-accent/10 text-white shadow-sm shadow-accent/20'
                  : 'text-slate-300 hover:bg-surface-elevated hover:text-white'
              }`}
            >
              <span>{t(item.label)}</span>
              {item.active && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.24em] text-accent">{t('dashboard.active')}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-surface-border bg-surface-raised p-6 shadow-sm shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{t('dashboard.subtitle')}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[220px_100px]">
              <div className="rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-slate-300">
                <div className="text-slate-500">{t('dashboard.startDate')}</div>
                <div className="mt-2 text-white">12 Jul 2026</div>
              </div>
              <div className="rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-slate-300">
                <div className="text-slate-500">{t('dashboard.endDate')}</div>
                <div className="mt-2 text-white">18 Jul 2026</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-3xl border border-surface-border bg-surface-raised p-5 shadow-sm shadow-black/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t(item.label)}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </div>
                {item.delta ? (
                  <span className="rounded-2xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                    {item.delta}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">&nbsp;</span>
                )}
              </div>
              <p className="mt-4 text-sm text-slate-400">{t(item.helper)}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-surface-border bg-surface-raised p-5 shadow-sm shadow-black/10">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('dashboard.requestTraffic')}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{t('dashboard.trafficOverview')}</h2>
              </div>
              <div className="rounded-2xl bg-surface-base px-3 py-2 text-sm text-slate-300">24h</div>
            </div>
            <div className="mt-6 h-60 overflow-hidden rounded-3xl bg-surface-base/40 p-4">
              <svg viewBox="0 0 600 220" className="h-full w-full">
                <defs>
                  <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 180 C80 140 140 170 220 120 C300 70 360 90 420 80 C480 70 540 90 600 60"
                  fill="none"
                  stroke="url(#line-gradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-surface-border bg-surface-raised p-5 shadow-sm shadow-black/10">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('dashboard.vramUsage')}</p>
              <div className="mt-6 flex items-center justify-center">
                <div className="relative h-40 w-40">
                  <div className="absolute inset-0 rounded-full border border-surface-border bg-slate-900/70" />
                  <div className="absolute inset-4 rounded-full border-8 border-slate-700" />
                  <div className="absolute inset-10 rounded-full border-8 border-accent" />
                  <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">67%</div>
                </div>
              </div>
              <div className="mt-5 text-center text-sm text-slate-400">{t('dashboard.vramNote')}</div>
            </div>

            <div className="rounded-3xl border border-surface-border bg-surface-raised p-5 shadow-sm shadow-black/10">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('dashboard.inputFormats')}</p>
              <div className="mt-6 grid gap-3">
                {['Text', 'PDF', 'DOCX'].map((format) => (
                  <div key={format} className="flex items-center gap-3 rounded-2xl bg-surface-base px-4 py-3">
                    <span className="h-3 w-3 rounded-full bg-slate-400" />
                    <div>
                      <p className="text-sm text-white">{format}</p>
                      <p className="text-xs text-slate-500">{format === 'DOCX' ? '24%' : '38%'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl border border-surface-border bg-surface-raised p-5 shadow-sm shadow-black/10">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('dashboard.usersByCountry')}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{t('dashboard.topRegions')}</h2>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {[
                { country: 'United States', value: '27.5%', count: '4.5M' },
                { country: 'Australia', value: '11.2%', count: '2.3M' },
                { country: 'China', value: '9.4%', count: '2M' },
                { country: 'Germany', value: '8%', count: '1.7M' },
              ].map((row) => (
                <div key={row.country} className="flex items-center justify-between gap-3 rounded-3xl bg-surface-base px-4 py-3">
                  <div>
                    <p className="text-sm text-white">{row.country}</p>
                    <p className="text-xs text-slate-500">{row.count}</p>
                  </div>
                  <span className="text-sm font-semibold text-white">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-surface-border bg-surface-raised p-5 shadow-sm shadow-black/10">
            <div className="flex items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t('dashboard.userFeedback')}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{t('dashboard.distribution')}</h2>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center">
              <div className="relative h-52 w-52">
                <div className="absolute inset-0 rounded-full bg-slate-900/60" />
                <div className="absolute inset-6 rounded-full bg-slate-800 ring-8 ring-surface-border" />
                <div className="absolute inset-12 rounded-full bg-accent/60" />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: t('dashboard.like'), value: '$1.2M', delta: '+8.2%' },
                { label: t('dashboard.dislikeIncohesive'), value: '$800K', delta: '+7%' },
                { label: t('dashboard.dislikeSpeMist'), value: '$645K', delta: '+2.5%' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-surface-base px-4 py-3 text-sm text-slate-300">
                  <span>{item.label}</span>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
