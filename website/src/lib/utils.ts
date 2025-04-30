import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function getRandomColor(name: string): string {
    const colors = [
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-purple-100 text-purple-800',
        'bg-amber-100 text-amber-800',
        'bg-rose-100 text-rose-800',
        'bg-teal-100 text-teal-800',
        'bg-indigo-100 text-indigo-800'
    ];

    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}