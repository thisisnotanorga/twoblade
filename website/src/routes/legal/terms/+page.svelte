<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import * as Card from '$lib/components/ui/card';
	import FileText from 'lucide-svelte/icons/file-text';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/state';

	const LAST_UPDATED = 'May 5, 2025';
	const CONTACT_EMAIL = 'admin#twoblade.com';
</script>

<svelte:head>
	<title>Terms of Service | Twoblade</title>
	<meta name="description" content="Read the Terms of Service for using the Twoblade email platform." />
	<meta property="og:title" content="Terms of Service | Twoblade" />
	<meta
		property="og:description"
		content="Read the Terms of Service for using the Twoblade email platform."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
</svelte:head>

<div
	class="container mx-auto max-h-screen max-w-4xl overflow-y-auto py-10 [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden"
>
	<Card.Root class="mb-20 p-6">
		<div class="mb-8 flex items-center gap-3">
			<FileText class="text-primary h-10 w-10" />
			<div>
				<h1 class="text-4xl font-bold">Terms of Service</h1>
				<p class="text-muted-foreground">Last updated: {LAST_UPDATED}</p>
			</div>
		</div>

		<Separator class="my-6" />

		<div class="prose prose-sm dark:prose-invert max-w-none space-y-6 md:prose-base">
			<section>
				<h2>1. Acceptance of Terms</h2>
				<p>
					By creating an account, accessing, or using the Twoblade email service ("Service"), you
					("User") agree to be bound by these Terms of Service ("Terms") and our Privacy Policy. If
					you do not agree to these Terms, do not use the Service.
				</p>
			</section>

			<section>
				<h2>2. Description of Service</h2>
				<p>
					Twoblade provides an email communication platform utilizing the SHARP protocol. Key
					features include:
				</p>
				<ul class="ml-6 list-disc space-y-1">
					<li>Sending and receiving emails locally and to other SHARP-compatible servers.</li>
					<li>Email composition (text and HTML), drafts, and contact management.</li>
					<li>File attachments with size and storage limits (currently 25MB per file, 1GB total).</li>
					<li>Email scheduling, expiration, and self-destruct options.</li>
					<li>Automatic email classification (e.g., Promotions, Updates).</li>
					<li>Spam mitigation using Hashcash proof-of-work.</li>
					<li>Optional desktop notifications.</li>
					<li>Vocabulary limitations based on user-provided IQ score.</li>
					<li>Data export and account deletion functionalities.</li>
				</ul>
			</section>

			<section>
				<h2>3. User Accounts</h2>
				<ul class="ml-6 list-disc space-y-1">
					<li>
						<strong>Registration:</strong> You must provide accurate information, including a unique
						username, domain, and complete an IQ assessment. You are responsible for maintaining the confidentiality of your password.
					</li>
					<li>
						<strong>IQ Assessment:</strong> An IQ assessment is mandatory during registration. This score determines
						your vocabulary restrictions. The assessment must be completed truthfully and accurately.
					</li>
					<li>
						<strong>Account Security:</strong> You are responsible for all activities that occur under
						your account.
					</li>
				</ul>
			</section>

			<section>
				<h2>4. User Conduct and Responsibilities</h2>
				<p>You agree not to use the Service to:</p>
				<ul class="ml-6 list-disc space-y-1">
					<li>Send spam or unsolicited emails.</li>
					<li>Violate any applicable local, state, national, or international law.</li>
					<li>Transmit any material that is unlawful, harmful, threatening, abusive, defamatory, vulgar,
						obscene, or otherwise objectionable.</li>
					<li>Impersonate any person or entity or falsely state or otherwise misrepresent your
						affiliation with a person or entity.</li>
					<li>Transmit viruses, malware, or other harmful code.</li>
					<li>Interfere with or disrupt the Service or servers or networks connected to the Service.</li>
					<li>Attempt to exceed storage or attachment size limits.</li>
					<li>Circumvent vocabulary restrictions if applicable based on your provided IQ.</li>
				</ul>
				<p>
					You are solely responsible for the content you send and receive through the Service and for
					complying with these Terms.
				</p>
			</section>

			<section>
				<h2>5. Service Limitations and Modifications</h2>
				<ul class="ml-6 list-disc space-y-1">
					<li>
						<strong>SHARP Protocol:</strong> The Service relies on the SHARP protocol. Interoperability
						depends on other servers correctly implementing the protocol. We are not responsible for
						failures caused by external SHARP servers.
					</li>
					<li>
						<strong>Availability:</strong> We strive to keep the Service operational but do not guarantee
						uninterrupted access. Maintenance or unforeseen issues may cause temporary downtime.
					</li>
					<li>
						<strong>Limits:</strong> We reserve the right to impose limits on usage, such as storage
						space, attachment size, and the number of emails sent/received. Current limits are stated
						in Section 2 but are subject to change.
					</li>
					<li>
						<strong>Modifications:</strong> We reserve the right to modify or discontinue, temporarily or
						permanently, the Service (or any part thereof) with or without notice.
					</li>
					<li>
						<strong>Hashcash:</strong> Failure to provide adequate Hashcash may result in emails being
						marked as spam or rejected. Thresholds are subject to change.
					</li>
					<li>
						<strong>Classification:</strong> Email classification is automated and may not always be
						accurate.
					</li>
				</ul>
			</section>

			<section>
				<h2>6. Data Handling and Privacy</h2>
				<p>
					Our data handling practices are detailed in our <a href="/legal/privacy">Privacy Policy</a
					>, which is incorporated into these Terms by reference. Key points include:
				</p>
				<ul class="ml-6 list-disc space-y-1">
					<li>
						<strong>Data Export:</strong> You can request an export of your data via the Settings page.
					</li>
					<li>
						<strong>Account Deletion:</strong> You can request account deletion via the Settings page.
						Upon deletion, your account is deactivated, personal data (settings, drafts, contacts) is
						removed, and your username is reserved. Email conversations involving other users are
						generally preserved unless they expire. See the Privacy Policy for full details.
					</li>
				</ul>
			</section>

			<section>
				<h2>7. Intellectual Property</h2>
				<p>
					The Service and its original content, features, and functionality are and will remain the
					exclusive property of Twoblade and its licensors. The Service is protected by copyright,
					trademark, and other laws.
				</p>
			</section>

			<section>
				<h2>8. Disclaimers and Limitation of Liability</h2>
				<ul class="ml-6 list-disc space-y-1">
					<li>
						<strong>Disclaimer of Warranties:</strong> The Service is provided "AS IS" and "AS AVAILABLE"
						without warranties of any kind, either express or implied, including, but not limited to,
						implied warranties of merchantability, fitness for a particular purpose, or
						non-infringement.
					</li>
					<li>
						<strong>Limitation of Liability:</strong> In no event shall Twoblade, nor its directors,
						employees, partners, agents, suppliers, or affiliates, be liable for any indirect,
						incidental, special, consequential, or punitive damages, including without limitation, loss
						of profits, data, use, goodwill, or other intangible losses, resulting from (i) your
						access to or use of or inability to access or use the Service; (ii) any conduct or content
						of any third party on the Service; (iii) any content obtained from the Service; and (iv)
						unauthorized access, use, or alteration of your transmissions or content, whether based on
						warranty, contract, tort (including negligence), or any other legal theory, whether or not
						we have been informed of the possibility of such damage.
					</li>
				</ul>
			</section>

			<section>
				<h2>9. Termination</h2>
				<p>
					We may terminate or suspend your account and ban access to the Service immediately, without
					prior notice or liability, under our sole discretion, for any reason whatsoever, including
					without limitation if you breach the Terms. If you wish to terminate your account, you may
					do so via the Settings page.
				</p>
			</section>

            <section>
                <h2>10. Changes to Terms</h2>
                <p>
                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
                    What constitutes a material change will be determined at our sole discretion. By continuing
                    to access or use our Service after any revisions become effective, you agree to be bound by
                    the revised terms.
                </p>
            </section>

			<div class="text-muted-foreground text-sm">
				<p>Last Updated: {LAST_UPDATED}</p>
				<p>Contact: <span class="text-primary">{CONTACT_EMAIL}</span></p>
			</div>
		</div>

		<Separator class="my-8" />

		<div class="flex justify-center">
			<Button variant="outline" size="lg" onclick={() => goto('/legal/privacy')}>
				Read our Privacy Policy →
			</Button>
		</div>
	</Card.Root>
</div>
