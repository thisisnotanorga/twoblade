<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Paperclip, X, Upload } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import ImagePreview from './ImagePreview.svelte';
	import { Badge } from '../ui/badge';
	import { formatFileSize } from '$lib/utils';

	const ALLOWED_TYPES = [
		'application/pdf',
		'image/jpeg',
		'image/png',
		'image/gif',
		'text/plain',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	];

	const MAX_FILES = 10;
	const MAX_SIZE = 25 * 1024 * 1024; // 25MB

	const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

	type FileUpload = {
		file: File;
		progress: number;
		status: 'pending' | 'uploading' | 'complete' | 'error';
		s3Key?: string;
		error?: string;
	};

	let fileInputElement: HTMLInputElement | null = $state(null);

	let { onAttach } = $props<{
		onAttach: (key: string, filename: string, size: number, type: string) => void;
	}>();

	let uploads = $state<FileUpload[]>([]);

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;

		const newFiles = Array.from(input.files).filter((file) => {
			if (!ALLOWED_TYPES.includes(file.type)) {
				console.error(`File type ${file.type} not allowed`);
				return false;
			}
			if (file.size > MAX_SIZE) {
				console.error(`File ${file.name} exceeds 25MB limit`);
				return false;
			}
			return true;
		});

		if (uploads.length + newFiles.length > MAX_FILES) {
			console.error(`Cannot attach more than ${MAX_FILES} files`);
			return;
		}

		const newUploads = newFiles.map((file) => ({
			file,
			progress: 0,
			status: 'pending' as const
		}));

		uploads = [...uploads, ...newUploads];

		newUploads.forEach((_, index) => {
			const totalIndex = uploads.length - newUploads.length + index;
			uploadFile(uploads[totalIndex]);
		});

		input.value = '';
	}

	async function uploadFile(upload: FileUpload) {
		try {
			upload.status = 'uploading';

			const response = await fetch('/api/attachment', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					filename: upload.file.name,
					size: upload.file.size,
					type: upload.file.type
				})
			});

			if (!response.ok) throw new Error('Failed to get upload URL');

			const { uploadUrl, key } = await response.json();

			await new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();

				xhr.upload.onprogress = (event) => {
					if (event.lengthComputable) {
						upload.progress = (event.loaded / event.total) * 100;
					}
				};

				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve(xhr.response);
					} else {
						reject(new Error('Upload failed'));
					}
				};

				xhr.onerror = () => reject(new Error('Upload failed'));

				xhr.open('PUT', uploadUrl);
				xhr.setRequestHeader('Content-Type', upload.file.type);
				xhr.send(upload.file);
			});

			upload.status = 'complete';
			upload.s3Key = key;

			onAttach(key, upload.file.name, upload.file.size, upload.file.type);
		} catch (error) {
			upload.status = 'error';
			upload.error = error instanceof Error ? error.message : 'Upload failed';
		}
	}

	function removeUpload(index: number) {
		uploads = uploads.filter((_, i) => i !== index);
	}

	function getInputElement(): HTMLInputElement | null {
		if (!fileInputElement) return null;
		return fileInputElement;
	}

	function isImageFile(file: File): boolean {
		return IMAGE_TYPES.includes(file.type);
	}

	function getFileNameParts(filename: string) {
		const lastDotIndex = filename.lastIndexOf('.');
		if (lastDotIndex === -1 || lastDotIndex === 0) {
			return { name: filename, ext: '' };
		}
		return {
			name: filename.slice(0, lastDotIndex),
			ext: filename.slice(lastDotIndex + 1).toUpperCase()
		};
	}
</script>

<div class="flex flex-col gap-2">
	<Input
		bind:ref={fileInputElement}
		type="file"
		class="hidden"
		multiple
		accept={ALLOWED_TYPES.join(',')}
		onchange={handleFileSelect}
	/>

	<Button
		variant="outline"
		class="w-full"
		onclick={() => getInputElement()?.click()}
		disabled={uploads.length >= MAX_FILES}
	>
		<Paperclip class="mr-2 h-4 w-4" />
		Attach files ({uploads.length}/{MAX_FILES})
	</Button>

	{#if uploads.length > 0}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
			{#each uploads as upload, i}
				<div class="relative">
					{#if isImageFile(upload.file)}
						<ImagePreview file={upload.file} />
						{#if upload.status === 'uploading'}
							<div
								class="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-[1px]"
							>
								<div class="text-xs font-medium text-white">
									{Math.round(upload.progress)}%
								</div>
							</div>
						{/if}
					{:else}
                        <div
                            class="hover:bg-accent hover:text-accent-foreground inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 transition-colors"
                        >
                            <Upload class="h-4 w-4" />
                            <div class="min-w-0 flex-1">
                                {#if true}
                                    {@const { name, ext } = getFileNameParts(upload.file.name)}
                                    <div class="flex flex-col">
                                        <div class="flex items-center">
                                            <span class="truncate text-sm font-medium">{name}</span>
                                            <span class="flex-shrink-0 text-sm font-medium">.{ext.toLowerCase()}</span>
                                        </div>
                                        <span class="text-xs">
                                            {formatFileSize(upload.file.size)}
                                        </span>
                                    </div>
                                {/if}
                                <Progress value={upload.progress} class="mt-2 h-1" />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-6 w-6 flex-shrink-0"
                                onclick={() => removeUpload(i)}
                            >
                                <X class="h-4 w-4" />
                            </Button>
                        </div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
