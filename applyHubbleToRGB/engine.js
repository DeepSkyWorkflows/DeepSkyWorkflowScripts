/*

engine.js: Simulation of the "Hubble palette."
================================================================================

Transforms red, "smoky" nebula to blueish with higher contrast.
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

#script-id ApplyHubbleEngine

let hubbleEngine = (function (ds) {
   return {
      preserveStars: function () {
         const executionState = ds.getExecutionState();
         const utils = ds.utilities;
         executionState.updateProgress('Extracting stars...');

         let sn = new StarNet;
         sn.stride = StarNet.prototype.Stride_128;
         sn.mask = true;

         sn.executeOn(executionState.view);

         let stars = ImageWindow.activeWindow.mainView;
         stars.id = utils.getNewName(executionState.view.id, '_Stars');
         executionState.data.stars = stars;
         utils.writeLines(utils.concatenateStr('Stars are preserved in view ', stars.id));
         executionState.data.toClose.push(stars.id);
      },

      separateChannels: function () {

         const executionState = ds.getExecutionState();
         const utils = ds.utilities;
         executionState.updateProgress('Separating channels...');

         let sourceViewId = executionState.view.id;

         executionState.channels = [
            [true, utils.getNewName(sourceViewId, '_R')],
            [true, utils.getNewName(sourceViewId, '_G')],
            [true, utils.getNewName(sourceViewId, '_B')]
         ];

         let ch = executionState.channels;

         executionState.data.toClose.push(ch[0][1]);
         executionState.data.toClose.push(ch[1][1]);
         executionState.data.toClose.push(ch[2][1]);

         // separate the RGB components
         let ce = new ChannelExtraction;
         ce.channels = executionState.channels;
         ce.colorSpace = ChannelExtraction.prototype.RGB;
         ce.sampleFormat = ChannelExtraction.prototype.SameAsSource;
         ce.executeOn(executionState.view);
      },

      // compute the channel with the minimum or maximum median
      findMinChannel: function () {

         const executionState = ds.getExecutionState();
         const utils = ds.utilities;
         executionState.updateProgress('Computing min channel...');

         // gather extracted channels
         let channelImgs = [];

         for (var c = 0; c < executionState.channels.length; c++) {
            let win = ImageWindow.windowById(executionState.channels[c][1]);
            channelImgs.push(win.mainView);
            win.sendToBack();
         }

         // computed medians
         let medians = [];
         for (var i = 0; i < channelImgs.length; i++) {
            medians.push(channelImgs[i].image.median());
         }

         // get minimum or maximum channel
         let tgtMedian = Math.min(medians[0], medians[1], medians[2]);

         // iterate to pull out reference channel
         let tgtId = 0;
         for (var i = 0; i < medians.length; i++) {
            if (tgtMedian == medians[i]) {
               tgtId = i;
               utils.writeLines(utils.concatenateStr('Selected channel: ', '<i>', executionState.channels[i][1], '</i>'));
               break;
            }
         }

         executionState.tgtId = tgtId;
         executionState.channelImgs = channelImgs;
      },

      // apply linear fit to other two channels
      linearFit: function (synthetic) {

         const executionState = ds.getExecutionState();

         // linear fit using reference channel
         let lf = new LinearFit;
         lf.rejectLow = 0;
         lf.rejectHigh = 0.92;

         executionState.updateProgress('Executing LinearFit...');

         lf.referenceViewId = executionState.channels[executionState.tgtId][1];

         if (synthetic === true) {
            lf.executeOn(executionState.data.syntheticChannel);
         }
         else {
            let firstChannel = true;
            for (var i = 0; i < executionState.channelImgs.length; i++) {
               if (executionState.tgtId != i) {
                  lf.executeOn(executionState.channelImgs[i]);
                  if (firstChannel) {
                     executionState.updateProgress('Fitting 2nd channel...');
                     firstChannel = false;
                  }
               }
            }
         }
      },

      createSyntheticChannel: function () {

         const executionState = ds.getExecutionState();
         const utils = ds.utilities;
         executionState.updateProgress("Creating synthetic red minus blue channel...");

         var P = new PixelMath;
         P.expression = utils.concatenateStr('$T-', executionState.channels[2][1]);
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
         P.newImageId = utils.getNewName(executionState.view.id, '_RMinusB');
         P.newImageWidth = 0;
         P.newImageHeight = 0;
         P.newImageAlpha = false;
         P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
         P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
         P.executeOn(ImageWindow.windowById(executionState.channels[0][1]).mainView);
         let win = ImageWindow.windowById(P.newImageId);
         executionState.data.syntheticChannel = win.mainView;
         utils.writeLines(utils.concatenateStr("Created synthetic channel: ",
            P.newImageId));
         executionState.data.toClose.push(P.newImageId);
      },

      computeImage: function () {
         const executionState = ds.getExecutionState();
         const utils = ds.utilities;
         executionState.updateProgress("Computing final image...");
         let red = executionState.config.prefs.redChannelStrength;
         let green = 1.0 - red;
         let redChannel = executionState.config.prefs.createSyntheticRedBlueChannel ?
            executionState.data.syntheticChannel.id :
            executionState.channels[0][1];
         var P = new PixelMath;
         P.expression = utils.concatenateStr('(', red, '*', redChannel, ')+(',
            green, '*', executionState.channels[1][1], ')');
         P.expression1 = utils.concatenateStr('(', green, '*', redChannel, ')+(',
            red, '*', executionState.channels[1][1], ')');
         P.expression2 = executionState.channels[2][1];
         P.expression3 = "";
         P.useSingleExpression = false;
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
         P.newImageId = utils.getNewName(executionState.view.id, '_hubble');
         P.newImageWidth = 0;
         P.newImageHeight = 0;
         P.newImageAlpha = false;
         P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
         P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
         P.executeOn(executionState.view);
         utils.writeLines(utils.concatenateStr("Created hubble image: ",
            P.newImageId));
         executionState.data.hubbleImage = ImageWindow.windowById(P.newImageId).mainView;
      },

      restoreStars: function () {
         const executionState = ds.getExecutionState();
         const utils = ds.utilities;
         executionState.updateProgress("Restoring stars...");
         var P = new PixelMath;
         P.expression = utils.concatenateStr('max($T,', executionState.data.stars.id, ')');
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
         P.createNewImage = false;
         P.showNewImage = true;
         P.newImageId = '';
         P.newImageWidth = 0;
         P.newImageHeight = 0;
         P.newImageAlpha = false;
         P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
         P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
         P.executeOn(executionState.data.hubbleImage);
      },

      forceClosures: function () {
         const executionState = ds.getExecutionState();
         executionState.updateProgress('Closing intermediate images...');
         let toClose = executionState.data.toClose;
         for (var i = 0; i < toClose.length; i++) {
            let toCloseId = toClose[i];
            ImageWindow.windowById(toCloseId).forceClose();
            console.writeln("Closed view " + toCloseId);
         }
      },

      // main method
      doApply: function () {

         const executionState = ds.getExecutionState();
         const utils = ds.utilities;
         let sourceViewId = executionState.view.id;

         utils.writeLines(utils.concatenateStr('processing view ', sourceViewId));

         if (executionState.config.prefs.preserveOriginal === true) {
            console.writeln('Cloning original image..');
            let cloneId = ds.engine.pixMathClone(executionState.view, '_');
            executionState.data.toClose.push(cloneId);
            executionState.view = ImageWindow.windowById(cloneId).mainView;
         }

         this.engine.preserveStars();
         this.engine.separateChannels();
         this.engine.findMinChannel();
         this.engine.linearFit(false);

         if (executionState.config.prefs.createSyntheticRedBlueChannel) {
            this.engine.createSyntheticChannel();
            this.engine.linearFit(true);
         }

         this.engine.computeImage();
         this.engine.restoreStars();

         if (executionState.config.prefs.closeIntermediateImages === true) {
            this.engine.forceClosures();
         }

         executionState.updateProgress("Done");
         utils.writeLines('Done');
      }
   };
})(deepSky);