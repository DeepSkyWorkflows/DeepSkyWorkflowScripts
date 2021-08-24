/*

uu.js: Simulation of the "Hubble palette."
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

function hubbleDialog() {

   let dialog = this;
   let ds = dialog.ds;
   let util = ds.utilities;
   let executionState = ds.getExecutionState();
   this.progressArea = ds.ui.createProgressLabel(dialog);
   executionState.updateProgress = function (msg) {
      util.writeLines(msg);
      dialog.updateProgress(msg);
   };

   this.lblHeadLine = new Label(this);
   with (this.lblHeadLine) {
      useRichText = true;
      text = util.concatenateStr('<b>', ds.activeFeature.title, ' v', ds.version, '</b>');
   }

   // my copyright
   this.lblCopyright = new Label(this);
   this.lblCopyright.text = "© 2021, Jeremy Likness";

   this.redLevelSlider = ds.ui.createBoundNumericControl(
      this,
      'redChannelStrength',
      { low: 0, high: 100 });

   this.otherLevelSlider = ds.ui.createBoundNumericControl(
      this,
      'otherChannelStrength',
      { low: 0, high: 100 });

   this.otherLevelSlider.enabled = false;
   this.otherLevelSlider.onChanges = function () {
      dialog.otherLevelSlider.setValue(1.0 - executionState.config.prefs.redChannelStrength);
      dialog.otherLevelSlider.update();
   };

   this.otherLevelSlider.onChanges();

   this.redLevelSlider.onValueUpdated = util.chainFn(
      dialog.redLevelSlider,
      "onValueUpdated",
      dialog.otherLevelSlider.onChanges);

   this.preserveOriginalCheckbox = ds.ui.createBoundCheckbox(
      this,
      "preserveOriginal");

   this.closeIntermediateImagesCheckbox = ds.ui.createBoundCheckbox(
      this,
      "closeIntermediateImages");

   this.createSyntheticRBChannelCheckbox = ds.ui.createBoundCheckbox(
      this,
      "createSyntheticRedBlueChannel");

   this.createSyntheticRBChannelCheckbox.onCheck = util.chainFn(
      dialog.createSyntheticRBChannelCheckbox,
      "onCheck",
      dialog.otherLevelSlider.onChanges);

   this.settings = ds.ui.createVerticalGroupBox(
      this,
      "Settings",
      this.preserveOriginalCheckbox,
      this.closeIntermediateImagesCheckbox,
      this.createSyntheticRBChannelCheckbox);

   this.levels = ds.ui.createVerticalGroupBox(
      this,
      "Channel blend",
      this.redLevelSlider,
      this.otherLevelSlider);

   this.buttonSizer = ds.ui.createToolbar({
      newInstanceIcon: true,
      applyIcon: true,
      applyFn: function () {
         ds.features[FEATURE].engine.doApply();
         executionState.config.saveSettings();
      },
      resetIcon: true
   });

   this.sizer = new VerticalSizer(this);
   with (this.sizer) {
      margin = 6;
      spacing = 4;
      add(dialog.lblHeadLine);
      add(dialog.lblCopyright);
      add(dialog.settings);
      add(dialog.levels);
      add(dialog.progressArea);
      add(dialog.buttonSizer);
   }
}
