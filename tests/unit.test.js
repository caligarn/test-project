import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseJudgeOutput } from '../server/judge.js'
import { createUpstashStore, createMemoryStore, pairsToObject } from '../server/store.js'
import { mockImage, mockPromptOf } from '../server/mockImages.js'
import { dailyPrompts, DAILY_PROMPTS } from '../server/dailyPrompts.js'
import { hashPassword, verifyPassword } from '../server/auth.js'
import { promptSimilarity, promptSimilarityDetail } from '../src/lib/similarity.js'

afterEach(() => vi.unstubAllGlobals())

describe('judge output parsing', () => {
  it('reads clean JSON', () => {
    expect(parseJudgeOutput('{"score": 87, "comment": "Nice fox!"}')).toEqual({ score: 87, comment: 'Nice fox!' })
  })
  it('reads JSON wrapped in prose or code fences', () => {
    expect(parseJudgeOutput('Sure!\n```json\n{"score": 42, "comment": "ok"}\n```')).toEqual({ score: 42, comment: 'ok' })
  })
  it('clamps and rounds', () => {
    expect(parseJudgeOutput('{"score": 140}').score).toBe(100)
    expect(parseJudgeOutput('{"score": -3}').score).toBe(0)
    expect(parseJudgeOutput('{"score": 55.6}').score).toBe(56)
  })
  it('falls back to a "score: N" pattern', () => {
    expect(parseJudgeOutput('Score: 73. Great work').score).toBe(73)
  })
  it('returns null for nonsense', () => {
    expect(parseJudgeOutput('I cannot judge this')).toBeNull()
    expect(parseJudgeOutput('')).toBeNull()
  })
})

describe('upstash REST adapter', () => {
  it('sends commands and pipelines in the documented format', async () => {
    const calls = []
    vi.stubGlobal('fetch', async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization })
      const body = url.endsWith('/pipeline') ? [{ result: 1 }, { result: 'v' }] : { result: 'OK' }
      return { ok: true, status: 200, json: async () => body }
    })
    const store = createUpstashStore('https://example.upstash.io/', 'tok')
    expect(await store.cmd('SET', 'k', 5)).toBe('OK')
    expect(await store.pipeline([['INCR', 'a'], ['GET', 'b']])).toEqual([1, 'v'])
    expect(calls[0]).toEqual({ url: 'https://example.upstash.io', body: ['SET', 'k', '5'], auth: 'Bearer tok' })
    expect(calls[1].url).toBe('https://example.upstash.io/pipeline')
    expect(calls[1].body).toEqual([['INCR', 'a'], ['GET', 'b']])
  })
  it('throws on Redis errors', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => ({ error: 'WRONGTYPE' }) }))
    await expect(createUpstashStore('https://x', 't').cmd('GET', 'k')).rejects.toThrow(/WRONGTYPE/)
  })
})

describe('memory store', () => {
  it('matches Redis reply shapes', async () => {
    const s = createMemoryStore()
    expect(await s.cmd('INCR', 'n')).toBe(1)
    expect(await s.cmd('GET', 'n')).toBe('1')
    await s.cmd('ZADD', 'z', 'GT', 10, 'a')
    await s.cmd('ZADD', 'z', 'GT', 5, 'a')
    await s.cmd('ZADD', 'z', 'GT', 20, 'b')
    expect(await s.cmd('ZREVRANGE', 'z', 0, -1, 'WITHSCORES')).toEqual(['b', '20', 'a', '10'])
    await s.cmd('HSET', 'h', 'x', 1, 'y', 2)
    expect(pairsToObject(await s.cmd('HGETALL', 'h'))).toEqual({ x: '1', y: '2' })
    await s.cmd('LPUSH', 'l', 'a', 'b', 'c')
    await s.cmd('LTRIM', 'l', 0, 1)
    expect(await s.cmd('LRANGE', 'l', 0, -1)).toEqual(['c', 'b'])
  })
  it('expires keys', async () => {
    const s = createMemoryStore()
    await s.cmd('SET', 'k', 'v', 'EX', 1)
    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 1500)
    expect(await s.cmd('GET', 'k')).toBeNull()
    vi.useRealTimers()
  })
})

describe('mock images', () => {
  it('round-trips the prompt, including special characters', () => {
    const prompt = 'A "cat" & <dog> in Zoë\'s garden 🐱'
    expect(mockPromptOf(mockImage(prompt))).toBe(prompt)
    expect(mockPromptOf('https://fal.media/x.png')).toBeNull()
  })
})

describe('daily prompts', () => {
  it('is stable per date and different across dates', () => {
    expect(dailyPrompts('2026-11-09')).toEqual(dailyPrompts('2026-11-09'))
    expect(dailyPrompts('2026-11-09')).not.toEqual(dailyPrompts('2026-11-10'))
    const set = new Set(dailyPrompts('2026-11-09'))
    expect(set.size).toBe(5)
    for (const p of set) expect(DAILY_PROMPTS).toContain(p)
  })
})

describe('passwords', () => {
  it('hashes with a salt and verifies', async () => {
    const a = await hashPassword('hunter22')
    const b = await hashPassword('hunter22')
    expect(a).not.toBe(b)
    expect(a).not.toContain('hunter22')
    expect(await verifyPassword('hunter22', a)).toBe(true)
    expect(await verifyPassword('hunter23', a)).toBe(false)
    expect(await verifyPassword('x', 'garbage')).toBe(false)
  })
})

describe('prompt similarity', () => {
  it('scores identical prompts 100 and unrelated 0', () => {
    expect(promptSimilarity('a red fox in snow', 'A red fox in snow')).toBe(100)
    expect(promptSimilarity('blue whale', 'red fox')).toBe(0)
  })
  it('does not reward repeating a word', () => {
    expect(promptSimilarity('fox fox fox fox', 'a red fox in snow')).toBeLessThan(promptSimilarity('fox', 'a red fox in snow'))
  })
  it('lists matched target words', () => {
    expect(promptSimilarityDetail('snowy fox', 'a red fox in snow').matchedWords.sort()).toEqual(['fox', 'snow'])
  })
})
