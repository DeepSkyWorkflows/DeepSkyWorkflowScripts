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
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > AutoLinearFit

#define TITLE "Auto Linear Fit"

#ifndef FEATURE
#define FEATURE "autoLinearFit"
#endif

#ifndef DEBUG_ALF
#define DEBUG_ALF false
#endif

#include "deepSkyCommon.js"

// separate the channels

function featureDialog() {

   let dialog = this;
   let ds = dialog.ds;
   let util = ds.utilities;
   let executionState = ds.features.autoLinearFit.executionState;
   this.progressArea = ds.ui.createProgressLabel(dialog);

   // ------------------------------------------------------------------------
   // GUI
   // ------------------------------------------------------------------------

   this.lblHeadLine = new Label(this);
   with (this.lblHeadLine) {
      useRichText = true;
      text = util.concatenateStr('<b>', TITLE, ' v', VERSION, '</b>');
   }

   this.lblCopyright = new Label(this);
   this.lblCopyright.text = "© 2021, Jeremy Likness";

   this.useMinCheckbox = ds.ui.createBoundCheckbox(this, 'useMin');

   // new instance
   this.newInstanceCheckbox = ds.ui.createBoundCheckbox(this, 'newInstance');

   this.firstRow = new HorizontalSizer;
   with (this.firstRow) {
      margin = 6;
      spacing = 4;
      add(dialog.useMinCheckbox);
      addStretch();
      add(dialog.newInstanceCheckbox);
   }

   this.preserveChannelsCheckbox = ds.ui.createBoundCheckbox(this, 'preserveChannels');

   this.secondRow = new HorizontalSizer;
   with (this.secondRow) {
      margin = 6;
      spacing = 4;
      add(dialog.preserveChannelsCheckbox);
   }

   this.mainSettings = ds.ui.createVerticalGroupBox(this, 'Main settings', dialog.firstRow,
      dialog.secondRow);

   // linear fit settings
   this.rejectLowSlider = ds.ui.createBoundNumericControl(
      this, 
      'rejectLow',
      { low: 1, high: 100 });

   this.rejectLowSlider.onValueUpdated = function (value) {
      if (value >= 1.0 || value >= executionState.config.prefs.rejectHigh) {
         value = executionState.config.prefs.rejectHigh * 0.9;
         dialog.rejectLowSlider.setValue(value);
      }
      executionState.config.prefs.rejectLow = value;
   };

   this.rejectHighSlider = ds.ui.createBoundNumericControl(
      this, 
      'rejectHigh',
      { low: 1, high: 100 });

   this.rejectHighSlider.onValueUpdated = function (value) {
      if (value <= 0 || value <= executionState.config.prefs.rejectLow) {
         value = executionState.config.prefs.rejectLow * 1.01;
         dialog.rejectHighSlider.setValue(value);
      }
      executionState.config.prefs.rejectHigh = value;
   };

   this.lFitSettings = ds.ui.createVerticalGroupBox(this, 'Linear fit', dialog.rejectLowSlider,
      dialog.rejectHighSlider);

   // linear fit settings
   this.lightnessSlider = ds.ui.createBoundNumericControl(
      this, 
      'lightness',
      { low: 1, high: 100 });

   this.lightnessSlider.onValueUpdated = function (value) {
      if (value < 0.001) {
         value = 0.001;
         dialog.lightnessSlider.setValue(0.001);
      }
      executionState.config.prefs.lightness = value;
   };

   this.saturationSlider = ds.ui.createBoundNumericControl(
      this, 
      'saturation',
      { low: 1, high: 100 });

   this.saturationSlider.onValueUpdated = function (value) {
      if (value < 0.001) {
         value = 0.001;
         dialog.saturationSlider.setValue(0.001);
      }
      executionState.config.prefs.saturation = value;
   };

   this.lbllayersRemoved = new Label(this);
   this.lbllayersRemoved.text = "Smoothed wavelet layers:";

   this.layersRemovedCombo = new ComboBox(this);
   with (this.layersRemovedCombo) {
      enabled = executionState.config.prefs.noiseReduction;
      editEnabled = false;
      bindings = function () {
         this.currentItem = executionState.config.prefs.layersRemoved;
      }
      onItemSelected = function (value) {
         let val = dialog.layersRemovedCombo.itemText(value);
         executionState.config.prefs.layersRemoved = parseInt(val);
         dialog.rebuildLayers();
      }
   }

   executionState.config.funcs.layersRemoved.reset = function () {
      dialog.layersRemovedCombo.currentItem = dialog.execState.config.prefs.layersRemoved;
      dialog.layersRemovedCombo.update();
   }

   this.removedControl = new HorizontalSizer(this);
   with (this.removedControl) {
      margin = 6;
      spacing = 4;
      add(dialog.lbllayersRemoved);
      add(dialog.layersRemovedCombo);
   }

   this.lbllayersProtected = new Label(this);
   this.lbllayersProtected.text = "Protected wavelet layers:";

   this.layersProtectedCombo = new ComboBox(this);
   with (this.layersProtectedCombo) {
      enabled = executionState.config.prefs.noiseReduction;
      editEnabled = false;
      bindings = function () {
         this.currentItem = executionState.config.prefs.layersProtected;
      }
      onItemSelected = function (value) {
         let val = dialog.layersProtectedCombo.itemText(value);
         executionState.config.prefs.layersProtected = parseInt(val);
         dialog.rebuildLayers();
      }
   }

   this.rebuildLayers = function () {
      dialog.layersRemovedCombo.clear();
      let idx = 0;
      for (var layers = executionState.config.prefs.layersProtected + 1; layers <= 6; layers += 1) {
         dialog.layersRemovedCombo.addItem('' + layers);
         if (layers === executionState.config.prefs.layersRemoved) {
            dialog.layersRemovedCombo.currentItem = idx;
         }
         idx++;
      }
      dialog.layersProtectedCombo.clear();
      idx = 0;
      let max = executionState.config.prefs.layersRemoved - 1;
      for (var layers = 0; layers <= max; layers += 1) {
         dialog.layersProtectedCombo.addItem('' + layers);
         if (layers === executionState.config.prefs.layersProtected) {
            dialog.layersProtectedCombo.currentItem = idx;
         }
         idx++;
      }
   }

   executionState.config.funcs.layersProtected.reset = dialog.rebuildLayers;
   executionState.config.funcs.layersRemoved.reset = dialog.rebuildLayers;

   this.rebuildLayers();

   this.protectedControl = new HorizontalSizer(this);
   with (this.protectedControl) {
      margin = 6;
      spacing = 4;
      add(dialog.lbllayersProtected);
      add(dialog.layersProtectedCombo);
   }

   this.chrominance = new GroupBox(this);
   with (this.chrominance) {
      title = "Chrominance noise reduction";
      titleCheckBox = true;
      checked = executionState.config.prefs.noiseReduction;
      onCheck = function (value) {
         executionState.config.prefs.noiseReduction = value;
         dialog.layersRemovedCombo.enabled = value;
         dialog.layersProtectedCombo.enabled = value;
      }
      sizer = new VerticalSizer(dialog.chrominance);
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add(dialog.removedControl);
      sizer.add(dialog.protectedControl);
   }

   executionState.config.funcs.noiseReduction.reset = function () {
      dialog.chrominance.checked = executionState.config.prefs.noiseReduction;
      dialog.chrominance.update();
   }

   this.lrgbSettings = ds.ui.createVerticalGroupBox(
      this, 'LRGBCombination', dialog.lightnessSlider, dialog.saturationSlider,
      dialog.chrominance);

   this.buttonSizer = ds.ui.createToolbar({
      newInstanceIcon: true,
      applyIcon: true,
      applyFn: function () {
         executionState.updateProgress = dialog.updateProgress;
         ds.features.autoLinearFit.engine.doFit();
         executionState.config.saveSettings();
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
}

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_ALF);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, {

      separateChannels: function () {

         let executionState = ds.getExecutionState();
         let sourceViewId = executionState.view.id;

         executionState.channels = [
            [true, ds.utilities.getNewName(sourceViewId, '_R')],
            [true, ds.utilities.getNewName(sourceViewId, '_G')],
            [true, ds.utilities.getNewName(sourceViewId, '_B')]
         ];

         // separate the RGB components
         let ce = new ChannelExtraction;
         ce.channels = executionState.channels;
         ce.colorSpace = ChannelExtraction.prototype.RGB;
         ce.sampleFormat = ChannelExtraction.prototype.SameAsSource;
         ce.executeOn(executionState.view);
      },

      // compute the channel with the minimum or maximum median
      findMinOrMaxChannel: function () {

         let executionState = ds.getExecutionState();
         let utils = ds.utilities;

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

         utils.writeLines(utils.concatenateStr('R: ', medians[0], ' G: ', medians[1], ' B: ', medians[2]),
            utils.concatenateStr('Using ', executionState.config.prefs.useMin ? 'minimum' : 'maximum', ' median channel'));

         // get minimum or maximum channel
         let tgtMedian = maxOrMinFn(medians[0], medians[1], medians[2]);

         let adjusted = [];

         // iterate to pull out reference channel
         let tgtId = 0;
         for (var i = 0; i < medians.length; i++) {
            if (tgtMedian == medians[i]) {
               tgtId = i;
               adjusted.push(executionState.config.prefs.newInstance || false);
               utils.writeLines(utils.concatenateStr('Selected channel: ', '<i>', executionState.channels[i][1], '</i>'));
            }
            else {
               adjusted.push(true);
            }
         }

         executionState.tgtId = tgtId;
         executionState.channelImgs = channelImgs;
         executionState.adjusted = adjusted;
      },

      // apply linear fit to other two channels
      linearFit: function (progress) {

         let executionState = ds.getExecutionState();

         // linear fit using reference channel
         let lf = new LinearFit;
         lf.rejectLow = executionState.config.prefs.rejectLow;
         lf.rejectHigh = executionState.config.prefs.rejectHigh;

         ds.utilities.writeLines(ds.utilities.concatenateStr('Executing LinearFit with rejectLow: ', executionState.config.prefs.rejectLow,
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
      },

      // use LRGB to recombine
      lrgbCombine: function () {
         let executionState = ds.getExecutionState();
         ds.utilities.writeLines(ds.utilities.concatenateStr('Combining with lightness ', executionState.config.prefs.lightness,
            ' and saturation ', executionState.config.prefs.saturation),
            executionState.config.prefs.noiseReduction ? ds.utilities.concatenateStr('Applying noise reduction: layersRemoved: ',
               executionState.config.prefs.layersRemoved, ' layersProtected: ', executionState.config.prefs.layersProtected) :
               'No noise reduction');

         console.writeln(executionState.config.prefs.clipHighlights ? 'Clipping highlights' : 'Not clipping highlights');

         // set up combination
         let lrgb = new LRGBCombination;

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
            console.writeln(ds.utilities.concatenateStr('Applying to view ', executionState.view.id));
            // reapply to the view
            lrgb.executeOn(executionState.view);
         }

         if (executionState.config.prefs.preserveChannels === false) {
            executionState.channelImgs[0].window.forceClose();
            executionState.channelImgs[1].window.forceClose();
            executionState.channelImgs[2].window.forceClose();
         }
      },

      // main method
      doFit: function () {

         let executionState = ds.getExecutionState();
         let sourceViewId = executionState.view.id;

         ds.utilities.writeLines(ds.utilities.concatenateStr('processing view ', sourceViewId));

         // make sure we have RGB
         if (executionState.view.image.numberOfChannels !== 3) {
            ds.utilities.writeLines('ERROR: view is not RGB');
            ds.ui.showDialog("ERROR", "View is not RGB");
            executionState.config.closeOnExit = true;
            return;
         }

         let progress = executionState.updateProgress || function (msg) { };
         
         progress('0% Separating channels...');

         this.engine.separateChannels();

         progress('10% Computing reference channel...');

         this.engine.findMinOrMaxChannel();

         progress('20% Applying LinearFit...');

         this.engine.linearFit(progress);

         progress('80% Combining channels...');

         this.engine.lrgbCombine(executionState);

         progress('100% Done.');

         ds.utilities.writeLines('Done');

         if (executionState.config.prefs.newInstance === false) {
            executionState.view.window.bringToFront();
         }
      }

   });

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([

      {
         setting: "useMin",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Use minimum channel",
         tooltip: "Uses the channel with the minimum median as the source for LinearFit. Otherwise uses the max."
      },

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
         defaultValue: false,
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
      { setting: "noiseReduction", dataType: DataType_Boolean, defaultValue: false },
      { setting: "layersRemoved", dataType: DataType_Int16, defaultValue: 4 },
      { setting: "layersProtected", dataType: DataType_Int16, defaultValue: 2 },
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
      { setting: "clipHighlights", dataType: DataType_Boolean, defaultValue: true }
   ],
      ds.features[FEATURE].engine.doFit,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(featureDialog);
      },
      FEATURE,
      false);

   bootstrap();
})(deepSky);
