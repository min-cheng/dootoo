import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'

function B({ children }: { children: ReactNode }) {
  return <span className="font-medium text-gray-900 dark:text-gray-100">{children}</span>
}

function Hl({ children }: { children: ReactNode }) {
  return <mark className="bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded px-0.5">{children}</mark>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-4 py-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 items-start">
          <span className="w-6 h-6 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <div>{item}</div>
        </li>
      ))}
    </ol>
  )
}

const examples: { typed: ReactNode; result: string }[] = [
  { typed: <>Call the plumber <Hl>tomorrow at 9am</Hl></>, result: 'Due tomorrow at 9:00 am' },
  { typed: <>Pay water bill <Hl>june 15</Hl> <Hl>#home</Hl></>, result: 'Due June 15, with a “home” label' },
  { typed: <>Book flights <Hl>!!</Hl></>, result: "Starred, so it's easy to find" },
  { typed: <>Pick paint colors <Hl>~Min</Hl></>, result: 'Filed under Waiting, as waiting on Min' },
  { typed: <>Take vitamins <Hl>every day</Hl></>, result: 'Repeats every day' },
  { typed: <>Book club <Hl>last thursday of the month</Hl></>, result: 'Repeats on the last Thursday of each month' },
]

const places: [string, string][] = [
  ['Today', 'Due today, plus anything overdue.'],
  ['Upcoming', "What's coming in the days ahead."],
  ['All', 'Every task you have.'],
  ['Board', 'Drag tasks between To Do, In Progress and Done.'],
  ['More', 'Starred, Waiting, Calendar, your labels, dark mode, and this page.'],
]

const links = [
  { href: 'https://github.com/min-cheng/dootoo/issues/new', what: 'Suggest a feature or report a problem', why: 'Open an issue, or just tell Min.', url: 'github.com/min-cheng/dootoo/issues' },
  { href: 'https://github.com/min-cheng/dootoo', what: 'Look at the code', why: 'The README covers the stack: React, Vite, Supabase, Vercel.', url: 'github.com/min-cheng/dootoo' },
]

export default function AboutView() {
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">About dootoo</h1>
      </div>

      <Section title="Install it">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">On your iPhone</h3>
        <Steps items={[
          <>Open <B>dootoo.vercel.app</B> in Safari.</>,
          <>Tap the Share button (the square with an arrow), then <B>Add to Home Screen</B>. dootoo now opens like any other app.</>,
        ]} />
        <h3 className="font-medium text-gray-900 dark:text-gray-100 pt-2">On your laptop</h3>
        <Steps items={[
          <>Open <B>dootoo.vercel.app</B> in Brave, Chrome or Edge (Firefox can't install sites as apps).</>,
          <>In Brave or Chrome, open the browser menu and choose <B>Install page as app</B>; Chrome keeps it under <B>Cast, save, and share</B>. In Edge: <B>⋯</B> → <B>Apps</B> → <B>Install this site as an app</B>.</>,
          <>Right-click dootoo's taskbar icon and choose <B>Pin to taskbar</B>.</>,
        ]} />
      </Section>

      <Section title="Add a task">
        <p>
          Tap the purple <B>+</B> in the bottom corner (on a laptop, press <B>Q</B> or <B>Ctrl+K</B>) and type the task the way you'd say it.
          dootoo picks out dates, times and a few shortcuts for you.
        </p>
        <div className="flex flex-col gap-2.5">
          {examples.map(({ typed, result }) => (
            <div key={result} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-1 sm:gap-3 sm:items-center">
              <div className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-medium break-words">
                {typed}
              </div>
              <div className="px-1 sm:px-0">{result}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Dates it understands: today, tomorrow, next week, a day like friday, or a date like june 15 (spell out the month). Times: at 3pm or at 3:30pm.
        </p>
      </Section>

      <Section title="Find your way">
        <p>On your phone, the bar along the bottom switches between lists. On a laptop, the same lists sit in the sidebar on the left.</p>
        <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-2">
          {places.map(([name, desc]) => (
            <div key={name} className="contents">
              <dt className="font-medium text-gray-900 dark:text-gray-100">{name}</dt>
              <dd>{desc}</dd>
            </div>
          ))}
        </dl>
        <p>Tap the circle next to a task to check it off. Tap the task itself to add notes, smaller steps, or labels.</p>
        <p>To delete a task, tap it, then tap the trash can at the top of the panel that opens. Deleting is instant and can't be undone.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">Laptop shortcuts: Q or Ctrl+K adds a task, 1–5 switch lists, Esc closes a panel.</p>
      </Section>

      <Section title="Forgot your password?">
        <p>
          On the sign-in screen, tap <B>Forgot password?</B>, enter your email, and tap <B>Email me a reset link</B>.
          Open the email, tap the link, and choose a new password.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">No email after a few minutes? Check spam. If it's not there, wait an hour and try again.</p>
      </Section>

      <Section title="Ideas, bugs, or want to tinker?">
        <p>dootoo's code is public on GitHub. You're welcome to suggest changes or make them yourself.</p>
        <div className="flex flex-col gap-2">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="font-medium text-gray-900 dark:text-gray-100">{link.what}</span>
                <span>{link.why}</span>
                <span className="text-violet-600 dark:text-violet-400 break-all">{link.url}</span>
              </div>
              <ArrowUpRight size={16} className="mt-0.5 text-gray-300 dark:text-gray-600 group-hover:text-violet-500" />
            </a>
          ))}
        </div>
        <p>
          Want to push changes? Ask Min to add you as a collaborator. Pushes to <code className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5">main</code> deploy
          automatically, and pull requests get a Vercel preview link. If you use Claude Code, it picks up the repo's{' '}
          <code className="text-xs bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5">CLAUDE.md</code>.
        </p>
      </Section>
    </div>
  )
}
