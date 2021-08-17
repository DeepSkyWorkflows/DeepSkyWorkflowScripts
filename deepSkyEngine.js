/*

deepSkyEngine.js: Common engine functions.
================================================================================

Engine functions.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 * mailTo:deepskyworkflows@gmail.com
 *
 */

#include "deepSkyInit.js"

#ifndef DEBUG_ENGINE
#define DEBUG_ENGINE false
#endif

(function (ds) {

   ds.debug.register('engine', DEBUG_ENGINE);
   ds.debug.engine.debugLn('Engine debugging is on.');

   if (ds.engine) {
      return;
   }

   ds.engine = {

      // extract luminance from image
      extractLuminance: function (suffix) {

         const executionState = ds.getExecutionState();

         let sourceViewId = executionState.view.id;

         suffix = suffix || '_L';         

         executionState.channels = [
            [true, ds.utilities.getNewName(sourceViewId, suffix)],
            [false, ''],
            [false, '']
         ];

         // separate the RGB components
         let ce = new ChannelExtraction;
         ce.colorSpace = ChannelExtraction.prototype.CIELab;
         ce.channels = executionState.channels;
         ce.sampleFormat = ChannelExtraction.prototype.SameAsSource;
         ce.executeOn(executionState.view);
      },

      // apply screen transfer function
      applySTF: function (view) {

         let transformation = [
            [0, 1, 0.5, 0, 1],
            [0, 1, 0.5, 0, 1],
            [0, 1, 0.5, 0, 1],
            [0, 1, 0.5, 0, 1]];

         let median = view.computeOrFetchProperty("Median");
         let mad = view.computeOrFetchProperty("MAD");

         //set variables
         let targetBackground = 0.25;
         let shadowsClipping = -2.8;

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
         STFunction.executeOn(view);
         return transformation;
      },

      // useful statistics
      imageSnapshot: function (img) {
         return {
            mean: img.mean(),
            median: img.median(),
            min: img.minimum(),
            max: img.maximum()
         };
      },

      // to string
      getImageSnapshotStr: function (snapshot) {
         return ds.utilities.concatenateStr('Mean: ', snapshot.mean, ' Median: ', snapshot.median,
            ' Min: ', snapshot.min, ' Max: ', snapshot.max);
      },

      applyHistogramTransformation: function (view) {

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

         view.beginProcess();
         HT.executeOn(view.image);
         view.endProcess();
      },

      // clone image using pixel math
      pixMathClone: function (view, suffix) {
         let P = new PixelMath;
         P.expression = "$T";
         P.expression1 = "";
         P.expression2 = "";
         P.expression3 = "";
         P.useSingleExpression = true;
         P.symbols = "";
         P.clearImageCacheAndExit = false;
         P.cacheGeneratedImages = false;
         P.generateOutput = true;
         P.singleThreaded = false;
         P.optimization = true;
         P.use64BitWorkingImage = false;
         P.rescale = false;
         P.rescaleLower = 0;
         P.rescaleUpper = 1;
         P.truncate = true;
         P.truncateLower = 0;
         P.truncateUpper = 1;
         P.createNewImage = true;
         P.showNewImage = true;
         P.newImageId = ds.utilities.getNewName(view.id, suffix || '_clone');
         P.newImageWidth = 0;
         P.newImageHeight = 0;
         P.newImageAlpha = false;
         P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
         P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
         P.executeOn(view);
         return P.newImageId;
      },

      bootstrap: function (initialConfig, mainAction, dialogFactory, feature, closeOnExit) {

         ds.debug.engine.debugLn(
            'Bootstrap() called for feature', feature, 'with close on exit', closeOnExit.toString());

         const dsFeature = ds.features[feature];
        
         return function main() {

            let executionState = dsFeature.executionState;

            ds.debug.engine.debugLn('Creating settings manager...');

            executionState.config =
               ds.createSettingsManager(initialConfig);

            executionState.config.closeOnExit = closeOnExit;
            executionState.config.init();

            ds.debug.engine.debugLn('Settings initialized');

            ds.utilities.writeLines(
               ds.utilities.concatenateStr('v', VERSION, ' invoked'));

            if (Parameters.isGlobalTarget || Parameters.isViewTarget) {
               executionState.config.loadParameters();
            }

            if (Parameters.isViewTarget) {
               executionState.view = Parameters.targetView;
               ds.debug.engine.debugLn('Executing with view target ', executionState.view.id);
               mainAction();
            }
            else {
               executionState.view = ImageWindow.activeWindow.currentView;
               ds.debug.engine.debugLn('Launching dialog with view target ', executionState.view.id);
               dsFeature.dialog = dialogFactory();               
               dsFeature.dialog.execute();
            }
         }

      }
   };
})(deepSky);
