/*

    engine.js: Star trails functionality.
 *
 *
 * Copyright Jeremy Likness, 2022
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#script-id StarTrailsEngine

let starTrailsEngine = (function (ds) {
    return {

        doIteration: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            var P = new ImageIntegration;
            var images = [];
            for (var i  = 0; i < executionState.batch.length; i++) {
                images.push([true, executionState.batch[i], "", ""]);
            }

            P.images = images;
            P.inputHints = "fits-keywords normalize raw cfa signed-is-physical";
            P.combination = ImageIntegration.prototype.Maximum;
            P.weightMode = ImageIntegration.prototype.PSFSignalWeight;
            P.weightKeyword = "";
            P.weightScale = ImageIntegration.prototype.WeightScale_BWMV;
            P.minWeight = 0.005000;
            P.csvWeights = "";
            P.adaptiveGridSize = 16;
            P.adaptiveNoScale = false;
            P.ignoreNoiseKeywords = false;
            P.normalization = ImageIntegration.prototype.NoNormalization;
            P.rejection = ImageIntegration.prototype.NoRejection;
            P.rejectionNormalization = ImageIntegration.prototype.Scale;
            P.minMaxLow = 1;
            P.minMaxHigh = 1;
            P.pcClipLow = 0.200;
            P.pcClipHigh = 0.100;
            P.sigmaLow = 4.000;
            P.sigmaHigh = 3.000;
            P.winsorizationCutoff = 5.000;
            P.linearFitLow = 5.000;
            P.linearFitHigh = 4.000;
            P.esdOutliersFraction = 0.30;
            P.esdAlpha = 0.05;
            P.esdLowRelaxation = 1.00;
            P.rcrLimit = 0.10;
            P.ccdGain = 1.00;
            P.ccdReadNoise = 10.00;
            P.ccdScaleNoise = 0.00;
            P.clipLow = true;
            P.clipHigh = true;
            P.rangeClipLow = true;
            P.rangeLow = 0.000000;
            P.rangeClipHigh = false;
            P.rangeHigh = 0.980000;
            P.mapRangeRejection = true;
            P.reportRangeRejection = false;
            P.largeScaleClipLow = false;
            P.largeScaleClipLowProtectedLayers = 2;
            P.largeScaleClipLowGrowth = 2;
            P.largeScaleClipHigh = false;
            P.largeScaleClipHighProtectedLayers = 2;
            P.largeScaleClipHighGrowth = 2;
            P.generate64BitResult = false;
            P.generateRejectionMaps = true;
            P.generateIntegratedImage = true;
            P.generateDrizzleData = false;
            P.closePreviousImages = false;
            P.bufferSizeMB = 16;
            P.stackSizeMB = 1024;
            P.autoMemorySize = true;
            P.autoMemoryLimit = 0.75;
            P.useROI = false;
            P.roiX0 = 0;
            P.roiY0 = 0;
            P.roiX1 = 0;
            P.roiY1 = 0;
            P.useCache = true;
            P.evaluateSNR = false;
            P.noiseEvaluationAlgorithm = ImageIntegration.prototype.NoiseEvaluation_MRS;
            P.mrsMinDataFraction = 0.010;
            P.psfStructureLayers = 5;
            P.psfType = ImageIntegration.prototype.PSFType_Moffat4;
            P.subtractPedestals = false;
            P.truncateOnOutOfRange = false;
            P.noGUIMessages = true;
            P.showImages = executionState.outputDirectory === "";
            P.useFileThreads = true;
            P.fileThreadOverload = 1.00;
            P.useBufferThreads = true;
            P.maxBufferThreads = 0;
            P.executeGlobal();
            if (P.lowRejectionMapImageId && P.lowRejectionMapImageId.length > 1) {
                ImageWindow.windowById(P.lowRejectionMapImageId).forceClose();
            }
            if (P.highRejectionMapImageId && P.highRejectionMapImageId.length > 1) {
                ImageWindow.windowById(P.highRejectionMapImageId).forceClose();
            }
            var seq = executionState.outputSeq++;
            var str = "000000" + seq;
            var seqStr = str.substring(str.length - 6);
            if (executionState.outputDirectory !== "") {
                var target = ImageWindow.windowById(P.integrationImageId);
                var name = File.extractName(executionState.batch[0]) +"_"+seqStr;
                var outputPath = "";
                if ( executionState.outputDirectory.length > 0 ) {
                    outputPath = executionState.outputDirectory + name + ".jpg";
                }
                else {
                    var drive = File.extractDrive( executionState.targetImages[i] );
                    var dir = File.extractDirectory( executionState.targetImages[i] );
                    if ( dir.length > 0 && dir[dir.length-1] != '/' ) {
                        dir += '/';
                    }
                    outputPath = drive + dir + name + ".jpg";
                }
                if ( !target.saveAs( outputPath, false, false, false, false ) ) {
                    throw Error( TITLE + ": Error writing output image:\n" + outputPath );
                }   
                target.forceClose();
            }         
        },

        doProgressive: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            const stepSize = executionState.config.prefs.stepSize;
            var total = executionState.targetImages.length;
            var count = 1;
            for (var idx = 2; idx < total; idx += stepSize) {
                var progress = idx * 100 / total;
                executionState.updateProgress("Progressive: " + count++ + " frames (" +
                    progress + "% complete)");
                executionState.batch = executionState.targetImages.slice(0, idx+1);
                this.engine.doIteration();                
            }
        },

        doArcs: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            const arcSize = executionState.config.prefs.arcSize;
            const stepSize = executionState.config.prefs.stepSize;
            var total = executionState.targetImages.length;
            var count = 1;
            for (var idx = 0; idx < total; idx += stepSize) {
                var progress = idx * 100 / total;
                executionState.updateProgress("Arcs: " + count++ + " frames (" +
                    progress + "% complete)");
                var start = idx;
                var end = idx + arcSize + 1;
                if (end > total) {
                    end = total;
                }
                if (end - start < 3) {
                    start = end - 3;
                }
                executionState.batch = executionState.targetImages.slice(start, end);
                this.engine.doIteration();                
            }
        },
        
        doSingleTrail: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            executionState.updateProgress("Single star trail image.");
            executionState.batch = executionState.targetImages;
            this.engine.doIteration();            
        },        
       
        doStarTrails: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            executionState.outputDirectory = executionState.outputDirectory || "";

            if (executionState.outputDirectory === "") {
                utils.writeLines("Interactive mode.");
            } else {
                utils.writeLines("Output directory: " + executionState.outputDirectory);
            }
            executionState.updateProgress = executionState.updateProgress ||
                function () { alert('oops'); };

            executionState.outputSeq = 1;

        if ( executionState.outputDirectory.length > 0 &&
                executionState.outputDirectory[executionState.outputDirectory.length-1] != '/' ) {
                    executionState.outputDirectory += '/';
                }

            if (executionState.config.prefs.progressive === true) {
                this.engine.doProgressive();
            }
            else if (executionState.config.prefs.arcs === true) {
                this.engine.doArcs();
            }
            else {
                this.engine.doSingleTrail();
            }

            utils.writeLines('Done.');
        },

        validate: function () {
            const executionState = ds.getExecutionState();
            const utils = ds.utilities;
            const dialog = ds.getDialog();
            dialog.parseFiles();
            if (executionState.targetImages === null || executionState.targetImages.length < 3) {
                ds.ui.showDialog("Validation failed", "Must have at least three images!");
                executionState.config.closeOnExit = true;
                return false;
            }
            return true;
        }
    };
})(deepSky);
