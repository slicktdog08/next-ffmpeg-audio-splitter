'use client'
import React from 'react'

/**
 * Shared look for the splitter, mirroring the home page: off-white page, inset rounded cards,
 * Marigny-bold black headings, Brevia body, black pill buttons with a hover invert.
 */
export const brand = {
    blue: '#38B6FF',
    pink: '#FF4BA8',
    yellow: '#FFE031',
}

export const font = {
    heading: 'font-(--font-heading) font-bold tracking-tight',
    body: 'font-(--font-body)',
}

export const card = 'rounded-2xl md:rounded-3xl'

/** 16px on phones: anything smaller makes iOS Safari zoom the page when the field is focused. */
export const inputClass =
    'w-full rounded-xl border border-black/15 bg-white px-3.5 py-2.5 text-base md:text-[15px] text-black placeholder-black/35 ' +
    'focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 disabled:opacity-50 transition-colors'

export const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-black/60 mb-1.5'

type PillVariant = 'primary' | 'outline' | 'ghost' | 'onGradient'
type PillSize = 'sm' | 'md' | 'lg'

const pillBase =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none cursor-pointer ' +
    'transition-all duration-300 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100'

const pillVariant: Record<PillVariant, string> = {
    primary: 'bg-black text-white hover:bg-white hover:text-black ring-1 ring-black hover:shadow-xl hover:scale-[1.03]',
    outline: 'bg-transparent text-black ring-1 ring-black hover:bg-black hover:text-white hover:shadow-xl hover:scale-[1.03]',
    ghost: 'bg-transparent text-black hover:bg-black/5',
    onGradient: 'bg-white/85 text-black backdrop-blur hover:bg-black hover:text-white hover:shadow-xl hover:scale-[1.03]',
}

const pillSize: Record<PillSize, string> = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-11 px-6 text-[15px]',
    lg: 'h-13 px-8 text-base md:text-lg',
}

export const pillClass = (variant: PillVariant = 'primary', size: PillSize = 'md', extra = '') =>
    `${pillBase} ${pillVariant[variant]} ${pillSize[size]} ${extra}`

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: PillVariant
    size?: PillSize
}

export const PillButton = ({ variant = 'primary', size = 'md', className = '', ...rest }: PillButtonProps) => (
    <button type="button" className={pillClass(variant, size, className)} {...rest} />
)

/** Round icon-only button used for transport and small actions. */
export const iconButtonClass = (extra = '') =>
    `inline-flex items-center justify-center rounded-full cursor-pointer transition-all duration-200 ` +
    `disabled:opacity-40 disabled:cursor-not-allowed ${extra}`

export const ArrowIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
)
