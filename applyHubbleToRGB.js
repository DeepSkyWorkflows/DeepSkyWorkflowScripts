/*

applyHubbletoRGB.js: Simulation of the "Hubble palette."
================================================================================

Transforms red, "smoky" nebula to blueish with higher contrast.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/JeremyLikness/DeepSkyWorkflows/LICENSE
 *
 * Source: https://github.com/JeremyLikness/DeepSkyWorkflows/tree/master/piscripts
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > ApplyHubbleToRGB

#define TITLE "Apply Hubble Palette to RGB"

#include "deepSkyCommon.js"

function preserveStars(executionState) {
   executionState.updateProgress('Extracting stars...');

   var sn = new StarNet;
   sn.stride = StarNet.prototype.Stride_128;
   sn.mask = true;

   sn.executeOn(executionState.view);

   var stars = ImageWindow.activeWindow.mainView;
   stars.id = getNewName(executionState.view.id, '_Stars');
   executionState.data.stars = stars;
   writeLines(concatenateStr('Stars are preserved in view ', stars.id));
   executionState.data.toClose.push(stars.id);
}

// separate the channels
function separateChannels(executionState) {

   executionState.updateProgress('Separating channels...');

   let sourceViewId = executionState.view.id;

   executionState.channels = [
      [true, getNewName(sourceViewId, '_R')],
      [true, getNewName(sourceViewId, '_G')],
      [true, getNewName(sourceViewId, '_B')]
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
}

// compute the channel with the minimum or maximum median
function findMinChannel(executionState) {

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
         writeLines(concatenateStr('Selected channel: ', '<i>', executionState.channels[i][1], '</i>'));
         break;
      }
   }

   executionState.tgtId = tgtId;
   executionState.channelImgs = channelImgs;
}

// apply linear fit to other two channels
function linearFit(executionState, synthetic) {

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
}

function createSyntheticChannel(executionState) {

   executionState.updateProgress("Creating synthetic red minus blue channel...");

   var P = new PixelMath;
   P.expression = concatenateStr('$T-', executionState.channels[2][1]);
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
   P.newImageId = getNewName(executionState.view.id, '_RMinusB');
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
   P.executeOn(ImageWindow.windowById(executionState.channels[0][1]).mainView);
   let win = ImageWindow.windowById(P.newImageId);
   executionState.data.syntheticChannel = win.mainView;
   writeLines(concatenateStr("Created synthetic channel: ",
      P.newImageId));
   executionState.data.toClose.push(P.newImageId);
}

function computeImage(executionState) {
   executionState.updateProgress("Computing final image...");
   let red = executionState.config.prefs.redChannelStrength;
   let green = 1.0-red;
   let redChannel = executionState.config.prefs.createSyntheticRedBlueChannel ?
      executionState.data.syntheticChannel.id :
      executionState.channels[0][1];
   var P = new PixelMath;
   P.expression = concatenateStr('(', red, '*', redChannel, ')+(',
      green, '*', executionState.channels[1][1],')');
   P.expression1 = concatenateStr('(', green, '*', redChannel, ')+(',
      red, '*', executionState.channels[1][1],')');
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
   P.newImageId = getNewName(executionState.view.id, '_hubble');
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
   P.executeOn(executionState.view);
   writeLines(concatenateStr("Created hubble image: ",
      P.newImageId));
   executionState.data.hubbleImage = ImageWindow.windowById(P.newImageId).mainView;
}

function restoreStars(executionState) {
   executionState.updateProgress("Restoring stars...");
   var P = new PixelMath;
   P.expression = concatenateStr('max($T,', executionState.data.stars.id, ')');
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
}

function forceClosures(executionState) {
   executionState.updateProgress('Closing intermediate images...');
   let toClose = executionState.data.toClose;
   for (var i = 0; i < toClose.length; i++) {
      let toCloseId = toClose[i];
      ImageWindow.windowById(toCloseId).forceClose();
      console.writeln("Closed view " + toCloseId);
   }
}

// main method
function doApply(executionState) {

   let sourceViewId = executionState.view.id;

   writeLines(concatenateStr('processing view ', sourceViewId));

   if (executionState.config.prefs.preserveOriginal === true) {
      console.writeln('Cloning original image..');
      let cloneId = pixMathClone(executionState.view, '_');
      executionState.data.toClose.push(cloneId);
      executionState.view = ImageWindow.windowById(cloneId).mainView;
   }

   preserveStars(executionState);
   separateChannels(executionState);
   findMinChannel(executionState);
   linearFit(executionState, false);

   if (executionState.config.prefs.createSyntheticRedBlueChannel) {
      createSyntheticChannel(executionState);
      linearFit(executionState, true);
   }

   computeImage(executionState);
   restoreStars(executionState);

   if (executionState.config.prefs.closeIntermediateImages === true) {
      forceClosures(executionState);
   }

   executionState.updateProgress("Done");
   writeLines('Done');
}

function hubbleDialog(executionState)
{
   // Add all properties and methods of the core Dialog object to this object.
   this.__base__ = Dialog;
   this.__base__();

   var dlg = this;
   prepareDialog(dlg);
   this.execState = executionState;

   this.progressArea = createProgressLabel(dlg);
   executionState.updateProgress = function (msg) {
      writeLines(msg);
      dlg.updateProgress(msg);
   };

   // ------------------------------------------------------------------------
   // GUI
   // ------------------------------------------------------------------------

   this.lblHeadLine = new Label(this);
   with (this.lblHeadLine)
   {
      useRichText = true;
      text = concatenateStr('<b>', TITLE, ' v', VERSION, '</b>');
   }

   // my copyright
   this.lblCopyright = new Label(this);
   this.lblCopyright.text = "© 2021, Jeremy Likness";

   this.redLevelSlider = createBoundNumericControl(this, 'redChannelStrength', executionState.config,
      {low:0, high: 100 });

   this.otherLevelSlider = createBoundNumericControl(this, 'otherChannelStrength', executionState.config,
      {low:0, high: 100 });

   this.otherLevelSlider.enabled = false;
   this.otherLevelSlider.onChanges = function () {
      dlg.otherLevelSlider.setValue(1.0 - dlg.execState.config.prefs.redChannelStrength);
      dlg.otherLevelSlider.update();
   };

   this.otherLevelSlider.onChanges();

   this.redLevelSlider.onValueUpdated = chainFn(dlg.redLevelSlider, "onValueUpdated",
      dlg.otherLevelSlider.onChanges);

   this.preserveOriginalCheckbox = createBoundCheckbox(this,
      "preserveOriginal", dlg.execState.config);

   this.closeIntermediateImagesCheckbox = createBoundCheckbox(this,
      "closeIntermediateImages", dlg.execState.config);

   this.createSyntheticRBChannelCheckbox = createBoundCheckbox(this,
      "createSyntheticRedBlueChannel", dlg.execState.config);

   this.createSyntheticRBChannelCheckbox.onCheck = chainFn(
      dlg.createSyntheticRBChannelCheckbox,
      "onCheck",
      dlg.otherLevelSlider.onChanges);

   console.writeln(this.preserveOriginalCheckbox.onCheck);
   console.writeln(this.createSyntheticRBChannelCheckbox.onCheck);

   this.settings = createVerticalGroupBox(this, "Settings",
      this.preserveOriginalCheckbox,
      this.closeIntermediateImagesCheckbox,
      this.createSyntheticRBChannelCheckbox);

   this.levels = createVerticalGroupBox(this, "Channel blend",
      this.redLevelSlider,
      this.otherLevelSlider);

   this.buttonSizer = createToolbar(this, dlg.execState.config, {
      newInstanceIcon: true,
      applyIcon: true,
      applyFn: function () {
         doApply(dlg.execState);
         dlg.execState.config.saveSettings();
      },
      resetIcon: true
   });

   this.sizer = new VerticalSizer(this);
   with (this.sizer) {
      margin = 6;
      spacing = 4;
      add(dlg.lblHeadLine);
      add(dlg.lblCopyright);
      add(dlg.settings);
      add(dlg.levels);
      add(dlg.progressArea);
      add(dlg.buttonSizer);
   }
}

hubbleDialog.prototype = new Dialog;

function main() {

   let executionState = {
      config: createSettingsManager([
         {
            setting: "redChannelStrength",
            dataType: DataType_Double,
            defaultValue: 0.7,
            label: "Main:",
            precision: 3,
            tooltip: "Percentage of red or synthetic channel. Difference goes to green channel",
            range: { low: 0.51, high: 0.9 }
         },
         {
            setting: "otherChannelStrength",
            dataType: DataType_Double,
            defaultValue: 0.3,
            label: "Green:",
            precision: 3,
            range: { low: 0.1, high: 0.49 }
         },
         {
            setting: "createSyntheticRedBlueChannel",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Create synthetic channel",
            tooltip: "Creates a synthetic channel by subtracting blue from red"
         },
         {
            setting: "preserveOriginal",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Preserve original image",
            tooltip: "If checked, the operations will be performed on a clone"
         },
         {
            setting: "closeIntermediateImages",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Close intermediate images",
            tooltip: "If checked the intermediate views will be closed"
         },
      ])
   };

   executionState.data = {};
   executionState.data.toClose = [];
   executionState.updateProgress = function(msg) {
      writeLines(msg);
   };

   executionState.config.init();

   writeLines(concatenateStr('v', VERSION, ' invoked'));

   if ( Parameters.isGlobalTarget || Parameters.isViewTarget ) {
      executionState.config.loadParameters();
   }

   if (Parameters.isViewTarget) {
      executionState.view = Parameters.targetView;
      doApply(executionState);
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
      executionState.closeOnExit = false;
      let dialog = new hubbleDialog(executionState);
      dialog.execute();
   }
}

main();
