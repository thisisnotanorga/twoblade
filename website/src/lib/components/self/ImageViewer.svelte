<script lang="ts">
    import { Dialog, DialogContent } from "$lib/components/ui/dialog";
    import { X, Download } from "lucide-svelte";
    import { downloadFile } from '$lib/utils/download';

    let { 
        url, 
        previewUrl, 
        dominantColor, 
        filename, 
        open = $bindable() 
    } = $props<{
        url: string;
        previewUrl: string; // Added previewUrl prop
        dominantColor: string; // Added dominantColor prop
        filename: string;
        open?: boolean;
    }>();

    let isFullImageLoading = $state(true);
</script>

<Dialog bind:open>
    <DialogContent class="max-w-[min(90vw,900px)] p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div class="relative flex items-center justify-center" style="background-color: {dominantColor};">
            <!-- Close button -->
            <button
                type="button"
                onclick={() => open = false}
                class="absolute right-2 top-2 z-20 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                aria-label="Close image viewer"
            >
                <X class="h-4 w-4" />
            </button>

            <!-- Download button -->
            <button
                type="button"
                onclick={() => downloadFile(url, filename)}
                class="absolute right-12 top-2 z-20 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                aria-label="Download image"
            >
                <Download class="h-4 w-4" />
            </button>

            <!-- Image Container -->
            <div class="relative max-h-[90vh] w-full">
                <div class="relative h-0 pb-[100%]">
                    <!-- Preview Image (Blurred) -->
                    {#if previewUrl && isFullImageLoading}
                        <img
                            src={previewUrl}
                            alt="Loading preview"
                            class="absolute inset-0 h-full w-full object-contain blur-md scale-105"
                            aria-hidden="true"
                        />
                    {/if}

                    <!-- Full Resolution Image -->
                    <img
                        src={url}
                        alt={filename}
                        class="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
                        class:opacity-0={isFullImageLoading}
                        onload={() => isFullImageLoading = false}
                    />
                </div>
            </div>
        </div>
    </DialogContent>
</Dialog>
