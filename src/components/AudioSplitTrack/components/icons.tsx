import React from 'react'

interface IconProps {
    className?: string
    fontSize?: 'small' | 'large' | 'inherit'
    color?: 'primary' | 'secondary' | 'error' | 'inherit'
}

const sizeClass = (fontSize?: IconProps['fontSize']) => {
    if (fontSize === 'small') return 'w-4 h-4'
    if (fontSize === 'large') return 'w-8 h-8'
    return 'w-5 h-5'
}

const colorClass = (color?: IconProps['color']) => {
    if (color === 'primary') return 'text-[#38B6FF]'
    if (color === 'secondary') return 'text-[#FF4BA8]'
    if (color === 'error') return 'text-red-500'
    return 'text-current'
}

export const AddIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M19 11H13V5a1 1 0 0 0-2 0v6H5a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2z" />
    </svg>
)

export const DownloadIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 4v-2h14v2H5z" />
    </svg>
)

/** Circular "start over" arrow — used for resetting the tool. */
export const RestartIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
    </svg>
)

export const RestorePageIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 14H9v-2h4v2zm2-4H9v-2h6v2zm-1-5V3.5L18.5 9H14z" />
        <path d="M9 13l1.5-1.5L12 13l-1 1-2-1z" />
    </svg>
)

export const ArchiveIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" />
    </svg>
)

export const SettingsIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.12 7.12 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
)

export const EditIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
)

export const PhotoIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </svg>
)

export const CloseIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
)

export const ChevronLeftIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
    </svg>
)

export const SaveIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
    </svg>
)

export const TimerIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 0 0 7.03-14.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
    </svg>
)

export const InfoIcon = ({ className, fontSize, color }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${colorClass(color)} ${className ?? ''}`}
    >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
)

export const PlayArrowIcon = ({ className, fontSize, color }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${colorClass(color)} ${className ?? ''}`}
    >
        <path d="M8 5v14l11-7z" />
    </svg>
)

export const PauseIcon = ({ className, fontSize, color }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${colorClass(color)} ${className ?? ''}`}
    >
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
)

export const PauseCircleIcon = ({ className, fontSize, color }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${colorClass(color)} ${className ?? ''}`}
    >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
    </svg>
)

export const DeleteIcon = ({ className, fontSize, color }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${colorClass(color)} ${className ?? ''}`}
    >
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
)

export const MoreHorizIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
)

export const SkipPreviousIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
)

export const SkipNextIcon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M6 18l8.5-6L6 6v12zm2-8.14 4.72 3.14L8 16.14V9.86zM16 6h2v12h-2z" />
    </svg>
)

export const Replay10Icon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.1 11H10v-3.26L9 13v-.73l1.8-.6h.1V16zm3.23 0h-1.05v-3.55l-.96.28v-.78l1.9-.68h.11V16z" />
    </svg>
)

export const Forward10Icon = ({ className, fontSize }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${sizeClass(fontSize)} ${className ?? ''}`}
    >
        <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2zm-5.1 3H11.9v-3.26l-.96.28v-.78l1.8-.6h.1V16h.06zm3.23 0h-1.05v-3.55l-.96.28v-.78l1.9-.68h.11V16z" />
    </svg>
)
