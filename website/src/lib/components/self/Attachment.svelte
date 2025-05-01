<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Progress } from '$lib/components/ui/progress';
    import { Paperclip, X, Upload } from 'lucide-svelte';
    import { Input } from '$lib/components/ui/input';
    import ImagePreview from './ImagePreview.svelte';

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

        const newFiles = Array.from(input.files).filter(file => {
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

        const newUploads = newFiles.map(file => ({
            file,
            progress: 0,
            status: 'pending' as const
        }));

        uploads = [...uploads, ...newUploads];

        // Auto-upload images
        newUploads.forEach((upload, index) => {
            if (isImageFile(upload.file)) {
                const totalIndex = uploads.length - newUploads.length + index;
                uploadFile(uploads[totalIndex]);
            }
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
        return fileInputElement
    }

    function isImageFile(file: File): boolean {
        return IMAGE_TYPES.includes(file.type);
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
                            <div class="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] rounded-xl">
                                <div class="text-xs font-medium text-white">
                                    {Math.round(upload.progress)}%
                                </div>
                            </div>
                        {/if}
                    {:else}
                        <div class="border-input flex items-center gap-2 rounded border p-2">
                            <div class="flex-1">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm font-medium">{upload.file.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-6 w-6"
                                        onclick={() => removeUpload(i)}
                                    >
                                        <X class="h-4 w-4" />
                                    </Button>
                                </div>
                                <Progress value={upload.progress} class="h-1" />
                            </div>
                        </div>
                    {/if}
                    {#if !isImageFile(upload.file) && upload.status === 'pending'}
                        <Button
                            variant="ghost"
                            size="icon"
                            class="absolute right-2 top-2 h-6 w-6 bg-black/50 text-white hover:bg-black/70"
                            onclick={() => uploadFile(upload)}
                        >
                            <Upload class="h-4 w-4" />
                        </Button>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>