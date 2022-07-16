/*

ui.js: Generate support for deconvolution.
================================================================================
This script implements my workflow for deconvolution. It will create:

   1. An extracted luminance view for PSF generation
   2. A stretched luminance mask to support generation of other masks
   3. An advanced star mask using StarNet++
   4. A saturation mask to hide oversaturated stars from PSF generation
   5. A deconvolution support mask in case global de-ringing falls short

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

#script-id DeconUI

function gdsDialog() {
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

    this.extractLumCheckbox = ds.ui.createBoundCheckbox(
        this,
        "extractLum");

    this.extractLumCheckbox.onCheck = util.chainFn(
        dialog.extractLumCheckbox,
        "onCheck",
        function (val) {
            dialog.lumViewSelector.enabled = !val;
            if (val) {
                dialog.generateLumMaskCheckbox.checked = true;
                dialog.genMaskViewSelector.enabled = false;
            }
            else {
                dialog.genMaskViewSelector.enabled = !dialog.generateLumMaskCheckbox.checked;
            }
        });

    this.lblLumViewSelector = new Label(this);
    this.lblLumViewSelector.text = "Select existing luminance channel:";

    this.lumViewSelector = new ViewList(this);
    with (this.lumViewSelector) {
        enabled = !executionState.config.prefs.extractLum;
        toolTip = "Select the existing luminance channel";
        onViewSelected = function (value) {
            if (value.image.numberOfChannels === 1) {
                executionState.masks.lum = value;
            }
        }
        getAll();
    }

    this.generateLumMaskCheckbox = ds.ui.createBoundCheckbox(
        dialog,
        "generateLumMask");

    // my copyright
    this.lblLumMaskViewSelector = new Label(this);
    this.lblLumMaskViewSelector.text = "Select existing luminance mask:";

    this.generateLumMaskCheckbox.onCheck = util.chainFn(
        dialog.generateLumMaskCheckbox,
        "onCheck",
        function (val) {
            dialog.genMaskViewSelector.enabled = !val;
        });

    this.genMaskViewSelector = new ViewList(this);
    with (this.genMaskViewSelector) {
        enabled = !executionState.config.prefs.generateLumMask;
        toolTip = "Select the existing luminance mask";
        onViewSelected = function (value) {
            if (value.image.numberOfChannels === 1) {
                executionState.masks.lumMask = value;
            }
        }
        getAll();
    }

    this.luminanceSettings = ds.ui.createVerticalGroupBox(
        this,
        "Luminance masks",
        dialog.extractLumCheckbox,
        dialog.lblLumViewSelector,
        dialog.lumViewSelector,
        dialog.generateLumMaskCheckbox,
        dialog.lblLumMaskViewSelector,
        dialog.genMaskViewSelector);

    this.growSlider = ds.ui.createBoundNumericControl(
        this,
        'growIterations',
        { low: 0, high: 5 });

    this.blurCheckbox = ds.ui.createBoundCheckbox(
        this,
        "blurStars");

    this.starMaskSettings = ds.ui.createVerticalGroupBox(
        this,
        "StarMask settings",
        dialog.growSlider,
        null,
        dialog.blurCheckbox);

    // launchDynamicPSF
    this.saturationCheckbox = ds.ui.createBoundCheckbox(
        this,
        "generateSaturationMask");

    this.saturationLimitSlider =
        ds.ui.createBoundNumericControl(
            this,
            'saturationLimit',
            { low: 0, high: 100 });

    this.launchDynamicPSFCheckbox = ds.ui.createBoundCheckbox(
        this,
        "launchDynamicPSF");

    this.saturationCheckbox.onCheck = util.chainFn(
        dialog.saturationCheckbox,
        "onCheck",
        function (val) {
            dialog.saturationLimitSlider.enabled = val;
            dialog.launchDynamicPSFCheckbox.enabled = val;
            if (val === false) {
                dialog.launchDynamicPSFCheckbox.checked = false;
            }
        });

    this.PSFSettings = ds.ui.createVerticalGroupBox(
        this,
        "PSF settings",
        dialog.saturationCheckbox,
        dialog.saturationLimitSlider,
        dialog.launchDynamicPSFCheckbox);

    this.deconSupportCheckbox = ds.ui.createBoundCheckbox(
        this,
        "generateDeconSupport");

    this.launchDeconProcess = ds.ui.createBoundCheckbox(
        this,
        "launchDeconProcess");

    this.deconSettings = ds.ui.createVerticalGroupBox(
        this,
        "Decon settings",
        dialog.deconSupportCheckbox,
        dialog.launchDeconProcess);

    // main settings
    this.buttonSizer = ds.ui.createToolbar({
        newInstanceIcon: true,
        applyIcon: true,
        applyFn: function () {
            if (ds.features[FEATURE].engine.validate()) {
                executionState.config.closeOnExit = true;
                executionState.updateProgress = dialog.updateProgress;
                ds.features[FEATURE].engine.doDecon(executionState);
                executionState.config.saveSettings();
            }
            else {
                executionState.config.closeOnExit = false;
            }
        },
        resetIcon: true
    });

    this.sizer = new VerticalSizer(this);
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(this.lblHeadLine);
    this.sizer.add(this.lblCopyright);
    this.sizer.add(this.luminanceSettings);
    this.sizer.add(this.starMaskSettings);
    this.sizer.add(this.PSFSettings);
    this.sizer.add(this.deconSettings);
    this.sizer.add(this.progressArea);
    this.sizer.add(this.buttonSizer);
}
