/*

engine.js: Denoise functionality.
================================================================================
This script implements my workflow for denoising linear (before stretching) images:

   1. Create a luminance mask
   2. Adjust with a curves transformation
   3. Apply multiscale linear transformation to luminance
   4. Apply multiscale linear transformation to chrominance

================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

let denoiseEngine = (function (ds) {
    return {
        doExtractLuminance: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            this.engine.showStep("Extracting luminance....");
            utils.writeLines('Extracting luminance...');
            ds.engine.extractLuminance('_Lum');
            var lum = ImageWindow.windowById(executionState.channels[0][1]).mainView;
            console.writeln(utils.concatenateStr('Luminance extracted as ', lum.id));
            executionState.masks.lum = lum;
        },

        generateLumMask: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            this.engine.showStep("Creating luminance mask....");
            utils.writeLines('Generating luminance mask...');

            let dupId = ds.engine.pixMathClone(executionState.masks.lum, '_Mask');
            let lumMask = ImageWindow.windowById(dupId).mainView;
            executionState.masks.lum.window.forceClose();
            delete executionState.masks.lum;
            ds.engine.applySTF(lumMask);
            ds.engine.applyHistogramTransformation(lumMask);
            executionState.masks.lumMask = lumMask;
        },

        applyCurves: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            this.engine.showStep("Applying curves transformation...");
            utils.writeLines("Applying curves transformation...");
            var strength = ((executionState.config.prefs.maskStrength * 0.4) / 10.0) + 0.05;
            var upper = 1.0 - strength;
            var curves = new CurvesTransformation;
            curves.K = [ // x, y
                [0.00000, strength],
                [1.00000, upper]
            ];
            curves.Kt = CurvesTransformation.prototype.AkimaSubsplines;
            curves.executeOn(executionState.masks.lumMask);
        },

        getDenoiseProcess: function (isLum, maxThreshold, numLayers, maxAmount) {
            const mlt = new MultiscaleLinearTransform;
            let t = maxThreshold, tStep = maxThreshold / numLayers;
            let a = maxAmount, aStep = maxAmount / numLayers;
            let i = numLayers;
            const layers = [];
            for (let idx = 0; idx < 8; idx++) {
                // enabled, biasEnabled, bias, noiseReductionEnabled, noiseReductionThreshold, noiseReductionAmount, noiseReductionIterations
                const denoise = [true, true, 0.000, i > 0, t > 0 ? t : 1, a > 0 ? a : 0.001, i > 0 ? i : 1];

                layers.push(denoise);

                if (t > 0) {
                    t -= tStep;
                }
                if (a > 0) {
                    a -= aStep;
                }
                if (i > 0) {
                    i--;
                }
            }
            mlt.layers = layers;
            mlt.transform = MultiscaleLinearTransform.prototype.StarletTransform;
            mlt.scaleDelta = 0;
            mlt.scalingFunctionData = [
                0.25, 0.5, 0.25,
                0.5, 1, 0.5,
                0.25, 0.5, 0.25
            ];
            mlt.scalingFunctionRowFilter = [
                0.5,
                1,
                0.5
            ];
            mlt.scalingFunctionColFilter = [
                0.5,
                1,
                0.5
            ];
            mlt.scalingFunctionNoiseSigma = [
                0.8003, 0.2729, 0.1198,
                0.0578, 0.0287, 0.0143,
                0.0072, 0.0036, 0.0019,
                0.001
            ];
            mlt.scalingFunctionName = "Linear Interpolation (3)";
            mlt.largeScaleFunction = MultiscaleLinearTransform.prototype.NoFunction;
            mlt.curveBreakPoint = 0.75;
            mlt.previewMode = MultiscaleLinearTransform.prototype.Disabled;
            mlt.previewLayer = 0;
            mlt.toLuminance = isLum;
            mlt.toChrominance = !isLum;
            mlt.linear = true;

            return mlt;
        },

        applyLum: function () {
            const executionState = ds.getExecutionState();

            if (executionState.config.prefs.applyToLuminance === false) {
                return;
            }

            this.engine.showStep("Applying denoise to luminance....");
            ds.utilities.writeLines("Applying denoise to luminance....");

            const mlt = this.engine.getDenoiseProcess(
                true,
                executionState.config.prefs.lumMaxThreshold,
                executionState.config.prefs.lumNumLayers,
                executionState.config.prefs.lumMaxAmount);

            mlt.executeOn(executionState.view);
        },

        applyChrome: function () {
            const executionState = ds.getExecutionState();

            if (executionState.config.prefs.applyToChrominance === false) {
                return;
            }

            this.engine.showStep("Applying denoise to chrominance....");
            ds.utilities.writeLines("Applying denoise to chrominance....");

            const mlt = this.engine.getDenoiseProcess(
                false,
                executionState.config.prefs.chromMaxThreshold,
                executionState.config.prefs.chromNumLayers,
                executionState.config.prefs.chromMaxAmount);

            mlt.executeOn(executionState.view);
        },

        showStep: function (message) {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            executionState.step++;
            executionState.updateProgress(
                utils.concatenateStr('Step ', executionState.step,
                    ' of ', executionState.steps,
                    ': ', message));
        },

        doDenoise: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            executionState.updateProgress = executionState.updateProgress ||
                function () { };

            executionState.step = 0;
            executionState.steps = 5;

            if (executionState.config.prefs.applyToLuminance === false) {
                executionState.steps--;
            }

            if (executionState.config.prefs.applyToChrominance === false) {
                executionState.steps--;
            }

            this.engine.doExtractLuminance();
            this.engine.generateLumMask();
            this.engine.applyCurves();

            executionState.view.window.mask = executionState.masks.lumMask.window;
            executionState.view.window.maskEnabled = true;
            executionState.view.window.maskInverted = true;
            executionState.view.window.maskVisible = true;
            
            if (executionState.config.prefs.applyLuminanceFirst === true) {
                this.engine.applyLum();
                this.engine.applyChrome();
            }
            else {
                this.engine.applyChrome();
                this.engine.applyLum();
            }

            executionState.masks.lumMask.window.forceClose();
            delete executionState.masks.lumMask;

            utils.writeLines('Done.');
        },

        validate: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            const dialog = ds.getDialog();
            if (executionState.view === null || executionState.view === undefined) {
                ds.ui.showDialog("Validation failed", "No active view!");
                executionState.config.closeOnExit = true;
                return false;
            }
            if (executionState.view.image.numberOfChannels !== 3) {
                ds.ui.showDialog("Validation failed", "Active view is not color.");
                executionState.config.closeOnExit = true;
                return false;
            }
            return true;
        }
    };
})(deepSky);
