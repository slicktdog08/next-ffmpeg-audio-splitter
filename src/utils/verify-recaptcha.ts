/** Shared server-side reCAPTCHA (v2) verification against Google's siteverify API. */

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

/** https://developers.google.com/recaptcha/docs/verify#api_response */
interface SiteverifyResponse {
    success: boolean
    challenge_ts?: string
    hostname?: string
    'error-codes'?: string[]
}

/**
 * Local dev / E2E only: SKIP_CAPTCHA=true bypasses Google entirely (the client mirrors this with
 * NEXT_PUBLIC_SKIP_CAPTCHA). Ignored in production so a stray env var can never disable the check
 * on the live site.
 */
export const isCaptchaSkipped = () =>
    process.env.SKIP_CAPTCHA === 'true' && process.env.NODE_ENV !== 'production'

/**
 * Resolves when Google confirms the token; rejects with a reason otherwise. A missing token or
 * secret, a network failure, and a `success: false` reply all reject — never fail open.
 */
export async function verifyUserCapcha(token: string | null | undefined): Promise<void> {
    if (isCaptchaSkipped()) return

    if (!token) {
        throw new Error('reCAPTCHA token missing')
    }

    const secretKey = process.env.CAPTCHA_SECRET_KEY
    if (!secretKey) {
        throw new Error('CAPTCHA_SECRET_KEY is not configured')
    }

    let result: SiteverifyResponse
    try {
        const response = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret: secretKey, response: token }),
        })
        if (!response.ok) {
            throw new Error(`siteverify responded ${response.status}`)
        }
        result = await response.json()
    } catch (error) {
        const err = `Error verifying reCAPTCHA: ${error instanceof Error ? error.message : error}`
        console.error(err)
        throw new Error(err)
    }

    if (!result.success) {
        throw new Error(`reCAPTCHA rejected: ${(result['error-codes'] ?? ['unknown']).join(', ')}`)
    }
}
