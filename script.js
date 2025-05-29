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

    const setCanvasMessage = (message) => {
        const C_WIDTH = 300;
        const C_HEIGHT = 150;
        if (canvas.width !== C_WIDTH) canvas.width = C_WIDTH;
        if (canvas.height !== C_HEIGHT) canvas.height = C_HEIGHT;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = "16px Arial";
        ctx.fillStyle = "#555";
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        ctx.textAlign = "left"; // Reset alignment
    };

    // Update quality value display
    imageQualitySlider.addEventListener('input', () => {
        qualityValueSpan.textContent = parseFloat(imageQualitySlider.value).toFixed(2);
        if (originalImage) processImage();
    });

    // Event listeners for controls
    imageUpload.addEventListener('change', handleImageUpload);
    aspectRatioSelect.addEventListener('change', handleAspectRatioChange);

    [outputWidthInput, outputWidthCustomInput, outputHeightCustomInput, outputFormatSelect, resizeModeSelect, backgroundColorInput].forEach(el => {
        const eventType = (el.type === 'number' || el.type === 'text') ? 'input' : 'change';
        el.addEventListener(eventType, () => {
            if (originalImage) processImage();
        });
    });


    downloadButton.addEventListener('click', downloadImage);

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            originalFileName = file.name.split('.')[0] || 'resized_image';
            imageNameP.textContent = `Source: ${file.name}`;
            console.log("Image selected:", file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                originalImage = new Image();
                originalImage.onload = () => {
                    console.log("Original image loaded:", originalImage.naturalWidth, "x", originalImage.naturalHeight);
                    if (aspectRatioSelect.value === 'original' || !outputWidthInput.value) {
                        outputWidthInput.value = originalImage.naturalWidth > 1280 ? 1280 : originalImage.naturalWidth;
                    }
                    processImage();
                    downloadButton.disabled = false;
                };
                originalImage.onerror = () => {
                    console.error("Error loading image object. Please try a different file.");
                    alert("Error loading image. The file might be corrupted or an unsupported format.");
                    resetTool();
                }
                originalImage.src = e.target.result;
            };
            reader.onerror = () => {
                console.error("FileReader error.");
                alert("Error reading file. Please try again.");
                resetTool();
            };
            reader.readAsDataURL(file);
        }
    }

    function handleAspectRatioChange() {
        const isCustom = aspectRatioSelect.value === 'custom';
        customDimensionsDiv.classList.toggle('hidden', !isCustom);
        targetWidthGroup.classList.toggle('hidden', isCustom);

        if (originalImage) {
            processImage();
        }
    }

    resizeModeSelect.addEventListener('change', () => {
        backgroundColorGroup.classList.toggle('hidden', resizeModeSelect.value !== 'fit');
        if (originalImage) processImage();
    });


    function processImage() {
        if (!originalImage) {
            console.log("processImage called, but no originalImage.");
            setCanvasMessage("Upload an image to start.");
            return;
        }
        console.log("Processing image...");

        let targetWidth, targetHeight;
        const selectedAspectRatio = aspectRatioSelect.value;
        const resizeMode = resizeModeSelect.value;

        const imgWidth = originalImage.naturalWidth;
        const imgHeight = originalImage.naturalHeight;

        if (imgWidth === 0 || imgHeight === 0) {
            outputDimensionsText.textContent = "Image has invalid dimensions (0).";
            setCanvasMessage("Invalid image dimensions.");
            console.warn("Image has zero dimensions.");
            return;
        }

        if (selectedAspectRatio === 'custom') {
            targetWidth = parseInt(outputWidthCustomInput.value);
            targetHeight = parseInt(outputHeightCustomInput.value);
            if (isNaN(targetWidth) || targetWidth <= 0 || isNaN(targetHeight) || targetHeight <= 0) {
                outputDimensionsText.textContent = "Enter valid custom dimensions.";
                setCanvasMessage("Enter custom width & height.");
                console.log("Custom dimensions invalid or not set.");
                return;
            }
        } else {
            targetWidth = parseInt(outputWidthInput.value);
            if (isNaN(targetWidth) || targetWidth <= 0) {
                outputDimensionsText.textContent = "Enter a valid target width.";
                setCanvasMessage("Enter target width.");
                console.log("Target width invalid or not set.");
                return;
            }

            if (selectedAspectRatio === 'original') {
                if (imgWidth === 0) { // Should be caught by earlier check
                    outputDimensionsText.textContent = "Image has zero width.";
                    setCanvasMessage("Image has zero width.");
                    return;
                }
                targetHeight = Math.round(targetWidth * (imgHeight / imgWidth));
            } else {
                const [arW, arH] = selectedAspectRatio.split(':').map(Number);
                if (arW === 0) {
                     outputDimensionsText.textContent = "Aspect ratio error.";
                     setCanvasMessage("Aspect ratio error.");
                     console.warn("Aspect ratio width component is zero.");
                     return;
                }
                targetHeight = Math.round(targetWidth * (arH / arW));
            }
        }
        
        if (targetHeight <= 0) {
            outputDimensionsText.textContent = "Calculated height is invalid.";
            setCanvasMessage("Calculated height invalid.");
            console.warn("Calculated targetHeight is zero or negative.");
            return;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const imgAR = imgWidth / imgHeight;
        const canvasAR = targetWidth / targetHeight;

        let sx = 0, sy = 0, sWidth = imgWidth, sHeight = imgHeight;
        let dx = 0, dy = 0, dWidth = targetWidth, dHeight = targetHeight;

        if (resizeMode === 'crop') {
            console.log("Resize mode: Crop");
            if (imgAR > canvasAR) {
                sHeight = imgHeight;
                sWidth = sHeight * canvasAR;
                sx = (imgWidth - sWidth) / 2;
            } else if (imgAR < canvasAR) {
                sWidth = imgWidth;
                sHeight = sWidth / canvasAR;
                sy = (imgHeight - sHeight) / 2;
            }
        } else { // 'fit' mode (letterbox/pillarbox)
            console.log("Resize mode: Fit");
            ctx.fillStyle = backgroundColorInput.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (imgAR > canvasAR) { // Image wider, fit by width
                dHeight = targetWidth / imgAR;
                dy = (targetHeight - dHeight) / 2;
                // dWidth remains targetWidth, dx remains 0
            } else { // Image taller or same AR, fit by height
                dWidth = targetHeight * imgAR;
                dx = (targetWidth - dWidth) / 2;
                // dHeight remains targetHeight, dy remains 0
            }
        }
        
        console.log(`Drawing: sx:${sx}, sy:${sy}, sW:${sWidth}, sH:${sHeight} -> dx:${dx}, dy:${dy}, dW:${dWidth}, dH:${dHeight}`);
        try {
            ctx.drawImage(originalImage, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
            outputDimensionsText.textContent = `Output: ${targetWidth}px × ${targetHeight}px`;
            console.log("Image drawn successfully to canvas.");
        } catch (e) {
            console.error("Error drawing image to canvas:", e);
            outputDimensionsText.textContent = "Error processing image.";
            setCanvasMessage("Error drawing image.");
        }
    }

    function downloadImage() {
        if (!originalImage || canvas.width <= 0 || canvas.height <= 0) {
            alert("No image processed to download, or dimensions are invalid.");
            return;
        }
        const format = outputFormatSelect.value;
        const quality = parseFloat(imageQualitySlider.value);
        let dataURL;
        try {
            dataURL = canvas.toDataURL(format, format.startsWith('image/png') ? undefined : quality);
        } catch (e) {
            console.error("Error converting canvas to DataURL:", e);
            alert(`Error creating image file. The canvas dimensions might be too large or an issue occurred with the format ${format}.`);
            return;
        }


        const link = document.createElement('a');
        const fileExtension = format.split('/')[1] || 'bin';
        link.download = `${originalFileName}_resized.${fileExtension}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Image download initiated.");
    }

    function resetTool() {
        console.log("Resetting tool.");
        originalImage = null;
        if(imageUpload.value) imageUpload.value = '';
        outputWidthInput.value = '1280'; // Sensible default
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
        
        setCanvasMessage("Upload an image to start.");
        outputDimensionsText.textContent = '';
        imageNameP.textContent = '';
        downloadButton.disabled = true;

        // Initial UI state based on selections
        handleAspectRatioChange(); 
        backgroundColorGroup.classList.toggle('hidden', resizeModeSelect.value !== 'fit');
    }

    // Set current year in footer
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    resetTool();
});
