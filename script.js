document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const aspectRatioSelect = document.getElementById('aspectRatio');
    const outputWidthInput = document.getElementById('outputWidth');
    const outputWidthCustomInput = document.getElementById('outputWidthCustom');
    const outputHeightCustomInput = document.getElementById('outputHeightCustom');
    const customDimensionsDiv = document.getElementById('customDimensions');
    const targetWidthGroup = document.getElementById('targetWidthGroup');
    const imageQualitySlider = document.getElementById('imageQuality');
    const qualityValueSpan = document.getElementById('qualityValue');
    const outputFormatSelect = document.getElementById('outputFormat');
    const downloadButton = document.getElementById('downloadButton');
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const outputDimensionsText = document.getElementById('outputDimensionsText');
    const imageNameP = document.getElementById('imageName');
    const resizeModeSelect = document.getElementById('resizeMode');
    const backgroundColorInput = document.getElementById('backgroundColor');
    const backgroundColorGroup = document.getElementById('backgroundColorGroup');

    let originalImage = null;
    let originalFileName = 'resized_image';

    // Update quality value display
    imageQualitySlider.addEventListener('input', () => {
        qualityValueSpan.textContent = parseFloat(imageQualitySlider.value).toFixed(2);
        if (originalImage) processImage();
    });

    // Event listeners for controls
    imageUpload.addEventListener('change', handleImageUpload);
    aspectRatioSelect.addEventListener('change', handleAspectRatioChange);
    [outputWidthInput, outputWidthCustomInput, outputHeightCustomInput, outputFormatSelect, resizeModeSelect, backgroundColorInput].forEach(el => {
        el.addEventListener('change', () => {
            if (originalImage) processImage();
        });
    });
    outputWidthInput.addEventListener('input', () => { // For faster feedback on width input
         if (originalImage) processImage();
    });


    downloadButton.addEventListener('click', downloadImage);

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            originalFileName = file.name.split('.')[0] || 'resized_image';
            imageNameP.textContent = `Source: ${file.name}`;
            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage = new Image();
                originalImage.onload = () => {
                    // Set initial output width to original image width or a sensible default
                    if (aspectRatioSelect.value === 'original' || !outputWidthInput.value) {
                        outputWidthInput.value = originalImage.naturalWidth > 1280 ? 1280 : originalImage.naturalWidth;
                    }
                    processImage();
                    downloadButton.disabled = false;
                };
                originalImage.onerror = () => {
                    alert("Error loading image. Please try a different file.");
                    resetTool();
                }
                originalImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    function handleAspectRatioChange() {
        if (aspectRatioSelect.value === 'custom') {
            customDimensionsDiv.classList.remove('hidden');
            targetWidthGroup.classList.add('hidden');
            // If custom is selected, and values exist, trigger process
            if (originalImage && outputWidthCustomInput.value && outputHeightCustomInput.value) {
                 processImage();
            }
        } else {
            customDimensionsDiv.classList.add('hidden');
            targetWidthGroup.classList.remove('hidden');
            if (originalImage) processImage();
        }
    }

    resizeModeSelect.addEventListener('change', () => {
        if (resizeModeSelect.value === 'fit') {
            backgroundColorGroup.classList.remove('hidden');
        } else {
            backgroundColorGroup.classList.add('hidden');
        }
        if (originalImage) processImage();
    });


    function processImage() {
        if (!originalImage) return;

        let targetWidth, targetHeight;
        const selectedAspectRatio = aspectRatioSelect.value;
        const resizeMode = resizeModeSelect.value;

        if (selectedAspectRatio === 'custom') {
            targetWidth = parseInt(outputWidthCustomInput.value);
            targetHeight = parseInt(outputHeightCustomInput.value);
            if (isNaN(targetWidth) || targetWidth <= 0 || isNaN(targetHeight) || targetHeight <= 0) {
                outputDimensionsText.textContent = "Please enter valid custom dimensions.";
                canvas.width = 300; canvas.height = 150; // Default placeholder
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillText("Enter custom width & height", 10, 50);
                return;
            }
        } else {
            targetWidth = parseInt(outputWidthInput.value);
            if (isNaN(targetWidth) || targetWidth <= 0) {
                outputDimensionsText.textContent = "Please enter a valid target width.";
                 canvas.width = 300; canvas.height = 150; // Default placeholder
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillText("Enter target width", 10, 50);
                return;
            }

            if (selectedAspectRatio === 'original') {
                targetHeight = Math.round(targetWidth * (originalImage.naturalHeight / originalImage.naturalWidth));
            } else {
                const [arW, arH] = selectedAspectRatio.split(':').map(Number);
                targetHeight = Math.round(targetWidth * (arH / arW));
            }
        }


        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawing

        const imgWidth = originalImage.naturalWidth;
        const imgHeight = originalImage.naturalHeight;
        const imgAR = imgWidth / imgHeight;
        const canvasAR = targetWidth / targetHeight;

        let sx = 0, sy = 0, sWidth = imgWidth, sHeight = imgHeight;
        let dx = 0, dy = 0, dWidth = targetWidth, dHeight = targetHeight;

        if (resizeMode === 'crop') {
            if (imgAR > canvasAR) { // Image is wider than canvas aspect ratio (need to crop sides)
                sHeight = imgHeight;
                sWidth = sHeight * canvasAR;
                sx = (imgWidth - sWidth) / 2;
            } else if (imgAR < canvasAR) { // Image is taller than canvas aspect ratio (need to crop top/bottom)
                sWidth = imgWidth;
                sHeight = sWidth / canvasAR;
                sy = (imgHeight - sHeight) / 2;
            }
            // If aspect ratios are the same, no cropping needed from source, s variables remain full image
        } else { // 'fit' mode (letterbox/pillarbox)
            ctx.fillStyle = backgroundColorInput.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (imgAR > canvasAR) { // Image wider, fit by width
                dHeight = targetWidth / imgAR;
                dy = (targetHeight - dHeight) / 2;
            } else { // Image taller or same AR, fit by height
                dWidth = targetHeight * imgAR;
                dx = (targetWidth - dWidth) / 2;
            }
        }

        try {
            ctx.drawImage(originalImage, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
            outputDimensionsText.textContent = `Output: ${targetWidth}px × ${targetHeight}px`;
        } catch (e) {
            console.error("Error drawing image:", e);
            outputDimensionsText.textContent = "Error processing image.";
        }
    }

    function downloadImage() {
        if (!originalImage || canvas.width === 0 || canvas.height === 0) {
            alert("No image processed to download or dimensions are zero.");
            return;
        }
        const format = outputFormatSelect.value;
        const quality = parseFloat(imageQualitySlider.value);
        const dataURL = canvas.toDataURL(format, format === 'image/png' ? undefined : quality);

        const link = document.createElement('a');
        const fileExtension = format.split('/')[1];
        link.download = `${originalFileName}_resized.${fileExtension}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function resetTool() {
        originalImage = null;
        imageUpload.value = ''; // Clear file input
        outputWidthInput.value = '';
        outputWidthCustomInput.value = '';
        outputHeightCustomInput.value = '';
        aspectRatioSelect.value = 'original';
        customDimensionsDiv.classList.add('hidden');
        targetWidthGroup.classList.remove('hidden');
        resizeModeSelect.value = 'crop';
        backgroundColorGroup.classList.add('hidden');
        backgroundColorInput.value = '#FFFFFF';
        imageQualitySlider.value = 0.9;
        qualityValueSpan.textContent = '0.90';
        outputFormatSelect.value = 'image/jpeg';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 300; canvas.height = 150; // Reset canvas to a default size
        ctx.fillText("Upload an image to start.", 10, 50);
        outputDimensionsText.textContent = '';
        imageNameP.textContent = '';
        downloadButton.disabled = true;
    }

    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Initial setup
    resetTool(); // Call reset to set initial placeholder text on canvas
    ctx.font = "16px Arial";
    ctx.fillStyle = "#555";
    ctx.fillText("Upload an image to start.", 10, 50);
    handleAspectRatioChange(); // Ensure correct UI for custom dimensions
    if (resizeModeSelect.value === 'fit') { // Ensure correct UI for background color
        backgroundColorGroup.classList.remove('hidden');
    } else {
        backgroundColorGroup.classList.add('hidden');
    }
});
