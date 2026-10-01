import { isCaptchaSkipped, verifyUserCapcha } from './verify-recaptcha'

const ORIGINAL_ENV = process.env
/** Next types NODE_ENV as read-only; tests need to flip it. */
const env = () => process.env as Record<string, string | undefined>

const mockFetch = jest.fn()

const siteverifyReply = (body: unknown, ok = true, status = 200) =>
    mockFetch.mockResolvedValueOnce({ ok, status, json: async () => body })

/** Google's siteverify only ever sees a form-encoded POST; pull the fields back out for assertions. */
const sentForm = () => {
    const [url, init] = mockFetch.mock.calls[0]
    return { url, method: init.method, body: Object.fromEntries(init.body as URLSearchParams) }
}

beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch as unknown as typeof fetch
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'test', CAPTCHA_SECRET_KEY: 'secret-123' }
    delete process.env.SKIP_CAPTCHA
    jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
    process.env = ORIGINAL_ENV
    jest.restoreAllMocks()
})

describe('verifyUserCapcha', () => {
    it('resolves when Google reports success', async () => {
        siteverifyReply({ success: true, challenge_ts: '2026-09-20T00:00:00Z', hostname: 'example.com' })

        await expect(verifyUserCapcha('good-token')).resolves.toBeUndefined()

        const { url, method, body } = sentForm()
        expect(url).toBe('https://www.google.com/recaptcha/api/siteverify')
        expect(method).toBe('POST')
        expect(body).toEqual({ secret: 'secret-123', response: 'good-token' })
    })

    it('rejects with the error codes when Google reports failure', async () => {
        siteverifyReply({ success: false, 'error-codes': ['invalid-input-response'] })

        await expect(verifyUserCapcha('bad-token')).rejects.toThrow('reCAPTCHA rejected: invalid-input-response')
    })

    it('rejects a success:false reply that carries no error codes', async () => {
        siteverifyReply({ success: false })

        await expect(verifyUserCapcha('bad-token')).rejects.toThrow('reCAPTCHA rejected: unknown')
    })

    it('rejects an expired or reused token', async () => {
        siteverifyReply({ success: false, 'error-codes': ['timeout-or-duplicate'] })

        await expect(verifyUserCapcha('stale-token')).rejects.toThrow('timeout-or-duplicate')
    })

    it.each([null, undefined, ''])('rejects a missing token (%p) without calling Google', async (token) => {
        await expect(verifyUserCapcha(token)).rejects.toThrow('reCAPTCHA token missing')
        expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects when the secret is not configured, without calling Google', async () => {
        delete process.env.CAPTCHA_SECRET_KEY

        await expect(verifyUserCapcha('good-token')).rejects.toThrow('CAPTCHA_SECRET_KEY is not configured')
        expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects when Google is unreachable (fails closed)', async () => {
        mockFetch.mockRejectedValueOnce(new Error('ECONNRESET'))

        await expect(verifyUserCapcha('good-token')).rejects.toThrow('Error verifying reCAPTCHA: ECONNRESET')
    })

    it('rejects a non-2xx reply from Google', async () => {
        siteverifyReply({}, false, 503)

        await expect(verifyUserCapcha('good-token')).rejects.toThrow('siteverify responded 503')
    })

    it('rejects when the reply is not JSON', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => {
                throw new SyntaxError('Unexpected token <')
            },
        })

        await expect(verifyUserCapcha('good-token')).rejects.toThrow('Error verifying reCAPTCHA')
    })
})

describe('SKIP_CAPTCHA', () => {
    it('bypasses Google outside production', async () => {
        process.env.SKIP_CAPTCHA = 'true'
        env().NODE_ENV = 'development'

        expect(isCaptchaSkipped()).toBe(true)
        await expect(verifyUserCapcha('captcha-skipped')).resolves.toBeUndefined()
        expect(mockFetch).not.toHaveBeenCalled()
    })

    it('is ignored in production', async () => {
        process.env.SKIP_CAPTCHA = 'true'
        env().NODE_ENV = 'production'
        siteverifyReply({ success: false, 'error-codes': ['invalid-input-response'] })

        expect(isCaptchaSkipped()).toBe(false)
        await expect(verifyUserCapcha('captcha-skipped')).rejects.toThrow('reCAPTCHA rejected')
        expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('only honours the literal string "true"', () => {
        env().NODE_ENV = 'development'
        for (const value of ['1', 'yes', 'TRUE', '']) {
            process.env.SKIP_CAPTCHA = value
            expect(isCaptchaSkipped()).toBe(false)
        }
    })
})
