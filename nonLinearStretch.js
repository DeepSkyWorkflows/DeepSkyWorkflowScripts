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
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 * mailTo:deepskyworkflows@gmail.com
 *
 */

#feature-id  DeepSkyWorkflows > NonLinearStretch

#define TITLE "Non-Linear Stretch"

#ifndef FEATURE
#define FEATURE "nonLinearStretch"
#endif


#ifndef DEBUG_NLS
#define DEBUG_NLS false
#endif

#include "deepSkyCommon.js"

function nlsDialog() {

   const dialog = this;
   const ds = dialog.ds;
   const util = ds.utilities;
   const executionState = ds.getExecutionState();

   this.progressBar = ds.ui.createProgressLabel();
   dialog.updateProgress('Not started');

   executionState.updateProgress = dialog.updateProgress;

   // ------------------------------------------------------------------------
   // GUI
   // ------------------------------------------------------------------------

   this.lblHeadLine = new Label(this);
   with (this.lblHeadLine) {
      useRichText = true;
      text = util.concatenateStr('<b>', TITLE, ' v', VERSION, '</b>');
   }

   // my copyright
   this.lblCopyright = new Label(this);
   this.lblCopyright.text = "© 2021, Jeremy Likness";

   this.foregroundPreview = ds.ui.createBoundCheckbox(this, 'previewForeground');

   this.backgroundPreview = ds.ui.createBoundCheckbox(this, 'previewBackground');

   // main settings
   this.foregroundSlider = ds.ui.createBoundNumericControl(this, 'foregroundFactor');

   this.backgroundSlider = ds.ui.createBoundNumericControl(this, 'backgroundFactor');

   this.previewButton = ds.ui.createPushButton({
      icon: ":/process-interface/execute.png",
      text: "Preview curves",
      fn: function () {
         let curves = ds.features[FEATURE].engine.getCurvesTransformation(
            executionState.config.prefs.previewForeground);
         if (curves) {
            curves.launchInterface();
         }
         with (executionState.config.prefs) {
            previewForeground = false;
            previewBackground = false;
            dialog.foregroundPreview.checked = false;
            dialog.backgroundPreview.checked = false;
         }
         dialog.previewButton.enabled = false;
      }
   });

   this.previewButton.enabled = executionState.config.prefs.previewForeground ||
      executionState.config.prefs.previewBackground;

   this.foregroundPreview.onCheck = util.chainFn(
      dialog.foregroundPreview,
      'onCheck',
      function (val) {
         if (val) {
            dialog.backgroundPreview.checked = false;
            dialog.previewButton.enabled = true;
         }
         else {
            dialog.previewButton.enabled = dialog.backgroundPreview.checked;
         }
      });

   this.backgroundPreview.onCheck = util.chainFn(
      dialog.backgroundPreview,
      'onCheck',
      function (val) {
         if (val) {
            dialog.foregroundPreview.checked = false;
            dialog.previewButton.enabled = true;
         }
         else {
            dialog.previewButton.enabled = dialog.foregroundPreview.checked;
         }
      });

   this.foregroundSlider.onValueUpdated = util.chainFn(
      dialog.foregroundSlider,
      'onValueUpdated',
      function (val) {
         dialog.foregroundPreview.enabled = val > 0;
      });

   this.backgroundSlider.onValueUpdated = util.chainFn(
      dialog.backgroundSlider,
      'onValueUpdated',
      function (val) {
         dialog.backgroundPreview.enabled = val > 0;
      });

   executionState.config.funcs.previewForeground.reset = function () {
      dialog.foregroundPreview.enabled = executionState.config.prefs.foregroundFactor > 0;
      dialog.previewButton.enabled = executionState.config.prefs.previewForeground ||
         executionState.config.prefs.previewBackground;
   };

   executionState.config.funcs.previewBackground.reset = function () {
      dialog.backgroundPreview.enabled = executionState.config.prefs.backgroundFactor > 0;
      dialog.previewButton.enabled = executionState.config.prefs.previewForeground ||
         executionState.config.prefs.previewBackground;
   };

   this.iterationsSlider = ds.ui.createBoundNumericControl(
      this,
      'iterations',
      { low: 1, high: 1000 });

   this.buttonSizer = ds.ui.createToolbar({
      newInstanceIcon: true,
      applyIcon: true,
      applyFn: function () {
         ds.features[FEATURE].engine.doStretch();
         ds.features[FEATURE].executionState.config.saveSettings();
      },
      resetIcon: true
   });

   this.sizer = new VerticalSizer(this);
   with (this.sizer) {
      margin = 6;
      spacing = 4;
      add(dialog.lblHeadLine);
      add(dialog.lblCopyright);
      add(dialog.foregroundSlider);
      add(dialog.foregroundPreview);
      add(dialog.backgroundSlider);
      add(dialog.backgroundPreview);
      add(dialog.previewButton);
      add(dialog.iterationsSlider);
      add(dialog.progressBar);
      add(dialog.buttonSizer);
   }
}

(function (ds) {

   let util = ds.utilities;

   ds.debug.register(FEATURE, DEBUG_NLS);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, {

      getCurvesTransformation: function (up) {

         this.debugLn('getCurvesTransformation called with parameter', up);
         const executionState = ds.getExecutionState();

         if (up && executionState.config.prefs.foregroundFactor === 0) {
            return null;
         }

         if (up === false && executionState.config.prefs.backgroundFactor === 0) {
            return null;
         }

         let aggressiveness = up ? executionState.config.prefs.foregroundFactor :
            executionState.config.prefs.backgroundFactor;

         let pctAggressive = aggressiveness / 100;
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
      },

      createMask: function () {
         this.debugLn("createMask invoked.");
         const executionState = ds.getExecutionState();
         ds.engine.extractLuminance('_stretch');
         const mask = ImageWindow.windowById(executionState.channels[0][1]).mainView;
         return mask;
      },

      iteration: function () {

         this.debugLn('iteration invoked.');

         console.writeln('Generating mask for iteration...');
         let executionState = ds.getExecutionState();

         var start = ds.engine.getImageSnapshotStr(
            ds.engine.imageSnapshot(executionState.view.image));

         const mask = this.engine.createMask();

         util.writeLines(util.concatenateStr('Generated mask ', mask.id));

         var curves = this.engine.getCurvesTransformation(true);

         if (curves !== null) {
            console.writeln('Increasing foreground...');

            executionState.view.window.mask = mask.window;
            executionState.view.window.maskEnabled = true;
            executionState.view.window.maskInverted = false;

            curves.executeOn(executionState.view, true);
         }

         curves = this.engine.getCurvesTransformation(false);

         if (curves !== null) {
            console.writeln('Decreasing background...');

            executionState.view.window.mask = mask.window;
            executionState.view.window.maskEnabled = true;
            executionState.view.window.maskInverted = true;

            curves.executeOn(executionState.view, true);
         }

         mask.window.forceClose();

         var end = ds.engine.getImageSnapshotStr(
            ds.engine.imageSnapshot(
               executionState.view.image));

         util.writeLines('Iteration results:', util.concatenateStr('Before: ', start),
            util.concatenateStr('After: ', end));
      },

      // main method
      doStretch: function () {

         this.debugLn('doStretch invoked.');

         const executionState = ds.getExecutionState();
         
         let sourceViewId = executionState.view.id;

         util.writeLines(util.concatenateStr('processing view ', sourceViewId));

         // make sure we have RGB
         if (executionState.view.image.numberOfChannels !== 3) {
            util.writeLines('ERROR: view is not RGB');
            return;
         }

         var start = ds.engine.getImageSnapshotStr(
            ds.engine.imageSnapshot(
               ds.features[FEATURE].executionState.view.image));

         let progress = ds.ui.createProgressBar(15);

         let updateProgress = executionState.updateProgress || function () { };

         updateProgress(util.concatenateStr(progress.bar, ' 0% Starting...'));

         for (var i = 0; i < executionState.config.prefs.iterations; i++) {
            util.writeLines(util.concatenateStr('Starting iteration ', i + 1, ' of ', executionState.config.prefs.iterations));
            this.engine.iteration();
            let pctComplete = (i+1) / executionState.config.prefs.iterations;
            let pctWhole = Math.ceil(pctComplete * 100);
            progress.refresh(pctComplete);
            updateProgress(util.concatenateStr(progress.bar, ' ', pctWhole, '% ', i + 1, ' of ',
               executionState.config.prefs.iterations));
         }

         var end = ds.engine.getImageSnapshotStr(
            ds.engine.imageSnapshot(executionState.view.image));

         util.writeLines('Final results:', util.concatenateStr('Before: ', start),
            util.concatenateStr('After: ', end));

         progress.refresh(100);
         updateProgress(progress.bar, ' Done.');

         util.writeLines('Done');

         executionState.view.window.bringToFront();
      }
   });

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
      {
         setting: "foregroundFactor",
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

   ],
      ds.features[FEATURE].engine.doStretch,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(nlsDialog);
      },
      FEATURE,
      false);

   bootstrap();

})(deepSky);
