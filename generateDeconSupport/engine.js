/*

engine.js: Generate support for deconvolution.
================================================================================
This script implements my workflow for deconvolution. It will create:

   1. An extracted luminance view for PSF generation
   2. A stretched luminance mask to support generation of other masks
   3. An advanced star mask using StarNet++
   4. A saturation mask to hide oversaturated stars from PSF generation
   5. A deconvolution support mask in case global de-ringing falls short

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

let deconEngine = (function (ds) {
    return {
        doExtractLuminance: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            this.engine.showStep("Extracting luminance....");
            if (executionState.config.prefs.extractLum === false && executionState.masks.lum) {
                utils.writeLines(utils.concatenateStr("Using existing luminance channel: ",
                    executionState.masks.lum.id));
                return;
            }
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

            if (executionState.masks.lumMask) {
                utils.writeLines(utils.concatenateStr("Using existing luminance mask: ",
                    executionState.masks.lumMask.id));
                return;
            }

            utils.writeLines('Generating luminance mask...');
            let dupId = ds.engine.pixMathClone(executionState.masks.lum, '_Mask');
            let lumMask = ImageWindow.windowById(dupId).mainView;
            ds.engine.applySTF(lumMask);
            ds.engine.applyHistogramTransformation(lumMask);
            executionState.masks.lumMask = lumMask;
        },

        blurStars: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            if (executionState.config.prefs.blurStars === true) {
                utils.writeLines('Applying convolution...');
                const c = new Convolution;
                c.mode = Convolution.prototype.Parametric;
                c.sigma = 2.40;
                c.shape = 1.45;
                c.aspectRatio = 1.00;
                c.rotationAngle = 0.00;
                c.filterSource = "";
                c.rescaleHighPass = false;
                c.viewId = "";
                c.executeOn(executionState.masks.starMask);
            }
        },

        growStars: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            if (executionState.config.prefs.growIterations > 0) {
                utils.writeLines('Applying morphological transformation...');
                const mt = new MorphologicalTransformation;
                mt.operator = MorphologicalTransformation.prototype.Dilation;
                mt.interlacingDistance = 1;
                mt.lowThreshold = 0.000000;
                mt.highThreshold = 0.000000;
                mt.numberOfIterations = executionState.config.prefs.growIterations;
                mt.amount = 1.00;
                mt.selectionPoint = 0.50;
                mt.structureName = "";
                mt.structureSize = 3;
                mt.structureWayTable = [ // mask
                    [[
                        0x01, 0x01, 0x01,
                        0x01, 0x01, 0x01,
                        0x01, 0x01, 0x01
                    ]]
                ];
                mt.executeOn(executionState.masks.starMask);
            }
        },

        generateStarMask: function () {

            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            this.engine.showStep("Generating the star mask...");

            let noStarsId = ds.engine.pixMathClone(executionState.masks.lumMask, '_NoStars');
            let noStarsMask = ImageWindow.windowById(noStarsId).mainView;

            utils.writeLines('Generating star mask...');

            const sn = new StarNet;
            sn.stride = StarNet.prototype.Stride_128;
            sn.mask = true;

            sn.executeOn(noStarsMask);

            let starmask = ImageWindow.activeWindow.mainView;
            executionState.masks.noStarsMask = noStarsMask;
            executionState.masks.starMask = starmask;

            this.engine.growStars();
            this.engine.blurStars();
        },

        generateSaturationMask: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            if (executionState.config.prefs.generateSaturationMask === true) {
                this.engine.showStep("Generating saturation mask...");

                // binarized
                let saturationId = ds.engine.pixMathClone(executionState.masks.lumMask, '_Saturated');
                let saturationMask = ImageWindow.windowById(saturationId).mainView;
                utils.writeLines('Generating binarized mask for saturated stars...');
                const b = new Binarize;
                b.thresholdRK = executionState.config.prefs.saturationLimit;
                b.thresholdG = executionState.config.prefs.saturationLimit;
                b.thresholdB = executionState.config.prefs.saturationLimit;
                b.isGlobal = true;
                b.executeOn(saturationMask);
                executionState.masks.saturationMask = saturationMask;
            }
        },

        generateDeconSupport: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            if (executionState.config.prefs.generateDeconSupport === true) {
                this.engine.showStep("Generating decon support mask....");
                utils.writeLines('Generating deconvolution support mask...');
                const sm = new StarMask;
                sm.shadowsClipping = 0.00000;
                sm.midtonesBalance = 0.50000;
                sm.highlightsClipping = 1.00000;
                sm.waveletLayers = 6;
                sm.structureContours = false;
                sm.noiseThreshold = 0.50000;
                sm.aggregateStructures = false;
                sm.binarizeStructures = false;
                sm.largeScaleGrowth = 2;
                sm.smallScaleGrowth = 1;
                sm.growthCompensation = 2;
                sm.smoothness = 16;
                sm.invert = false;
                sm.truncation = 1.00000;
                sm.limit = 1.00000;
                sm.mode = StarMask.prototype.StarMask;
                sm.executeOn(executionState.view);
                let deconSupportMask = ImageWindow.activeWindow.mainView;
                deconSupportMask.id = utils.getNewName(executionState.view.id, '_Decon');
                executionState.masks.deconSupportMask = deconSupportMask;
            }
        },

        makeDeconProcess: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            if (executionState.config.prefs.launchDeconProcess !== true) {
                return;
            }
            this.engine.showStep("Configuring Deconvolution process instance....");
            utils.writeLines("Launching decon process with defaults...");
            let supportId = executionState.masks.deconSupportMask ?
                executionState.masks.deconSupportMask.id : "";
            const P = new Deconvolution;
            P.algorithm = Deconvolution.prototype.RichardsonLucy;
            P.numberOfIterations = 25;
            P.deringing = true;
            P.deringingDark = 0.0020;
            P.deringingBright = 0.0000;
            P.deringingSupport = true;
            P.deringingSupportAmount = 0.20;
            P.deringingSupportViewId = supportId;
            P.toLuminance = true;
            P.psfMode = Deconvolution.prototype.External;
            P.psfSigma = 2.00;
            P.psfShape = 2.00;
            P.psfAspectRatio = 1.00;
            P.psfRotationAngle = 0.00;
            P.psfMotionLength = 5.00;
            P.psfMotionRotationAngle = 0.00;
            P.psfViewId = "";
            P.psfFFTSizeLimit = 15;
            P.useRegularization = false;
            P.waveletLayers = [ // noiseThreshold, noiseReduction
                [3.00, 1.00],
                [2.00, 0.70],
                [1.00, 0.70],
                [1.00, 0.70],
                [1.00, 0.70]
            ];
            P.noiseModel = Deconvolution.prototype.Gaussian;
            P.numberOfWaveletLayers = 2;
            P.scalingFunction = Deconvolution.prototype.B3Spline5x5;
            P.convergence = 0.0000;
            P.rangeLow = 0.0000000;
            P.rangeHigh = 0.0000000;
            P.iterations = [ // count
                [0],
                [0],
                [0]
            ];

            P.launch();
        },

        launchDynamicPSFProcess: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            if (executionState.config.prefs.launchDynamicPSF === true && executionState.masks.saturationMask) {
                this.engine.showStep("Launching dynamic PSF...");
                let lum = executionState.masks.lum;
                lum.window.mask = executionState.masks.saturationMask.window;
                lum.window.maskEnabled = true;
                lum.window.maskInverted = true;
                lum.window.maskVisible = true;
                const P = new DynamicPSF;
                P.views = [ // id
                ];
                P.stars = [ // viewIndex, channel, status, x0, y0, x1, y1, x, y
                ];
                P.psf = [ // starIndex, function, circular, status, B, A, cx, cy, sx, sy, theta, beta, mad, celestial, alpha, delta, flux, meanSignal
                ];
                P.autoPSF = true;
                P.circularPSF = false;
                P.gaussianPSF = true;
                P.moffatPSF = false;
                P.moffat10PSF = false;
                P.moffat8PSF = false;
                P.moffat6PSF = false;
                P.moffat4PSF = false;
                P.moffat25PSF = false;
                P.moffat15PSF = false;
                P.lorentzianPSF = false;
                P.variableShapePSF = false;
                P.autoVariableShapePSF = false;
                P.betaMin = 1.00;
                P.betaMax = 4.00;
                P.signedAngles = true;
                P.regenerate = true;
                P.astrometry = true;
                P.searchRadius = 8;
                P.threshold = 1.00;
                P.autoAperture = true;
                P.scaleMode = DynamicPSF.prototype.Scale_Pixels;
                P.scaleValue = 1.00;
                P.scaleKeyword = "";
                P.starColor = 4292927712;
                P.selectedStarColor = 4278255360;
                P.selectedStarFillColor = 0;
                P.badStarColor = 4294901760;
                P.badStarFillColor = 2164195328;
                P.launchInterface();
                lum.window.bringToFront();
                ds.engine.applySTF(lum);
                lum.window.zoomToFit();
            }
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

        doDecon: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            executionState.updateProgress = executionState.updateProgress ||
                function () { };

            executionState.step = 0;
            executionState.steps = 7;
            if (executionState.config.prefs.generateSaturationMask === false) {
                executionState.steps -= 2;
            }
            else {
                if (executionState.config.prefs.launchDynamicPSF === false) {
                    executionState.steps--;
                }
            }

            if (executionState.config.prefs.generateDeconSupport === false) {
                executionState.steps--;
            }

            if (executionState.config.prefs.launchDeconProcess === false) {
                executionState.steps--;
            }

            this.engine.doExtractLuminance();
            this.engine.generateLumMask();
            this.engine.generateStarMask();
            this.engine.generateSaturationMask();
            this.engine.generateDeconSupport();
            this.engine.makeDeconProcess();
            this.engine.launchDynamicPSFProcess();

            for (let mask in executionState.masks) {
                utils.writeLines(utils.concatenateStr('Generated mask ', mask, ': ',
                    executionState.masks[mask].id));
            }

            utils.writeLines('Done.');
        },

        validate: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            const dialog = ds.getDialog();
            let prefs = executionState.config.prefs;
            if (prefs.extractLum === true) {
                delete executionState.masks.lum;
            }
            else if (!(executionState.masks.lum && executionState.masks.lum.id)) {
                ds.ui.showDialog("Validation failed", "Luminance channel is required");
                executionState.config.closeOnExit = true;
                return false;
            }
            if (prefs.generateLumMask === true) {
                delete executionState.masks.lumMask;
            }
            else if (!(executionState.masks.lumMask && executionState.masks.lumMask.id)) {
                ds.ui.showDialog("Validation failed", "Luminance mask is required");
                executionState.config.closeOnExit = true;
                return false;
            }
            return true;
        }
    };
})(deepSky);
