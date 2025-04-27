<script lang="ts">
	import { X } from 'lucide-svelte';
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

	const sanitizeConfig: Config = {
		ALLOWED_TAGS: [...ALLOWED_HTML_TAGS],
		ALLOWED_ATTR: ['href', 'src', 'alt', 'style'],
		ALLOWED_URI_REGEXP:
			/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
	};

	// Regex to find theme placeholders like {$LIGHT ? lightVal : darkVal}
	const themePlaceholderRegex = /\{\s*\$LIGHT\s*\?\s*([^:]+?)\s*:\s*([^}]+?)\s*\}/g;

	function processThemeStyles(html: string, currentMode: 'light' | 'dark'): string {
		console.log(`[processThemeStyles] Input HTML for theme processing:`, JSON.stringify(html)); // Log input
		const result = html.replace(themePlaceholderRegex, (match, lightValue, darkValue) => {
			const replacement = currentMode === 'light' ? lightValue.trim() : darkValue.trim();
			console.log(`[processThemeStyles] Match: "${match}", Light: "${lightValue}", Dark: "${darkValue}", Mode: "${currentMode}", Replacing with: "${replacement}"`); // Log replacement details
			return replacement;
		});
		console.log(`[processThemeStyles] Output HTML after theme processing:`, JSON.stringify(result)); // Log output
		return result;
	}

	function getSanitizedContent(email: Email | null, currentMode: 'light' | 'dark'): string {
		if (!email) return '';
		if (email.content_type === 'text/html' && email.html_body) {
			// Process theme styles *before* sanitizing
			const processedHtml = processThemeStyles(email.html_body, currentMode);
			console.log(`[getSanitizedContent] HTML being passed to DOMPurify:`, JSON.stringify(processedHtml)); // Log input to sanitize
			const sanitized = DOMPurify.sanitize(processedHtml, sanitizeConfig);
			console.log(`[getSanitizedContent] HTML after DOMPurify:`, JSON.stringify(sanitized)); // Log output from sanitize
			return sanitized;
		}
		return email.body || '';
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
						Array.from(node.attributes).forEach(attr => node.removeAttribute(attr.name));
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
                                            console.log(`[Sanitize Style] Clamping border px value: ${num}px -> ${clampedNum}px`);
											return `${clampedNum}px`;
										}
										// Keep other valid units as is for now
										return `${num}${unit}`;
									});
                                    // Basic color validation (ensure it's hex, rgb, or known color) - very basic
                                    value = value.replace(/#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+/g, (colorMatch) => {
                                        // This is a placeholder - real color validation is complex
                                        // For now, just ensures it looks somewhat like a color
                                        return colorMatch;
                                    });
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
	});
</script>

{#if email}
	<div class="bg-background flex h-[calc(100vh-6rem)] flex-col p-6">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-2xl font-bold">{email.subject}</h2>
			<button onclick={onClose} class="hover:bg-accent rounded-full p-2" aria-label="Close email">
				<X class="h-5 w-5" />
			</button>
		</div>

		<div class="mb-4">
			<div class="text-muted-foreground text-sm">From:</div>
			<div class="font-medium">{email.from_address}</div>
		</div>

		<div class="mb-6">
			<div class="text-muted-foreground text-sm">Sent:</div>
			<div>{new Date(email.sent_at).toLocaleString()}</div>
		</div>

		<div class="prose max-w-5xl flex-1 px-4">
			{#if email.content_type === 'text/html' && email.html_body}
				{@html getSanitizedContent(email, $mode ?? 'light')}
			{:else}
				<p class="whitespace-pre-wrap">{email.body}</p>
			{/if}
		</div>
	</div>
{:else}
	<div class="text-muted-foreground flex h-full items-center justify-center">
		Select an email to view its contents
	</div>
{/if}

<style>
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
