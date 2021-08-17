/*

template.js: Minimal template for Deep Sky Workflows
================================================================================

This script is intended as a starting reference for new scripts.
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

/*
#feature-id  DeepSkyWorkflows > Template
*/

#define TITLE "Template"

#ifndef FEATURE
#define FEATURE "template"
#endif


#ifndef DEBUG_TEMPLATE
#define DEBUG_TEMPLATE false
#endif

#include "deepSkyCommon.js"

function tDialog() {

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

   this.checkbox = ds.ui.createBoundCheckbox(this, 'checked');
   this.slider = ds.ui.createBoundNumericControl(this, 'sliderVal');

   this.alertButton = ds.ui.createPushButton({
      icon: ":/process-interface/execute.png",
      text: "Alert template",
      fn: function () {
         ds.features[FEATURE].engine.alert(
            executionState.config.prefs.checked);
      }
   });

   this.alertButton.enabled = executionState.config.prefs.checked;

   this.checkbox.onCheck = util.chainFn(
      dialog.checkbox,
      'onCheck',
      function (val) {
         dialog.alertButton.enabled = !!val;
         dialog.alertButton.update();
      }
   );
   
   this.slider.onValueUpdated = util.chainFn(
      dialog.slider,
      'onValueUpdated',
      function (val) {
         dialog.updateProgress(val.toString());
      });

   this.buttonSizer = ds.ui.createToolbar({
      newInstanceIcon: true,
      applyIcon: true,
      applyFn: function () {
         ds.features[FEATURE].engine.alert('And it is running.');
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
      add(dialog.checkbox);
      add(dialog.slider);
      add(dialog.alertButton);
      add(dialog.progressBar);
      add(dialog.buttonSizer);
   }
}

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_TEMPLATE);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, {

      alert: function (msg) {
         this.debugLn('alert called with parameter', msg.toString());
         ds.ui.showDialog('Alert', msg);
         this.executionState.lastMessage = msg.toString();
         this.engine.showInterop();
      },

      showInterop: function () {
         this.debugLn("showInterop invoked.");
         const executionState = ds.getExecutionState();
         this.debugLn("last message was:", executionState.lastMessage);
      }
   });

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
      {
         setting: "checked",
         dataType: DataType_Boolean,
         defaultValue: true,
         label: "Non-persisted checked state:",
         tooltip: "Check to check it",
         persist: false
      },
      {
         setting: "sliderVal",
         dataType: DataType_Int16,
         defaultValue: 50,
         label: "Slider value:",
         precision: 1,
         tooltip: "Scale from 1 to 150 for values.",
         range: { low: 1, high: 150 }
      }
   ],
      ds.features[FEATURE].engine.alert,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(tDialog);
      },
      FEATURE,
      false);

   bootstrap();

})(deepSky);
