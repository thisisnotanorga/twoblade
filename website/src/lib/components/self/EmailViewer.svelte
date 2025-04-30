<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { X, ArrowDownLeft, ArrowUpRight, ClockIcon, CheckCheck } from 'lucide-svelte';
	import { USER_DATA } from '$lib/stores/user';
	import type { Email } from '$lib/types/email';
	import {
		ALLOWED_HTML_TAGS,
		ALLOWED_HTML_ATTRIBUTES,
		ALLOWED_CSS_PROPERTIES
	} from '$lib/types/email';
	import DOMPurify from 'dompurify';
	import type { Config } from 'dompurify';
	import { mode } from 'mode-watcher'; // Assuming mode store is here

	let { email, onClose } = $props<{
		email: Email | null;
		onClose: () => void;
	}>();

	let isReceiver = $derived(email?.to_address === $USER_DATA?.username + '#' + $USER_DATA?.domain);

	const sanitizeConfig: Config = {
		ALLOWED_TAGS: [...ALLOWED_HTML_TAGS],
		ALLOWED_ATTR: ['href', 'src', 'alt', 'style'],
		ALLOWED_URI_REGEXP:
			/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
	};

	const themePlaceholderRegex = /\{\s*\$LIGHT\s*\?\s*([^:]+?)\s*:\s*([^}]+?)\s*\}/g;

	function processThemeStyles(html: string, currentMode: 'light' | 'dark'): string {
		const result = html.replace(themePlaceholderRegex, (match, lightValue, darkValue) => {
			const replacement = currentMode === 'light' ? lightValue.trim() : darkValue.trim();
			return replacement;
		});
		return result;
	}

	function getSanitizedContent(email: Email | null, currentMode: 'light' | 'dark'): string {
		if (!email) return '';
		if (email.content_type === 'text/html' && email.html_body) {
			const processedHtml = processThemeStyles(email.html_body, currentMode);
			const sanitized = DOMPurify.sanitize(processedHtml, sanitizeConfig);
			return sanitized;
		}
		return email.body || '';
	}

	async function markAsRead(emailId: string) {
		try {
			await fetch('/api/emails/read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emailId })
			});
		} catch (error) {
			console.error('Failed to mark email as read:', error);
		}
	}

	$effect(() => {
		DOMPurify.removeHook('uponSanitizeElement');
		DOMPurify.removeHook('uponSanitizeAttribute');

		if (email?.content_type === 'text/html') {
			(DOMPurify as any).addHook(
				'uponSanitizeElement',
				(node: Element, data: { tagName: string }) => {
					const attrs =
						ALLOWED_HTML_ATTRIBUTES[data.tagName as keyof typeof ALLOWED_HTML_ATTRIBUTES];
					if (attrs) {
						Array.from(node.attributes).forEach((attr) => {
							if (!attrs.includes(attr.name)) {
								node.removeAttribute(attr.name);
							}
						});
					} else if (data.tagName !== '*' && node.attributes) {
						// Remove all attributes if tag is not '*' and has no specific allowed attributes
						Array.from(node.attributes).forEach((attr) => node.removeAttribute(attr.name));
					}
				}
			);

			(DOMPurify as any).addHook(
				'uponSanitizeAttribute',
				(node: Element, data: { attrName: string; attrValue: string }) => {
					if (data.attrName === 'style') {
						const styles = data.attrValue.split(';');
						const validatedStyles = [];
						for (const style of styles) {
							const parts = style.split(':');
							if (parts.length < 2) continue; // Skip invalid format

							const prop = parts[0].trim();
							let value = parts.slice(1).join(':').trim();

							// Check if property is allowed
							if (prop && ALLOWED_CSS_PROPERTIES.includes(prop as any)) {
								// Sanitize pixel values in border properties
								if (prop === 'border' || prop.startsWith('border-')) {
									// Replace potentially large/invalid pixel values
									value = value.replace(/(\d+)(px|em|rem|%|vh|vw)/g, (match, numStr, unit) => {
										const num = parseInt(numStr, 10);
										if (isNaN(num)) return ''; // Remove if not a number
										// Set a reasonable max limit for pixels, allow others?
										if (unit === 'px') {
											const clampedNum = Math.min(Math.max(0, num), 20); // Clamp between 0 and 20px for borders
											console.log(
												`[Sanitize Style] Clamping border px value: ${num}px -> ${clampedNum}px`
											);
											return `${clampedNum}px`;
										}
										// Keep other valid units as is for now
										return `${num}${unit}`;
									});
									// Basic color validation (ensure it's hex, rgb, or known color) - very basic
									value = value.replace(
										/#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+/g,
										(colorMatch) => {
											// This is a placeholder - real color validation is complex
											// For now, just ensures it looks somewhat like a color
											return colorMatch;
										}
									);
								}
								// Add more value sanitization for other props if needed (e.g., font-size)

								validatedStyles.push(`${prop}: ${value}`);
							}
						}
						data.attrValue = validatedStyles.join('; '); // Add space for readability
						console.log(`[Sanitize Style] Final style attribute value:`, data.attrValue);
					}
				}
			);
		}

		if (email && !email.read_at) {
			markAsRead(email.id);
		}
	});

	function formatDate(date: string | null) {
		if (!date) return '';
		return new Date(date).toLocaleString([], {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	type BadgeVariant = 'outline' | 'default' | 'secondary' | 'destructive';
	function getFromToBadgeContent(email: Email): { icon: any; label: string; value: string; variant: BadgeVariant } {
		const isSender = email.from_address === $USER_DATA?.username + '#' + $USER_DATA?.domain;
		return {
			icon: isSender ? ArrowUpRight : ArrowDownLeft,
			label: isSender ? 'To' : 'From',
			value: isSender ? email.to_address : email.from_address,
			variant: isSender ? 'outline' : 'default'
		};
	}
</script>

{#if email}
	{@const badge = getFromToBadgeContent(email)}

	<div class="flex h-full flex-col">
		<div class="flex items-center justify-between border-b p-4">
			<div class="space-y-1">
				<h2 class="text-xl font-semibold">{email.subject || 'No subject'}</h2>
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant={badge.variant} class="flex items-center gap-1.5">
						<badge.icon class="h-3.5 w-3.5" />
						{badge.label} <span class="font-medium">{badge.value}</span>
					</Badge>
					<Badge variant="secondary" class="flex items-center gap-1.5">
						<ClockIcon class="h-3.5 w-3.5" />
						Sent {formatDate(email.sent_at)}
					</Badge>
					{#if !isReceiver && email.read_at}
						<Badge variant="secondary" class="flex items-center gap-1.5">
							<CheckCheck class="h-3.5 w-3.5" />
							Seen {formatDate(email.read_at)}
						</Badge>
					{/if}
				</div>
			</div>
			<Button variant="ghost" size="icon" onclick={onClose} class="ml-auto">
				<X class="h-4 w-4" />
			</Button>
		</div>

		<div class="flex-1 overflow-auto p-4">
			{#if email.content_type === 'text/html'}
				{@html getSanitizedContent(email, mode.current ?? 'light')}
			{:else}
				<div class="whitespace-pre-wrap">{email.body || ''}</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="text-muted-foreground flex h-full items-center justify-center">
		Select an email to view its contents
	</div>
{/if}

<style>
	:global(.badge-row) {
		@apply text-muted-foreground flex flex-wrap items-center gap-2 text-sm;
	}

	:global(.prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	:global(.prose th),
	:global(.prose td) {
		border: 1px solid hsl(var(--border));
		padding: 0.75rem;
	}

	:global(.prose th) {
		background-color: hsl(var(--muted));
		font-weight: 600;
	}

	/* List styles */
	:global(.prose ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin: 1rem 0;
	}

	:global(.prose ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin: 1rem 0;
	}

	/* Link styles */
	:global(.prose a) {
		color: hsl(var(--primary));
		text-decoration: underline;
	}

	:global(.prose a:hover) {
		color: hsl(var(--primary) / 0.8);
	}
</style>
