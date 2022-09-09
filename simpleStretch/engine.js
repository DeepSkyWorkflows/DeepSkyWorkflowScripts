/*

engine.js: Scriptable stretch with simple parameters.
================================================================================
This script stretches based on a target background and level of clipping
for shadows.
================================================================================
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

#script-id SimpleStretchEngine

let stretchEngine = (function (ds) {
    return {
        doSimpleStretch: function () {

            const executionState = ds.getExecutionState();
            const utils = ds.utilities;

            executionState.updateProgress = 
                executionState.updateProgress || function (_) {};

            const showStatus = status => {
                executionState.updateProgress(status);
                utils.writeLines(status);
            };
            
            let view = executionState.view;

            let transformation = [
                [0, 1, 0.5, 0, 1],
                [0, 1, 0.5, 0, 1],
                [0, 1, 0.5, 0, 1],
                [0, 1, 0.5, 0, 1]];
    
            let median = view.computeOrFetchProperty("Median");
            let mad = view.computeOrFetchProperty("MAD");
    
            //set variables
            let targetBackground = executionState.config.prefs.targetBackground;
            let shadowsClipping = executionState.config.prefs.shadowsClipping;
    
            // calculate STF settings based on DeLinear Script
            let clipping = (1 + mad.at(0) != 1) ?
               Math.range(median.at(0) + shadowsClipping * mad.at(0), 0.0, 1.0) : 0.0;
            let targetMedian = Math.mtf(targetBackground, median.at(0) - clipping);
    
            transformation[0] = [clipping, 1, targetMedian, 0, 1];
             
            if (!view.image.isGrayscale) {
                transformation[1] = [clipping, 1, targetMedian, 0, 1];
                transformation[2] = [clipping, 1, targetMedian, 0, 1];
            }

            let STFunction = new ScreenTransferFunction();
            STFunction.STF = transformation;

            showStatus("Applying stretch...");
            
            STFunction.executeOn(view);
    
            var HT = new HistogramTransformation;
    
            if (view.image.isGrayscale) {
                //get values from STF
                var clipping = view.stf[0][1];
                var median = view.stf[0][0];
                HT.H = [[0, 0.5, 1.0, 0, 1.0],
                [0, 0.5, 1.0, 0, 1.0],
                [0, 0.5, 1.0, 0, 1.0],
                [clipping, median, 1.0, 0, 1.0],
                [0, 0.5, 1.0, 0, 1.0]];
            } else {
                HT.H = [[view.stf[0][1], view.stf[0][0], 1.0, 0, 1.0],
                [view.stf[1][1], view.stf[1][0], 1.0, 0, 1.0],
                [view.stf[2][1], view.stf[2][0], 1.0, 0, 1.0],
                [0, 0.5, 1.0, 0, 1.0],
                [0, 0.5, 1.0, 0, 1.0]];
            }
    
            showStatus("Applying histogram transformation...");
            
            HT.executeOn(view.image);    

            showStatus("Simple stretch is done.");
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
            return true;
        }
    };
})(deepSky);
