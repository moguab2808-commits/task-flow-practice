import { useCallback, useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

const MAX_LENGTH = 300

type Memo = { id: number; content: string }

async function fetchMemos(offset: number) {
  const res = await fetch(`/memos?offset=${offset}`)
  if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
  return (await res.json()) as { items: Memo[]; has_more: boolean }
}

function App() {
  const [content, setContent] = useState('')
  const [memos, setMemos] = useState<Memo[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadFirstPage = useCallback(async () => {
    try {
      const page = await fetchMemos(0)
      setMemos(page.items)
      setHasMore(page.has_more)
    } catch {
      setError('목록을 불러오지 못했습니다.')
    }
  }, [])

  useEffect(() => {
    loadFirstPage()
  }, [loadFirstPage])

  async function submit(e: SyntheticEvent) {
    e.preventDefault()
    setNotice('')
    setError('')
    try {
      const res = await fetch('/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      setContent('')
      setNotice('등록되었습니다.')
      await loadFirstPage()
    } catch {
      setError('등록하지 못했습니다.')
    }
  }

  async function loadMore() {
    try {
      const page = await fetchMemos(memos.length)
      setMemos((prev) => [...prev, ...page.items])
      setHasMore(page.has_more)
    } catch {
      setError('목록을 불러오지 못했습니다.')
    }
  }

  return (
    <main>
      <section>
        <h2>메모 작성</h2>
        <form onSubmit={submit}>
          <textarea
            value={content}
            maxLength={MAX_LENGTH}
            rows={10}
            style={{ width: '30%', boxSizing: 'border-box' }}
            onChange={(e) => setContent(e.target.value)}
          />
          <div>
            {content.length} / {MAX_LENGTH}
          </div>
          <button type="submit" disabled={!content.trim()}>
            등록
          </button>
        </form>
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
      </section>

      <section>
        <h2>메모 목록</h2>
        {memos.length === 0 ? (
          <p>아직 메모가 없습니다.</p>
        ) : (
          <ul>
            {memos.map((m) => (
              <li key={m.id}>{m.content}</li>
            ))}
          </ul>
        )}
        {hasMore && (
          <button type="button" onClick={loadMore}>
            더 보기
          </button>
        )}
      </section>
    </main>
  )
}

export default App
