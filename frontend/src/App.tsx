import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, FileText, Layers, Leaf, Lightbulb, Minus, Plus, ShieldCheck, Sparkles, Upload, X } from 'lucide-react'
import demo from '../../demo/demo-response.json'

type Screen = 'upload' | 'analysis' | 'focus'
type Analysis = typeof demo

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [apiFailed, setApiFailed] = useState(false)
  const request = useRef<AbortController | null>(null)
  const [dragging, setDragging] = useState(false)
  const [conceptIndex, setConceptIndex] = useState(0)
  const [detail, setDetail] = useState(1)
  const [answer, setAnswer] = useState<number | null>(null)
  const [complete, setComplete] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const concepts = analysis?.concepts ?? []
  const concept = concepts[conceptIndex]
  const name = analysis?.document.name ?? file?.name ?? ''

  useEffect(() => () => request.current?.abort(), [])

  useEffect(() => {
    if (!file) { setPdfUrl(''); return }
    const url = URL.createObjectURL(file)
    setPdfUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  useEffect(() => { heading.current?.focus() }, [screen, conceptIndex, complete])

  async function acceptFile(next?: File) {
    if (!next) return
    if (!next.name.toLowerCase().endsWith('.pdf') || (next.type && next.type !== 'application/pdf')) {
      setError('Please choose a PDF file.'); return
    }
    if (next.size > 25 * 1024 * 1024) { setError('Please choose a PDF smaller than 25 MB.'); return }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setError(''); setFile(next); setAnalysis(null); setFallback(false); setApiFailed(false)
    setAnalyzing(true); setScreen('upload'); setComplete(false); setConceptIndex(0); setSourceOpen(false)
    const timeout = window.setTimeout(() => controller.abort(), 120000)
    try {
      const form = new FormData()
      form.append('file', next)
      const response = await fetch('http://127.0.0.1:8000/api/analyze', {
        method: 'POST', body: form, signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(typeof body?.detail === 'string' ? body.detail : `Analysis failed (${response.status}).`)
      }
      const result: Analysis = await response.json()
      if (!result.document || !Array.isArray(result.barriers) || !Array.isArray(result.concepts)) {
        throw new Error('The API returned an invalid analysis response.')
      }
      if (request.current !== controller) return
      setAnalysis(result); setScreen('analysis')
    } catch (failure) {
      if (request.current !== controller) return
      setError(controller.signal.aborted ? 'Analysis timed out. Please try again.' :
        failure instanceof Error ? failure.message : 'Could not connect to the analysis API.')
      setApiFailed(true)
    } finally {
      window.clearTimeout(timeout)
      if (request.current === controller) setAnalyzing(false)
    }
  }
  function useDemoFallback() {
    setFile(null); setAnalysis(demo); setFallback(true); setError(''); setConceptIndex(0); setScreen('analysis')
  }
  function startFocus() { if (!concepts.length) return; setConceptIndex(0); setAnswer(null); setDetail(1); setComplete(false); setScreen('focus') }
  function changeConcept(index: number) { setConceptIndex(index); setAnswer(null); setDetail(1) }

  function preview() {
    if (!fallback) return pdfUrl ? <iframe className="pdf-frame" src={`${pdfUrl}#page=${concept?.sourcePage ?? 1}`} title={`Original PDF: ${name}`} /> : null
    return <div className="paper-preview">
      <div className="paper-top">COMPUTER SYSTEMS <span>LECTURE NOTES</span></div>
      <h3>Memory management</h3><div className="paper-rule" />
      <section className="annotated-region dense-columns" aria-label="Barrier 1: High information density">
        <span className="annotation-tag"><b>1</b> Dense text</span>
        <p>Virtual memory gives each process its own address space. A program uses virtual addresses while physical memory stores its data. The operating system and hardware translate between these addresses. Each process can use its own mapping, so identical virtual addresses can refer to different physical locations.</p>
        <p>Memory is divided into fixed-size pages and frames. A page table records the mapping between them, along with access permissions and status information. Address translation happens as programs access instructions and data. These mappings must remain consistent as processes run and memory use changes.</p>
      </section>
      <section className="annotated-region bundled-concepts" aria-label="Barrier 2: Multiple concepts introduced together">
        <span className="annotation-tag"><b>2</b> Ideas bundled together</span>
        <h4>Address spaces / page tables / page faults</h4>
        <p>A virtual address contains a page number and an offset; the page table maps the page number to a physical frame, while a translation cache stores recent mappings. A missing mapping can cause a page fault, transferring control to the operating system. Protection bits determine permitted access. See also: allocation, isolation, and replacement.</p>
      </section>
      <section className="annotated-region crowded-visuals" aria-label="Barrier 3: Competing visuals">
        <span className="annotation-tag"><b>3</b> Competing visuals</span>
        <div className="crowded-visual-grid">
          <div className="mini-flow"><strong>TRANSLATION</strong><span>CPU → virtual address</span><span>↓ page table / cache ↓</span><span>frame + offset → RAM</span></div>
          <table><caption>Page mapping</caption><thead><tr><th>Page</th><th>Frame</th><th>Valid</th></tr></thead><tbody><tr><td>00</td><td>04</td><td>1</td></tr><tr><td>01</td><td>09</td><td>1</td></tr><tr><td>02</td><td>—</td><td>0</td></tr></tbody></table>
          <div className="mini-memory"><strong>PHYSICAL MEMORY</strong><span>OS / reserved</span><span>Process A</span><span>Process B</span><span>Free frame</span></div>
        </div>
        <div className="paper-sticky">Remember: virtual ≠ physical!<br />See table + translation notes.</div>
      </section>
      <section className="annotated-region flat-hierarchy" aria-label="Barrier 4: Weak hierarchy">
        <span className="annotation-tag"><b>4</b> Unclear hierarchy</span>
        <h4>Translation notes</h4><p>{concept.expandedExplanation}</p>
        <h4>Important</h4><p>{concept.keyIdea} Review mappings, permissions, and page faults together.</p>
        <h4>Summary / next steps</h4><p>Compare virtual addresses with physical locations. Revisit the table above and connect each entry to the translation diagram.</p>
      </section>
      <div className="paper-bottom">Illustrative demo preview <span>03</span></div>
    </div>
  }

  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="header"><button className="brand" onClick={() => setScreen('upload')} aria-label="Access Ready home"><span className="brand-mark"><BookOpen size={23} /></span>access<span className="brand-light">ready</span><span className="brand-dot">.</span></button><span className="header-note"><Leaf size={15} /> A little less noise. A little more clarity.</span><span className="demo-tag">SHELLHACKS 2026 <span>DEMO</span></span></header>
    <main id="main" className="main">
      <nav className="steps" aria-label="Your progress">{(['upload', 'analysis', 'focus'] as const).map((step, i) => <div className="step-wrap" key={step}><button className={`step ${screen === step ? 'active' : ''}`} aria-current={screen === step ? 'step' : undefined} disabled={analyzing || (step !== 'upload' && !analysis) || (step === 'focus' && !concepts.length)} onClick={() => step === 'focus' ? startFocus() : setScreen(step)}><span className="step-number">{i + 1}</span>{['Upload a document', 'Understand the barriers', 'Find your focus'][i]}</button>{i < 2 && <ChevronRight className="step-chevron" size={15} />}</div>)}</nav>

      {screen === 'upload' && <section className="upload-layout">
        <div className="upload-copy"><div className="eyebrow"><span /> BUILT FOR THE WAY YOU LEARN</div><h1 ref={heading} tabIndex={-1}>Big ideas.<br /><span>Less overwhelm.</span></h1><p className="intro">Your course material, with room to think. Turn a dense PDF into clear, focused concepts you can explore at your own pace.</p><div className="benefits"><div><span><Layers size={19} /></span><div><strong>One idea at a time</strong><p>Make space for understanding.</p></div></div><div><span><Plus size={19} /></span><div><strong>The detail you need</strong><p>Go deeper, or keep it simple.</p></div></div><div><span><BookOpen size={19} /></span><div><strong>Always connected to the source</strong><p>Your original material stays within reach.</p></div></div></div><div className="made-for"><span className="tiny-leaf"><Leaf size={17} /></span>Different minds. Equal possibility.</div></div>
        <div className="upload-side"><div className="upload-card"><div className="card-heading"><span className="soft-icon"><Upload size={21} /></span><div><h2>Start with your course PDF</h2><p>A clearer learning experience starts here.</p></div></div><div className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!analyzing) acceptFile(e.dataTransfer.files[0]) }}><div className="upload-file-icon"><FileText size={34} /><span><Plus size={13} /></span></div><h3>Drop your PDF here</h3><p>or choose one from your device</p><button className="primary" disabled={analyzing} onClick={() => input.current?.click()}><Upload size={17} /> Choose a PDF</button><span className="file-hint">PDF files up to 25 MB</span><input ref={input} disabled={analyzing} type="file" accept=".pdf,application/pdf" className="sr-only" tabIndex={-1} aria-label="Choose PDF" onChange={e => { acceptFile(e.target.files?.[0]); e.target.value = '' }} /></div>{error && <p className="error" role="alert">{error}</p>}{analyzing && <p role="status" aria-live="polite">Analyzing {file?.name}… Extracting text and preparing your Focus View.</p>}{apiFailed && !analyzing && <button className="sample-button" onClick={useDemoFallback}><span className="sample-icon"><FileText size={22} /></span><span><strong>Use demo fallback</strong><small>Sample virtual memory content, separate from your PDF</small></span><ArrowRight size={19} /></button>}<p className="privacy"><ShieldCheck size={14} /> Your PDF is sent to the local backend for analysis. No account needed.</p></div><div className="demo-notice"><Sparkles size={17} /><p><strong>A preview of what’s possible.</strong> Upload a PDF to extract its text and prepare focused concepts. Sample content is available if analysis fails.</p></div></div>
      </section>}

      {screen === 'analysis' && analysis && <section><div className="page-heading"><div><div className="eyebrow">A CLEARER START</div><h1 ref={heading} tabIndex={-1}>Make room for understanding.</h1><p>See what may get in the way, then take it one concept at a time.</p></div><span className="pill"><Sparkles size={14} /> {fallback ? 'Demo fallback' : 'Document analysis'}</span></div><div className="document-strip"><span className="soft-icon"><FileText size={22} /></span><div><strong>{name}</strong><p>{analysis.document.pages} pages · {fallback ? 'Sample course material — not your uploaded PDF' : 'Analyzed from your PDF'}</p></div><button className="text-button" onClick={() => setScreen('upload')}>Change document <ArrowRight size={15} /></button></div><div className="dashboard-grid"><div><div className="section-title"><h2>Focus barriers in the material</h2><span className="count-badge">{analysis.barriers.length} detected</span></div><p className="muted section-description">Small changes to the presentation can make space for the ideas.</p><div className="barriers">{analysis.barriers.map((barrier, index) => <article className="barrier detected" key={`${barrier.page}-${barrier.type}-${index}`}><span className="barrier-marker">{index + 1}</span><div><div className="barrier-title"><h3>{barrier.label}</h3><span>PAGE {barrier.page}</span></div><p>{barrier.reason}</p></div></article>)}{!analysis.barriers.length && <p className="muted">No text-based barriers were detected. This does not assess visual layout.</p>}</div><div className="focus-cta"><span className="soft-icon"><Leaf size={23} /></span><h2>Same ideas. More breathing room.</h2><p>Your Focus View breaks the material into manageable concepts, with adjustable detail and a quick check.</p><button className="primary" disabled={!concepts.length} onClick={startFocus}>Create Focus View <ArrowRight size={17} /></button><small>{concepts.length} concepts available</small>{concepts.length ? <ul>{concepts.map(c => <li key={c.id}>{c.title} · page {c.sourcePage}</li>)}</ul> : <p role="status">No concepts could be extracted. Try a PDF with selectable text; scanned pages require OCR.</p>}</div></div><aside className="preview-panel"><div className="section-title"><h2>Original document</h2><span className="pill">{file ? 'LOCAL PDF' : 'SAMPLE'}</span></div><p className="muted">{file ? 'Preview your uploaded course material.' : 'Illustrative sample preview; not an assessment of your PDF'}</p>{preview()}<div className="preview-caption"><BookOpen size={15} /><span>{file ? 'Use the PDF viewer to explore your document.' : `Sample concept references page ${concept.sourcePage} of ${analysis.document.pages}`}</span></div></aside></div></section>}

      {screen === 'focus' && concept && <section className="focus-layout"><aside className="focus-sidebar"><button className="text-button" onClick={() => setScreen('analysis')}><ArrowLeft size={15} /> Back to analysis</button><div className="sidebar-document"><FileText size={20} /><strong>{name}</strong></div><div className="eyebrow">YOUR LEARNING PATH</div>{concepts.map((c, i) => <button key={c.id} className={`concept-nav ${i === conceptIndex ? 'selected' : ''}`} onClick={() => { changeConcept(i); setComplete(false) }}><span>{complete ? <Check size={15} /> : String(i + 1).padStart(2, '0')}</span>{c.title}</button>)}<div className="pace-note"><Leaf size={22} /><h3>There’s no rush.</h3><p>Pause, reread, or explore more. You set the pace here.</p></div></aside><div className="focus-content">{complete ? <div className="completion"><span className="completion-icon"><CheckCircle2 size={42} /></span><div className="eyebrow">A LITTLE MORE CLARITY</div><h1 ref={heading} tabIndex={-1}>One concept, understood.</h1><p>You’ve reached the end of this Focus View. Come back to the idea whenever you need it.</p><button className="primary" onClick={startFocus}>Review the concept <ArrowRight size={17} /></button><button className="text-button" onClick={() => setScreen('analysis')}>Return to document analysis</button></div> : <><div className="focus-topline"><span className="eyebrow">FOCUS VIEW</span><span>Concept {conceptIndex + 1} of {concepts.length}</span></div><div className="progress-track"><span style={{ width: `${((conceptIndex + 1) / concepts.length) * 100}%` }} /></div><h1 ref={heading} tabIndex={-1}>{concept.title}</h1><p className="focus-subtitle">{concept.subtitle}</p><article className="concept-card"><h2><BookOpen size={19} /> What you need to know</h2><ul className="essentials">{(detail === 0 ? concept.essential.slice(0, 1) : concept.essential).map(item => <li key={item}>{item}</li>)}</ul><div className="key-idea"><Lightbulb size={22} /><div><h3>Key idea</h3><p>{concept.keyIdea}</p></div></div>{detail === 2 && <div className="expanded"><h3>A closer look</h3><p>{concept.expandedExplanation}</p></div>}<div className="detail-controls"><span>Find your level of detail</span><div><button disabled={detail === 0} onClick={() => setDetail(d => d - 1)}><Minus size={15} /> Need less detail</button><button disabled={detail === 2} onClick={() => setDetail(d => d + 1)}><Plus size={15} /> Show me more</button></div></div><span className="sr-only" role="status">{['Less detail shown', 'Standard detail shown', 'More detail shown'][detail]}</span></article><article className="quick-check"><div className="quick-heading"><span className="soft-icon"><CheckCircle2 size={20} /></span><div><h2>Quick Check</h2><p>A small pause to see what clicked. No pressure.</p></div><span className="pill">OPTIONAL</span></div><fieldset><legend>{concept.quickCheck.question}</legend>{concept.quickCheck.choices.map((choice, i) => <label className={`choice ${answer === i ? 'chosen' : ''}`} key={choice}><input type="radio" name="quick-check" checked={answer === i} onChange={() => setAnswer(i)} /><span>{choice}</span>{answer === i && i === concept.quickCheck.correct && <Check size={17} />}</label>)}</fieldset>{answer !== null && <p className={`answer-feedback ${answer === concept.quickCheck.correct ? 'correct' : ''}`} role="status">{answer === concept.quickCheck.correct ? 'That’s right! ' + concept.quickCheck.choices[concept.quickCheck.correct] : 'Not quite. Review the key idea and try again.'}</p>}</article><div className="focus-bottom">{!fallback && pdfUrl ? <a className="source-link" href={`${pdfUrl}#page=${concept.sourcePage}`} target="_blank" rel="noreferrer"><BookOpen size={15} /> Original source · page {concept.sourcePage} ↗</a> : <a className="source-link" href="#source-preview" onClick={e => { e.preventDefault(); setSourceOpen(true) }}><BookOpen size={15} /> Original source · page {concept.sourcePage} ↗</a>}<div className="navigation"><button className="secondary" onClick={() => conceptIndex > 0 ? changeConcept(conceptIndex - 1) : setScreen('analysis')}><ArrowLeft size={16} /> Back</button><button className="primary" onClick={() => conceptIndex < concepts.length - 1 ? changeConcept(conceptIndex + 1) : setComplete(true)}>Continue <ArrowRight size={16} /></button></div></div></>}</div></section>}
    </main><footer><span><span className="footer-mark">✳</span> Designed for different minds.</span><span>Less friction. More learning.</span></footer>
    {sourceOpen && <SourceDialog onClose={() => setSourceOpen(false)}>{preview()}</SourceDialog>}
  </div>
}

function SourceDialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const el = dialog.current; const previous = document.activeElement as HTMLElement; el?.showModal(); return () => { el?.close(); previous?.focus() } }, [])
  return <dialog ref={dialog} className="source-dialog" onCancel={onClose} aria-labelledby="source-title"><div className="section-title"><h2 id="source-title">Source · page 3</h2><button className="icon-button" onClick={onClose} aria-label="Close source preview"><X size={21} /></button></div><p className="muted">The sample PDF isn’t included. This is an illustrative preview based on the demo content.</p>{children}</dialog>
}
