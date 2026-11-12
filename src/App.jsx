import { useEffect, useRef, useState } from 'react'
import './App.css'

const TOPICS = [
  'Mixed numbers or improper fractions',
  'Converting between forms',
  'Equivalent fraction forms',
]

const pick = (items) => items[Math.floor(Math.random() * items.length)]
const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)

function formatFraction(top, bottom) {
  return `${top}/${bottom}`
}

function formatMixedNumber(whole, top, bottom) {
  return `${whole} ${top}/${bottom}`
}

function createMixedNumber() {
  const bottom = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12])
  const top = pick(Array.from({ length: bottom - 1 }, (_, index) => index + 1))
  const whole = pick([1, 2, 3, 4, 5, 6, 7, 8])
  return { whole, top, bottom, improperTop: whole * bottom + top }
}

function generateQuestion(topic) {
  const number = createMixedNumber()
  const mixed = formatMixedNumber(number.whole, number.top, number.bottom)
  const improper = formatFraction(number.improperTop, number.bottom)

  if (topic === 'Mixed numbers or improper fractions') {
    const showMixed = Math.random() < 0.5
    const shown = showMixed ? mixed : improper
    const correct = showMixed ? 'Mixed number' : 'Improper fraction'
    const wrong = showMixed ? 'Improper fraction' : 'Mixed number'
    return makeQuestion(topic, `Is ${shown} a mixed number or an improper fraction?`, [correct, wrong], correct, shown)
  }

  if (topic === 'Converting between forms') {
    if (Math.random() < 0.5) {
      const wrong = formatFraction(number.whole + number.top, number.bottom)
      return makeQuestion(topic, `Write ${mixed} as an improper fraction.`, [improper, wrong], improper, mixed)
    }
    const wrong = formatMixedNumber(number.whole, Math.max(1, number.top - 1), number.bottom)
    return makeQuestion(topic, `Write ${improper} as a mixed number.`, [mixed, wrong], mixed, improper)
  }

  if (Math.random() < 0.5) {
    const wrong = formatFraction(number.improperTop + number.bottom, number.bottom)
    return makeQuestion(topic, `Which improper fraction is equivalent to ${mixed}?`, [improper, wrong], improper, mixed)
  }
  const wrong = formatMixedNumber(number.whole + 1, number.top, number.bottom)
  return makeQuestion(topic, `Which mixed number is equivalent to ${improper}?`, [mixed, wrong], mixed, improper)
}

function makeQuestion(topic, prompt, answers, correct, signature, mathFraction = null) {
  return { topic, prompt, answers: shuffle(answers), correct, signature: `${topic}:${signature}`, mathFraction }
}

function freshTopicCycle(lastTopic) {
  const topics = shuffle(TOPICS)
  if (topics[0] === lastTopic) [topics[0], topics[1]] = [topics[1], topics[0]]
  return topics
}

function nextQuestion(used, topicQueue, lastTopic) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (topicQueue.current.length === 0) topicQueue.current = freshTopicCycle(lastTopic.current)
    const topic = topicQueue.current.shift()
    const question = generateQuestion(topic)
    if (!used.has(question.signature)) {
      used.add(question.signature)
      lastTopic.current = topic
      return question
    }
  }
  used.clear()
  if (topicQueue.current.length === 0) topicQueue.current = freshTopicCycle(lastTopic.current)
  const topic = topicQueue.current.shift()
  lastTopic.current = topic
  return generateQuestion(topic)
}

function App() {
  const usedQuestions = useRef(new Set())
  const [initialTopic] = useState(() => pick(TOPICS))
  const topicQueue = useRef(shuffle(TOPICS.filter((topic) => topic !== initialTopic)))
  const lastTopic = useRef(initialTopic)
  const [question, setQuestion] = useState(() => generateQuestion(initialTopic))
  const [round, setRound] = useState(1)
  const [ropePosition, setRopePosition] = useState(0)
  const [scores, setScores] = useState({ left: 0, right: 0 })
  const [message, setMessage] = useState('First correct tap wins the pull!')
  const [locked, setLocked] = useState(false)
  const [pullsToWin, setPullsToWin] = useState(5)
  const [showSettings, setShowSettings] = useState(false)
  const [winner, setWinner] = useState(null)

  useEffect(() => {
    usedQuestions.current.add(question.signature)
  }, [question.signature])

  function chooseAnswer(team, answer) {
    if (locked || winner) return
    const correct = answer === question.correct
    const pull = team === 'left' ? (correct ? -1 : 1) : correct ? 1 : -1
    const newPosition = ropePosition + pull
    setLocked(true)
    setRopePosition(newPosition)
    if (correct) {
      setScores((current) => ({ ...current, [team]: current[team] + 1 }))
      setMessage(`${team === 'left' ? 'Blue' : 'Orange'} team pulls the rope!`)
    } else {
      setMessage(`Wrong answer — ${team === 'left' ? 'Orange' : 'Blue'} pulls the rope!`)
    }
    window.setTimeout(() => {
      if (Math.abs(newPosition) >= pullsToWin) {
        const winningTeam = newPosition < 0 ? 'left' : 'right'
        setWinner(winningTeam)
        setMessage(`${winningTeam === 'left' ? 'Blue' : 'Orange'} team wins!`)
      } else {
        setQuestion(nextQuestion(usedQuestions.current, topicQueue, lastTopic))
        setRound((current) => current + 1)
        setMessage('First correct tap wins the pull!')
      }
      setLocked(false)
    }, 800)
  }

  function restart() {
    usedQuestions.current.clear()
    topicQueue.current = freshTopicCycle('')
    lastTopic.current = topicQueue.current.shift()
    setQuestion(generateQuestion(lastTopic.current))
    setRound(1)
    setRopePosition(0)
    setScores({ left: 0, right: 0 })
    setMessage('First correct tap wins the pull!')
    setLocked(false)
    setWinner(null)
  }

  function saveSettings(event) {
    event.preventDefault()
    setShowSettings(false)
    restart()
  }

  return <main className="game-shell">
    <header className="topbar">
      <div className="brand"><span aria-hidden="true">↔</span> Fraction Tug of War</div>
      <div className="round">ROUND {round} <span>· MIXED PRACTICE</span></div>
      <div className="header-actions"><button className="restart" onClick={() => setShowSettings(true)}>⚙ Settings</button><button className="restart" onClick={restart}>↻ New game</button></div>
    </header>

    <section className="teams" aria-label="Team scores">
      <div className="team blue"><span>BLUE TEAM</span><strong>{scores.left}</strong></div>
      <div className="prompt"><p className="topic">{winner ? 'GAME COMPLETE' : question.topic}</p><p>{message}</p><h1>{winner ? `${winner === 'left' ? 'Blue' : 'Orange'} team wins!` : <QuestionPrompt question={question} />}</h1></div>
      <div className="team orange"><span>ORANGE TEAM</span><strong>{scores.right}</strong></div>
    </section>

    {!winner ? <>
      <section className="answer-zone" aria-label="Choose the correct answer">
        <AnswerSide team="BLUE TEAM" side="left" question={question} onChoose={(answer) => chooseAnswer('left', answer)} disabled={locked} />
        <div className="versus" aria-hidden="true">VS</div>
        <AnswerSide team="ORANGE TEAM" side="right" question={question} onChoose={(answer) => chooseAnswer('right', answer)} disabled={locked} />
      </section>
      <Rope ropePosition={ropePosition} pullsToWin={pullsToWin} />
    </> : <section className="winner-card"><div className="trophy" aria-hidden="true">🏆</div><h2>{winner === 'left' ? 'Blue' : 'Orange'} team wins!</h2><p>They reached {pullsToWin} pulls first.</p><button onClick={restart}>Play again</button></section>}
    <footer>Mixed practice · First correct tap wins · First to {pullsToWin} pulls wins</footer>

    {showSettings && <div className="modal-backdrop" role="presentation"><form className="settings-card" onSubmit={saveSettings}><button type="button" className="close" onClick={() => setShowSettings(false)} aria-label="Close settings">×</button><p className="topic">GAME SETTINGS</p><h2>How long should the game last?</h2><label htmlFor="pulls">Pulls needed to win <strong>{pullsToWin}</strong></label><input id="pulls" type="range" min="2" max="10" value={pullsToWin} onChange={(event) => setPullsToWin(Number(event.target.value))} /><div className="range-labels"><span>Quick<br />2 pulls</span><span>Long<br />10 pulls</span></div><p className="settings-note">Changing this starts a fresh mixed-practice game. Every round is generated from all three topics.</p><button className="save-settings" type="submit">Save & start game</button></form></div>}
  </main>
}

function AnswerSide({ team, side, question, onChoose, disabled }) {
  return <div className={`answer-side ${side}-side`}><p>{team} — TOUCH AN ANSWER</p><div className="answers">{question.answers.map((answer) => <button className="answer" key={answer} onClick={() => onChoose(answer)} disabled={disabled}><span><MathText text={answer} /></span></button>)}</div></div>
}

function QuestionPrompt({ question }) {
  return <MathText text={question.prompt} />
}

function MathText({ text }) {
  const parts = []
  const fractionPattern = /\b(\d+)\s+(\d+)\/(\d+)\b|\b(\d+)\/(\d+)\b/g
  let lastIndex = 0
  let match

  while ((match = fractionPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const whole = match[1]
    const numerator = whole ? match[2] : match[4]
    const denominator = whole ? match[3] : match[5]
    parts.push(<span className="math-expression" key={`${match.index}-${match[0]}`} aria-label={whole ? `${whole} and ${numerator} over ${denominator}` : `${numerator} over ${denominator}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '.12em', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{whole && <span>{whole}</span>}<span className="math-fraction" style={{ marginLeft: 0 }}><span>{numerator}</span><span>{denominator}</span></span></span>)
    lastIndex = fractionPattern.lastIndex
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
}

function Rope({ ropePosition, pullsToWin }) {
  const maxOffset = 37
  const offset = (ropePosition / pullsToWin) * maxOffset
  return <section className="rope-ground" aria-label="Tug of war rope"><div className="rope-track"><div className="center-line" /><div className="rope" style={{ transform: `translateX(${offset}vw)` }}><span className="flag">⚑</span></div></div><div className="pull-label left-pull">BLUE PULLS ←</div><div className="pull-label right-pull">→ ORANGE PULLS</div></section>
}

export default App
