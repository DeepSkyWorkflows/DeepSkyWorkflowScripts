/*

ui.js: Generate support for denoise.
================================================================================
This script implements the UI.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#script-id DeepDenoiseUI

function denoiseDialog() {
    let dialog = this;
    let ds = dialog.ds;
    let util = ds.utilities;
    let executionState = ds.getExecutionState();
    this.progressArea = ds.ui.createProgressLabel(dialog);
    executionState.updateProgress = function (msg) {
        util.writeLines(msg);
        dialog.updateProgress(msg);
    };

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

    this.applyToLuminanceCheckbox = ds.ui.createBoundCheckbox(
        this,
        "applyToLuminance");

    this.applyLuminanceFirstCheckbox = ds.ui.createBoundCheckbox(
            this,
            "applyLuminanceFirst");
    
    this.lumMaxThresholdSlider =
        ds.ui.createBoundNumericControl(
            this,
            'lumMaxThreshold');
    
    this.lumNumLayersSlider =
        ds.ui.createBoundNumericControl(
            this,
            'lumNumLayers');

    this.lumMaxAmountSlider =
        ds.ui.createBoundNumericControl(
            this,
            'lumMaxAmount');

    this.applyToLuminanceCheckbox.onCheck = util.chainFn(
        dialog.applyToLuminanceCheckbox,
        "onCheck",
        function (val) {
            dialog.applyLuminanceFirstCheckbox.enabled = 
                val && dialog.applyToChrominanceCheckbox.checked === true;
            dialog.applyToChrominanceCheckbox.enabled = val;            
            dialog.lumMaxThresholdSlider.enabled = val;
            dialog.lumNumLayersSlider.enabled = val;
            dialog.lumMaxAmountSlider.enabled = val;
        });

    this.luminanceSettings = ds.ui.createVerticalGroupBox(
        this,
        "Luminance settings",
        dialog.applyToLuminanceCheckbox,
        dialog.lumMaxThresholdSlider,
        dialog.lumNumLayersSlider,
        dialog.lumMaxAmountSlider,
        dialog.applyLuminanceFirstCheckbox);

    this.applyToChrominanceCheckbox = ds.ui.createBoundCheckbox(
        this,
        "applyToChrominance");

    this.chromMaxThresholdSlider =
        ds.ui.createBoundNumericControl(
            this,
            'chromMaxThreshold');
    
    this.chromNumLayersSlider =
        ds.ui.createBoundNumericControl(
            this,
            'chromNumLayers');

    this.chromMaxAmountSlider =
        ds.ui.createBoundNumericControl(
            this,
            'chromMaxAmount');

    this.applyToChrominanceCheckbox.onCheck = util.chainFn(
        dialog.applyToChrominanceCheckbox,
        "onCheck",
        function (val) {
            dialog.applyLuminanceFirstCheckbox.enabled = 
                val && dialog.applyToLuminanceCheckbox.checked === true;
            dialog.applyToLuminanceCheckbox.enabled = val;            
            dialog.chromMaxThresholdSlider.enabled = val;
            dialog.chromNumLayersSlider.enabled = val;
            dialog.chromMaxAmountSlider.enabled = val;
        });

    this.chrominanceSettings = ds.ui.createVerticalGroupBox(
        this,
        "Chrominance settings",
        dialog.applyToChrominanceCheckbox,
        dialog.chromMaxThresholdSlider,
        dialog.chromNumLayersSlider,
        dialog.chromMaxAmountSlider);
    
    // main settings
    this.buttonSizer = ds.ui.createToolbar({
        newInstanceIcon: true,
        applyIcon: true,
        applyFn: function () {
            if (ds.features[FEATURE].engine.validate()) {
                executionState.config.closeOnExit = true;
                executionState.updateProgress = dialog.updateProgress;
                ds.features[FEATURE].engine.doDenoise(executionState);
                executionState.config.saveSettings();
            }
            else {
                executionState.config.closeOnExit = false;
            }
        },
        resetIcon: true
    });

    this.maskSlider = ds.ui.createBoundNumericControl(
        this,
        'maskStrength');

    this.sizer = new VerticalSizer(this);
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(this.lblHeadLine);
    this.sizer.add(this.lblCopyright);
    this.sizer.add(this.maskSlider);
    this.sizer.add(this.luminanceSettings);
    this.sizer.add(this.chrominanceSettings);
    this.sizer.add(this.progressArea);
    this.sizer.add(this.buttonSizer);
}
