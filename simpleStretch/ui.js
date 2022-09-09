/*

ui.js: Generate support for simple stretch.
================================================================================
This script implements the UI.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2022
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#script-id SimpleStretchUI

function stretchDialog() {
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
    this.lblCopyright.text = "© 2022, Jeremy Likness";

    this.backgroundSlider =
        ds.ui.createBoundNumericControl(
            this,
            'targetBackground');
    
    this.clippingSlider =
        ds.ui.createBoundNumericControl(
            this,
            'shadowsClipping');

    this.stretchSettings = ds.ui.createVerticalGroupBox(
        this,
        "Stretch settings",
        dialog.backgroundSlider,
        dialog.clippingSlider);

    // main settings
    this.buttonSizer = ds.ui.createToolbar({
        newInstanceIcon: true,
        applyIcon: true,
        applyFn: function () {
            if (ds.features[FEATURE].engine.validate()) {
                executionState.config.closeOnExit = true;
                executionState.updateProgress = dialog.updateProgress;
                ds.features[FEATURE].engine.doSimpleStretch(executionState);
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
    this.sizer.add(this.stretchSettings);
    this.sizer.add(this.progressArea);
    this.sizer.add(this.buttonSizer);
}
