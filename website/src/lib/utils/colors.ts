export function getDominantColor(imgEl: HTMLImageElement): Promise<string> {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve('rgb(0, 0, 0)');

        canvas.width = 1;
        canvas.height = 1;

        ctx.drawImage(imgEl, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        
        resolve(`rgb(${r}, ${g}, ${b})`);
    });
}
