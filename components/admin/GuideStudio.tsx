'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { GUIDE_TOPICS, type GuideTopic } from '@/lib/guides'
import { STUDIO_GUIDE_TYPES, STUDIO_LENGTHS, STUDIO_MODES, STUDIO_READERS, type StudioGuideType, type StudioLength, type StudioMode, type StudioReader } from '@/lib/guides/studio-options'
import { buildGuidePrompt } from '@/lib/guides/studio-prompt'
import { GUIDE_TOPIC_BANK, ideaExists, type GuideIdea } from '@/lib/content/guide-topic-bank'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FormAlert } from '@/components/forms/FormParts'
import { cn } from '@/lib/cn'
import { Panel } from './AdminUi'

const TEXT_LABEL: Record<StudioMode, { label: string; placeholder: string }> = {
  topic: { label: 'Topic', placeholder: 'For example: checking a title deed' },
  idea: { label: 'Idea', placeholder: 'For example: what to agree with a contractor before the foundations are poured' },
  url: { label: 'Reference URL (inspiration only; the site does not open it)', placeholder: 'https://…' },
}

/** Guide studio: builds a prompt for AB's own Claude chat. Nothing here calls an AI service or saves anything. */
export function GuideStudio({ titles }: { titles: string[] }) {
  const [mode, setMode] = useState<StudioMode>('topic')
  const [text, setText] = useState('')
  const [topic, setTopic] = useState<GuideTopic>('building')
  const [reader, setReader] = useState<StudioReader>('diaspora')
  const [guideType, setGuideType] = useState<StudioGuideType>('how-to')
  const [length, setLength] = useState<StudioLength>('standard')
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  function build() {
    if (!text.trim()) {
      setError(`Enter the ${mode === 'url' ? 'reference URL' : mode} first.`)
      return
    }
    setError('')
    setCopied(false)
    setPrompt(buildGuidePrompt({ mode, text, topic, reader, guideType, length }))
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      promptRef.current?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function pickIdea(idea: GuideIdea) {
    setMode('idea')
    setText(idea.title)
    setTopic(idea.topic)
    setReader(idea.reader)
    setGuideType(idea.guideType)
    setPrompt('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-5">
      <div ref={formRef}>
        <Panel title="Build a prompt">
          <div className="space-y-4">
            <div role="radiogroup" aria-label="Start from" className="flex flex-wrap gap-2">
              {STUDIO_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  onClick={() => setMode(m.value)}
                  className={cn('min-h-11 flex-1 rounded-md border px-4 text-small font-semibold sm:flex-none', mode === m.value ? 'border-green bg-green-soft text-green-darker' : 'border-border-strong bg-white text-ink')}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <Field label={TEXT_LABEL[mode].label} htmlFor="gs-text" required>
              <Input id="gs-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={TEXT_LABEL[mode].placeholder} maxLength={500} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Guide topic" htmlFor="gs-topic">
                <Select id="gs-topic" value={topic} onChange={(e) => setTopic(e.target.value as GuideTopic)}>
                  {GUIDE_TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Main reader" htmlFor="gs-reader">
                <Select id="gs-reader" value={reader} onChange={(e) => setReader(e.target.value as StudioReader)}>
                  {STUDIO_READERS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Guide type" htmlFor="gs-type">
                <Select id="gs-type" value={guideType} onChange={(e) => setGuideType(e.target.value as StudioGuideType)}>
                  {STUDIO_GUIDE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Length" htmlFor="gs-length">
                <Select id="gs-length" value={length} onChange={(e) => setLength(e.target.value as StudioLength)}>
                  {STUDIO_LENGTHS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {error && <FormAlert>{error}</FormAlert>}
            <Button onClick={build} size="lg">
              Build prompt
            </Button>
          </div>
        </Panel>
      </div>

      {prompt && (
        <Panel
          title="Your prompt"
          actions={
            <Link href="/roodber8/guides/import" className="text-small font-semibold text-green hover:underline">
              → Import guide JSON
            </Link>
          }
        >
          <div className="space-y-3">
            <p className="text-small text-muted">Copy it into a new Claude chat. Claude replies with JSON: paste that on the import page.</p>
            <Textarea ref={promptRef} aria-label="Prompt" readOnly value={prompt} rows={16} className="font-mono text-small" />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={copy} variant="secondary">
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />} Copy prompt
              </Button>
              <span role="status" className="text-small font-semibold text-green">
                {copied ? 'Copied' : ''}
              </span>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Topic ideas">
        <p className="mb-4 text-small text-muted">Choose an idea to fill in the form. “Already exists” means a guide with the same or a very similar title is already in admin.</p>
        <div className="space-y-5">
          {GUIDE_TOPICS.filter((t) => GUIDE_TOPIC_BANK.some((i) => i.topic === t.value)).map((t) => (
            <section key={t.value} aria-label={t.label}>
              <h3 className="text-small font-semibold text-ink">{t.label}</h3>
              <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                {GUIDE_TOPIC_BANK.filter((i) => i.topic === t.value).map((idea) => {
                  const exists = ideaExists(idea.title, titles)
                  return (
                    <li key={idea.title}>
                      <button type="button" onClick={() => pickIdea(idea)} className="flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-small hover:bg-stone-50">
                        <span className="flex-1 font-medium text-ink">{idea.title}</span>
                        <span className="text-caption text-muted">
                          {STUDIO_READERS.find((r) => r.value === idea.reader)?.label} · {STUDIO_GUIDE_TYPES.find((g) => g.value === idea.guideType)?.label}
                        </span>
                        {exists && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-caption font-semibold text-warning-dark">Already exists</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </Panel>
    </div>
  )
}
