/*

autoLinearFitAndCombine.js: Automatic normalization of RGB channels
================================================================================

This script will separate the RGB channels, determine the channel
with the highest median value, apply a LinearFit to the other channels,
then use LRGB to combine them.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * Based on source by Ivan Smith and EZ Processing Scripts
 *
 * License: https://github.com/JeremyLikness/DeepSkyWorkflows/LICENSE
 *
 * Source: https://github.com/JeremyLikness/DeepSkyWorkflows/tree/master/piscripts
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > AutoLinearFit

#define TITLE "Auto Linear Fit"

#include "deepSkyCommon.js"

// separate the channels
function separateChannels(executionState) {

   let sourceViewId = executionState.view.id;

   executionState.channels = [
      [true, getNewName(sourceViewId, '_R')],
      [true, getNewName(sourceViewId, '_G')],
      [true, getNewName(sourceViewId, '_B')]
   ];

   // separate the RGB components
   let ce = new ChannelExtraction;
   ce.channels = executionState.channels;
   ce.colorSpace = ChannelExtraction.prototype.RGB;
   ce.sampleFormat = ChannelExtraction.prototype.SameAsSource;
   ce.executeOn(executionState.view);
}

// compute the channel with the minimum or maximum median
function findMinOrMaxChannel(executionState) {

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

   // base on maximum or minimum?
   let maxOrMinFn = executionState.config.prefs.useMin ? Math.min : Math.max;

   writeLines(concatenateStr('R: ', medians[0], ' G: ', medians[1], ' B: ', medians[2]),
      concatenateStr('Using ', executionState.config.prefs.useMin ? 'minimum' : 'maximum', ' median channel'));

   // get minimum or maximum channel
   let tgtMedian = maxOrMinFn(medians[0], medians[1], medians[2]);

   let adjusted = [];

   // iterate to pull out reference channel
   let tgtId = 0;
   for (var i = 0; i < medians.length; i++) {
      if (tgtMedian == medians[i]) {
         tgtId = i;
         adjusted.push(executionState.config.prefs.newInstance || false);
         writeLines(concatenateStr('Selected channel: ', '<i>', executionState.channels[i][1], '</i>'));
      }
      else {
         adjusted.push(true);
      }
   }

   executionState.tgtId = tgtId;
   executionState.channelImgs = channelImgs;
   executionState.adjusted = adjusted;
}

// apply linear fit to other two channels
function linearFit(executionState, progress) {

   // linear fit using reference channel
   let lf = new LinearFit;
   lf.rejectLow = executionState.config.prefs.rejectLow;
   lf.rejectHigh = executionState.config.prefs.rejectHigh;

   writeLines(concatenateStr('Executing LinearFit with rejectLow: ', executionState.config.prefs.rejectLow,
      ' rejectHigh: ', executionState.config.prefs.rejectHigh));

   lf.referenceViewId = executionState.channels[executionState.tgtId][1];
   let firstChannel = true;
   for (var i = 0; i < executionState.channelImgs.length; i++) {
      if (executionState.tgtId != i) {
         lf.executeOn(executionState.channelImgs[i]);
         if (firstChannel) {
            progress('50% Fitting 2nd channel...');
            firstChannel = false;
         }
      }
   }
}

// use LRGB to recombine
function lrgbCombine(executionState) {
   writeLines(concatenateStr('Combining with lightness ', executionState.config.prefs.lightness,
      ' and saturation ', executionState.config.prefs.saturation),
      executionState.config.prefs.noiseReduction ? concatenateStr('Applying noise reduction: layersRemoved: ',
         executionState.config.prefs.layersRemoved, ' layersProtected: ', executionState.config.prefs.layersProtected) :
         'No noise reduction');

   console.writeln(executionState.config.prefs.clipHighlights ? 'Clipping highlights' : 'Not clipping highlights');

   // set up combination
   var lrgb = new LRGBCombination;

   lrgb.channels = [ // enabled, id, k
      [executionState.adjusted[0], executionState.channels[0][1], 1.00000],
      [executionState.adjusted[1], executionState.channels[1][1], 1.00000],
      [executionState.adjusted[2], executionState.channels[2][1], 1.00000],
      [false, "", 1.00000]
   ];

   lrgb.mL = executionState.config.prefs.lightness;
   lrgb.mc = executionState.config.prefs.saturation;
   lrgb.clipHighlights = executionState.config.prefs.clipHighlights;
   lrgb.noiseReduction = executionState.config.prefs.noiseReduction;
   lrgb.layersRemoved = executionState.config.prefs.layersRemoved;
   lrgb.layersProtected = executionState.config.prefs.layersProtected;

   if (executionState.config.prefs.newInstance) {
      console.writeln('Combining to new instance');
      lrgb.executeGlobal();
   }
   else {
      console.writeln(concatenateStr('Applying to view ', executionState.view.id));
      // reapply to the view
      lrgb.executeOn(executionState.view);
   }

   if (executionState.config.prefs.preserveChannels === false) {
      executionState.channelImgs[0].window.forceClose();
      executionState.channelImgs[1].window.forceClose();
      executionState.channelImgs[2].window.forceClose();
   }
}

// main method
function doFit(executionState) {

   let sourceViewId = executionState.view.id;

   writeLines(concatenateStr('processing view ', sourceViewId));

   // make sure we have RGB
   if (executionState.view.image.numberOfChannels !== 3) {
      writeLines('ERROR: view is not RGB');
      return;
   }

   let progress = executionState.updateProgress || function (msg) {};

   progress('0% Separating channels...');

   separateChannels(executionState);

   progress('10% Computing reference channel...');

   findMinOrMaxChannel(executionState);

   progress('20% Applying LinearFit...');

   linearFit(executionState, progress);

   progress('80% Combining channels...');

   lrgbCombine(executionState);

   progress('100% Done.');

   writeLines('Done');

   if (executionState.config.prefs.newInstance === false) {
      executionState.view.window.bringToFront();
   }
}

function alfDialog(executionState)
{
   // Add all properties and methods of the core Dialog object to this object.
   this.__base__ = Dialog;
   this.__base__();

   var dlg = this;
   prepareDialog(dlg);

   this.execState = executionState;
   this.progressArea = createProgressLabel(dlg);

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

   // main settings

   // use minimum
   this.useMinCheckbox = createBoundCheckbox(this, 'useMin', executionState.config);

   // new instance
   this.newInstanceCheckbox = new createBoundCheckbox(this, 'newInstance', executionState.config);

   this.firstRow = new HorizontalSizer;
   with (this.firstRow) {
      margin = 6;
      spacing = 4;
      add(dlg.useMinCheckbox);
      addStretch();
      add(dlg.newInstanceCheckbox);
   }

   this.preserveChannelsCheckbox = new createBoundCheckbox(this, 'preserveChannels', executionState.config);

   this.secondRow = new HorizontalSizer;
   with (this.secondRow) {
      margin = 6;
      spacing = 4;
      add(dlg.preserveChannelsCheckbox);
   }

   this.mainSettings = createVerticalGroupBox(this, 'Main settings', dlg.firstRow,
      dlg.secondRow);

   // linear fit settings
   this.rejectLowSlider = createBoundNumericControl(this, 'rejectLow', executionState.config,
      {low: 1, high: 100 });

   this.rejectLowSlider.onValueUpdated = function (value) {
      if (value >= 1.0 || value >= dlg.execState.config.prefs.rejectHigh) {
         value = dlg.execState.config.prefs.rejectHigh * 0.9;
         dlg.rejectLowSlider.setValue(value);
      }
      dlg.execState.config.prefs.rejectLow = value;
   };

   this.rejectHighSlider = createBoundNumericControl(this, 'rejectHigh', executionState.config,
      {low: 1, high: 100 });

   this.rejectHighSlider.onValueUpdated = function (value) {
      if (value <= 0 || value <= dlg.execState.config.prefs.rejectLow) {
         value = dlg.execState.config.prefs.rejectLow * 1.01;
         dlg.rejectHighSlider.setValue(value);
      }
      dlg.execState.config.prefs.rejectHigh = value;
   };

   this.lFitSettings = createVerticalGroupBox(this, 'Linear fit', dlg.rejectLowSlider,
      dlg.rejectHighSlider);

   // linear fit settings
   this.lightnessSlider = createBoundNumericControl(this, 'lightness', executionState.config,
      {low: 1, high: 100 });

   this.lightnessSlider.onValueUpdated = function (value) {
      if (value < 0.001) {
         value = 0.001;
         dlg.lightnessSlider.setValue(0.001);
      }
      dlg.execState.config.prefs.lightness = value;
   };

   this.saturationSlider = createBoundNumericControl(this, 'saturation', executionState.config,
      {low: 1, high: 100 });

   this.saturationSlider.onValueUpdated = function (value) {
      if (value < 0.001) {
         value = 0.001;
         dlg.saturationSlider.setValue(0.001);
      }
      dlg.execState.config.prefs.saturation = value;
   };

   this.lbllayersRemoved = new Label(this);
   this.lbllayersRemoved.text = "Smoothed wavelet layers:";

   this.layersRemovedCombo = new ComboBox(this);
   with (this.layersRemovedCombo) {
      enabled = dlg.execState.config.prefs.noiseReduction;
      editEnabled = false;
      bindings = function() {
         this.currentItem = dlg.execState.config.prefs.layersRemoved;
      }
      onItemSelected = function(value) {
         let val = dlg.layersRemovedCombo.itemText(value);
         dlg.execState.config.prefs.layersRemoved = parseInt(val);
         dlg.rebuildLayers();
      }
   }

   dlg.execState.config.funcs.layersRemoved.reset = function () {
      dlg.layersRemovedCombo.currentItem =  dlg.execState.config.prefs.layersRemoved;
      dlg.layersRemovedCombo.update();
   }

   this.removedControl = new HorizontalSizer(this);
   with (this.removedControl) {
      margin = 6;
      spacing = 4;
      add(dlg.lbllayersRemoved);
      add(dlg.layersRemovedCombo);
   }

   this.lbllayersProtected = new Label(this);
   this.lbllayersProtected.text = "Protected wavelet layers:";

   this.layersProtectedCombo = new ComboBox(this);
   with (this.layersProtectedCombo) {
      enabled = dlg.execState.config.prefs.noiseReduction;
      editEnabled = false;
      bindings = function() {
         this.currentItem = dlg.execState.config.prefs.layersProtected;
      }
      onItemSelected = function(value) {
         let val = dlg.layersProtectedCombo.itemText(value);
         dlg.execState.config.prefs.layersProtected = parseInt(val);
         dlg.rebuildLayers();
      }
   }

   this.rebuildLayers = function () {
      dlg.layersRemovedCombo.clear();
      let idx = 0;
      for (var layers = dlg.execState.config.prefs.layersProtected + 1; layers <= 6; layers += 1) {
         dlg.layersRemovedCombo.addItem('' + layers);
         if (layers === dlg.execState.config.prefs.layersRemoved) {
            dlg.layersRemovedCombo.currentItem = idx;
         }
         idx++;
      }
      dlg.layersProtectedCombo.clear();
      idx = 0;
      let max = dlg.execState.config.prefs.layersRemoved - 1;
      for (var layers = 0; layers <= max; layers += 1) {
         dlg.layersProtectedCombo.addItem('' + layers);
         if (layers === dlg.execState.config.prefs.layersProtected) {
            dlg.layersProtectedCombo.currentItem = idx;
         }
         idx++;
      }
   }

   dlg.execState.config.funcs.layersProtected.reset = dlg.rebuildLayers;
   dlg.execState.config.funcs.layersRemoved.reset = dlg.rebuildLayers;

   this.rebuildLayers();

   this.protectedControl = new HorizontalSizer(this);
   with (this.protectedControl) {
      margin = 6;
      spacing = 4;
      add(dlg.lbllayersProtected);
      add(dlg.layersProtectedCombo);
   }

   this.chrominance = new GroupBox(this);
   with (this.chrominance) {
      title = "Chrominance noise reduction";
      titleCheckBox = true;
      checked = dlg.execState.config.prefs.noiseReduction;
      onCheck = function(value) {
         dlg.execState.config.prefs.noiseReduction = value;
         dlg.layersRemovedCombo.enabled = value;
         dlg.layersProtectedCombo.enabled = value;
      }
      sizer = new VerticalSizer(dlg.chrominance);
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add(dlg.removedControl);
      sizer.add(dlg.protectedControl);
   }

   dlg.execState.config.funcs.noiseReduction.reset = function () {
      dlg.chrominance.checked = dlg.execState.config.prefs.noiseReduction;
      dlg.chrominance.update();
   }

   this.lrgbSettings = createVerticalGroupBox(
      this, 'LRGBCombination', dlg.lightnessSlider, dlg.saturationSlider,
      dlg.chrominance);

   this.buttonSizer = createToolbar(dlg, dlg.execState.config, {
         newInstanceIcon: true,
         applyIcon: true,
         applyFn: function () {
            dlg.execState.updateProgress = dlg.updateProgress;
            doFit(dlg.execState);
            dlg.execState.config.saveSettings();
         },
         resetIcon: true
      });

   this.sizer = new VerticalSizer(this);
   this.sizer.margin = 6;
   this.sizer.spacing = 6;
   this.sizer.add(this.lblHeadLine);
   this.sizer.add(this.lblCopyright);
   this.sizer.add(this.mainSettings);
   this.sizer.add(this.lFitSettings);
   this.sizer.add(this.lrgbSettings);
   this.sizer.add(this.progressArea);
   this.sizer.add(this.buttonSizer);
   this.windowTitle = concatenateStr(TITLE, ' v', VERSION);

   this.adjustToContents();
}

alfDialog.prototype = new Dialog;

function main() {

   let executionState = {
      config: createSettingsManager([

         {  setting: "useMin",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Use minimum channel",
            tooltip: "Uses the channel with the minimum median as the source for LinearFit. Otherwise uses the max."},

         {
            setting: "newInstance",
            dataType: DataType_Boolean,
            defaultValue: false,
            tooltip: "Creates a new image instead of applying the normalization to the target image.",
		      label: "Create new instance"
         },
         {
            setting: "preserveChannels",
            dataType: DataType_Boolean,
            defaultValue: true,
            tooltip: "Set this flag to keep the individual R, G, and B channels when done.",
		      label: "Preserve individual channels"
         },
         {
            setting: "lightness",
            label: "Lightness:",
            range: { low: 0.001, high: 1.0 },
            dataType: DataType_Double,
            tooltip: "Set to values below 0.5 to make the combined image lighter. Greater than 0.5 will make it darker.",
            precision: 3,
            defaultValue: 0.5
		   },
         {
            setting: "saturation",
            label: "Saturation:",
            range: { low: 0.001, high: 1.0 },
            dataType: DataType_Double,
            tooltip: "Set to values below 0.5 to increese the saturation and above 0.5 to decrease it.",
            precision: 3,
            defaultValue: 0.5
         },
         { setting: "noiseReduction", dataType: DataType_Boolean, defaultValue: false},
         { setting: "layersRemoved", dataType: DataType_Int16, defaultValue: 4},
         { setting: "layersProtected", dataType: DataType_Int16, defaultValue: 2},
         {
            setting: "rejectLow",
            label: "Reject low:",
            dataType: DataType_Double,
            defaultValue: 0,
            precision: 2,
            range: { low: 0, high: 1 }
         },
         {
            setting: "rejectHigh",
            label: "Reject high:",
            dataType: DataType_Double,
            defaultValue: 0.92,
            precision: 2,
            range: { low: 0, high: 1 }
         },
         { setting: "clipHighlights", dataType: DataType_Boolean, defaultValue: true}
      ])
   };

   executionState.config.init();

   writeLines(concatenateStr('v', VERSION, ' invoked'));

   if ( Parameters.isGlobalTarget || Parameters.isViewTarget ) {
      executionState.config.loadParameters();
   }

   if (Parameters.isViewTarget) {
      executionState.view = Parameters.targetView;
      doFit(executionState);
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
      let dialog = new alfDialog(executionState);
      dialog.execute();
   }
}

main();
