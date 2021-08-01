/*

nonLinearStretch.js: Increase contrast with diverging curves transformations.
================================================================================

This script will progressively brighten the foreground and darken the background
using luminance masks and curves transformations.
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

#feature-id    DeepSkyWorkflows > NonLinearStretch

#define TITLE "Non-Linear Stretch"

#include "deepSkyCommon.js"

// generate the curves
function getCurvesTransformation(executionState, up) {

   if (up && executionState.config.prefs.foregroundFactor === 0) {
      return null;
   }

   if (up === false && executionState.config.prefs.backgroundFactor === 0) {
      return null;
   }

   let aggressiveness = up ? executionState.config.prefs.foregroundFactor :
      executionState.config.prefs.backgroundFactor;

   let pctAggressive = aggressiveness/100;
   let offset = 0.4 * pctAggressive;
   let x = 0.5;
   let y = up ? x + offset : x - offset;

   let P = executionState.curves || new CurvesTransformation;
   executionState.curves = P;

   P.R = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Rt = CurvesTransformation.prototype.AkimaSubsplines;
   P.G = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Gt = CurvesTransformation.prototype.AkimaSubsplines;
   P.B = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Bt = CurvesTransformation.prototype.AkimaSubsplines;
   P.K = [ // x, y
      [0.00000, 0.00000],
      [x, y],
      [1.00000, 1.00000]
   ];
   P.Kt = CurvesTransformation.prototype.AkimaSubsplines;
   P.A = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.At = CurvesTransformation.prototype.AkimaSubsplines;
   P.L = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Lt = CurvesTransformation.prototype.AkimaSubsplines;
   P.a = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.at = CurvesTransformation.prototype.AkimaSubsplines;
   P.b = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.bt = CurvesTransformation.prototype.AkimaSubsplines;
   P.c = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.ct = CurvesTransformation.prototype.AkimaSubsplines;
   P.H = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Ht = CurvesTransformation.prototype.AkimaSubsplines;
   P.S = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.St = CurvesTransformation.prototype.AkimaSubsplines;
   return P;
}

function createMask(executionState) {
   extractLuminance(executionState, '_stretch');
   var mask = ImageWindow.windowById(executionState.channels[0][1]).mainView;
   return mask;
}

function iteration(executionState) {

   console.writeln('Generating mask for iteration...');

   var start = getImageSnapshotStr(imageSnapshot(executionState.view.image));
   var mask = createMask(executionState);

   writeLines(concatenateStr('Generated mask ', mask.id));

   var curves = getCurvesTransformation(executionState, true);

   if (curves !== null) {
      console.writeln('Increasing foreground...');

      executionState.view.window.mask = mask.window;
      executionState.view.window.maskEnabled = true;
      executionState.view.window.maskInverted = false;

      curves.executeOn(executionState.view, true);
   }

   curves = getCurvesTransformation(executionState, false);

   if (curves !== null) {
      console.writeln('Decreasing background...');

      executionState.view.window.mask = mask.window;
      executionState.view.window.maskEnabled = true;
      executionState.view.window.maskInverted = true;

      curves.executeOn(executionState.view, true);
   }

   mask.window.forceClose();

   var end = getImageSnapshotStr(imageSnapshot(executionState.view.image));

   writeLines('Iteration results:', concatenateStr('Before: ', start),
      concatenateStr('After: ', end));
}

// main method
function doStretch(executionState) {

   let sourceViewId = executionState.view.id;

   writeLines(concatenateStr('processing view ', sourceViewId));

   // make sure we have RGB
   if (executionState.view.image.numberOfChannels !== 3) {
      writeLines('ERROR: view is not RGB');
      return;
   }

   var start = getImageSnapshotStr(imageSnapshot(executionState.view.image));

   let progress = createProgressBar(15);

   let updateProgress = executionState.updateProgress || function () {};

   updateProgress(concatenateStr(progress.bar, ' 0% Starting...'));

   for (var i = 0; i < executionState.config.prefs.iterations; i++) {
      writeLines(concatenateStr('Starting iteration ', i+1));
      iteration(executionState);
      let pctComplete = i/executionState.config.prefs.iterations;
      let pctWhole = Math.ceil(pctComplete * 100);
      progress.refresh(pctComplete);
      updateProgress(concatenateStr(progress.bar, ' ', pctWhole, '% ', i+1, ' of ',
         executionState.config.prefs.iterations));
   }

   var end = getImageSnapshotStr(imageSnapshot(executionState.view.image));
   writeLines('Final results:', concatenateStr('Before: ', start),
      concatenateStr('After: ', end));

   progress.refresh(1);
   updateProgress(progress.bar, ' Done.');

   writeLines('Done');

   executionState.view.window.bringToFront();
}

function nlsDialog(executionState)
{
   // Add all properties and methods of the core Dialog object to this object.
   this.__base__ = Dialog;
   this.__base__();

   var dlg = this;
   prepareDialog(dlg);
   this.execState = executionState;
   this.progressBar = createProgressLabel(dlg);
   dlg.updateProgress('Not started');
   executionState.updateProgress = dlg.updateProgress;

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

   this.foregroundPreview = createBoundCheckbox(dlg, 'previewForeground',
      dlg.execState.config);

   this.backgroundPreview = createBoundCheckbox(dlg, 'previewBackground',
      dlg.execState.config);

   // main settings
   this.foregroundSlider = createBoundNumericControl(dlg, 'foregroundFactor',
      dlg.execState.config, { low: 0, high: 100 });

   this.backgroundSlider = createBoundNumericControl(dlg, 'backgroundFactor',
      dlg.execState.config, { low: 0, high: 100 });

   this.previewButton = createPushButton(dlg, {
      icon: ":/process-interface/execute.png",
      text: "Preview curves",
      fn: function () {
         var curves = getCurvesTransformation(dlg.execState,
            dlg.execState.config.prefs.previewForeground);
         if (curves) {
            curves.launchInterface();
         }
         with (dlg.execState.config.prefs) {
            previewForeground = false;
            previewBackground = false;
            dlg.foregroundPreview.checked = false;
            dlg.backgroundPreview.checked = false;
         }
         dlg.previewButton.enabled = false;
      }
   });

   this.previewButton.enabled = dlg.execState.config.prefs.previewForeground ||
      dlg.execState.config.prefs.previewBackground;

   this.foregroundPreview.onCheck = chainFn(
      dlg.foregroundPreview,
      'onCheck',
      function (val) {
         if (val) {
            dlg.backgroundPreview.checked = false;
            dlg.previewButton.enabled = true;
         }
         else {
            dlg.previewButton.enabled = dlg.backgroundPreview.checked;
         }
      });

   this.backgroundPreview.onCheck = chainFn(
      dlg.backgroundPreview,
      'onCheck',
      function (val) {
         if (val) {
            dlg.foregroundPreview.checked = false;
            dlg.previewButton.enabled = true;
         }
         else {
            dlg.previewButton.enabled = dlg.foregroundPreview.checked;
         }
      });

   this.foregroundSlider.onValueUpdated = chainFn(
      dlg.foregroundSlider,
      'onValueUpdated',
      function (val) {
         dlg.foregroundPreview.enabled = val > 0;
      });

   this.backgroundSlider.onValueUpdated = chainFn(
      dlg.backgroundSlider,
      'onValueUpdated',
      function (val) {
         dlg.backgroundPreview.enabled = val > 0;
      });

   dlg.execState.config.funcs.previewForeground.reset = function () {
      dlg.foregroundPreview.enabled = dlg.execState.config.prefs.foregroundFactor > 0;
      dlg.previewButton.enabled = dlg.execState.config.prefs.previewForeground ||
         dlg.execState.config.prefs.previewBackground;
   };

   dlg.execState.config.funcs.previewBackground.reset = function () {
      dlg.backgroundPreview.enabled = dlg.execState.config.prefs.backgroundFactor > 0;
      dlg.previewButton.enabled = dlg.execState.config.prefs.previewForeground ||
         dlg.execState.config.prefs.previewBackground;
   };

	this.iterationsSlider = createBoundNumericControl(dlg, 'iterations',
      dlg.execState.config, { low: 1, high: 1000 });

   this.buttonSizer = createToolbar(this, dlg.execState.config, {
      newInstanceIcon: true,
      applyIcon: true,
      applyFn: function () {
         doStretch(dlg.execState);
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
      add(dlg.foregroundSlider);
      add(dlg.foregroundPreview);
      add(dlg.backgroundSlider);
      add(dlg.backgroundPreview);
      add(dlg.previewButton);
      add(dlg.iterationsSlider);
      add(dlg.progressBar);
      add(dlg.buttonSizer);
   }
}

nlsDialog.prototype = new Dialog;

function main() {

   let executionState = {
      config: createSettingsManager([

         {  setting: "foregroundFactor",
            dataType: DataType_Int16,
            defaultValue: 2,
            label: "Foreground factor:",
            precision: 1,
            tooltip: "Scale from 0 to 100 for how intense each stretch is for the foreground.",
            range: { low: 0, high: 100 }
         },
         {
            setting: "previewForeground",
            dataType: DataType_Boolean,
            defaultValue: false,
            label: "Preview foreground curve",
            tooltip: "Launch the <b>CurvesTransformation</b> interface to preview the curve.",
            persist: false
         },
         {
            setting: "backgroundFactor",
            dataType: DataType_Int16,
            defaultValue: 10,
            label: "Background factor:",
            precision: 1,
            tooltip: "Scale from 0 to 100 for how intense each stretch is for the background.",
            range: { low: 0, high: 100 }
         },
          {
            setting: "previewBackground",
            dataType: DataType_Boolean,
            defaultValue: false,
            label: "Preview background curve",
            tooltip: "Launch the <b>CurvesTransformation</b> interface to preview the curve.",
            persist: false
         },
         {
            setting: "iterations",
            dataType: DataType_Int16,
            defaultValue: 10,
            label: "Iterations:",
            precision: 1,
            tooltip: "Iterations to apply (1 - 1000).",
            range: { low: 1, high: 1000 }
         }
      ])
   };

   executionState.config.init();

   writeLines(concatenateStr('v', VERSION, ' invoked'));

   if ( Parameters.isGlobalTarget || Parameters.isViewTarget ) {
      executionState.config.loadParameters();
   }

   if (Parameters.isViewTarget) {
      executionState.view = Parameters.targetView;
      doStretch(executionState);
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
      let dialog = new nlsDialog(executionState);
      dialog.execute();
   }
}

main();
