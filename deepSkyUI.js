/*

deepSkyUI.js: User interface.
================================================================================

User interface helpers.
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

#include <pjsr/DataType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>

#include "deepSkyInit.js"

#define DEBUG_UI false

(function (ds) {

    ds.debug.register('ui', DEBUG_UI);
    ds.debug.ui.debugLn('UI debugging is on.');

    if (ds.ui) {
        return;
    }

    ds.ui = {

        showDialog: function (title, msg) {
            ds.debug.ui.debugLn("showDialog called with message", msg.toString());
            const mbox = new MessageBox(msg.toString(), title.toString(), StdIcon_Error, StdButton_Ok);
            mbox.execute();
        },

        ALIGN_LEFT: 0,
        ALIGN_CENTER: 1,
        ALIGN_RIGHT: 2,

        align: function (ctrl, alignment) {

            let container = new HorizontalSizer;

            if (alignment !== ds.ui.ALIGN_LEFT) {
                container.addStretch();
            }

            container.add(ctrl);

            if (alignment !== ds.ui.ALIGN_RIGHT) {
                container.addStretch();
            }

            return container;
        },

        createVerticalGroupBox: function () {

            let groupBox = new GroupBox(arguments[0]);

            with (groupBox) {
                sizer = new VerticalSizer;
                sizer.margin = 6;
                sizer.spacing = 4;
                title = arguments[1];
            }

            for (let arg = 2; arg < arguments.length; ++arg) {
                let val = arguments[arg];
                if (val === null) {
                    groupBox.sizer.addStretch();
                }
                else {
                    groupBox.sizer.add(val);
                }
            }

            return groupBox;
        },

        createHorizontalGroupBox: function () {

            let groupBox = new GroupBox(arguments[0]);

            with (groupBox) {
                sizer = new HorizontalSizer;
                sizer.margin = 6;
                sizer.spacing = 4;
                title = arguments[1];
            }

            for (let arg = 2; arg < arguments.length; ++arg) {
                let val = arguments[arg];
                if (val === null) {
                    groupBox.sizer.addStretch();
                }
                else {
                    groupBox.sizer.add(val);
                }
            }

            return groupBox;
        },

        bindResetToNumericControl: function (ctrl, setting) {
            const config = ds.getExecutionState().config;
            config.funcs[setting].reset = function () {
                ctrl.setValue(config.prefs[setting]);
                ctrl.update();
            }
        },

        createBoundNumericControl: function (parent, setting, sliderRange) {

            let ctrl = new NumericControl(parent);
            const config = ds.getExecutionState().config;

            const sliderRanges = sliderRange || { low: 0, high: 100 };
            
            with (ctrl) {
                label.text = config.funcs[setting].label;
                let range = config.funcs[setting].range;
                label.minWidth = 130;
                if (config.funcs[setting].tooltip) {
                    toolTip = config.funcs[setting].tooltip;
                }
                setRange(range.low, range.high);
                setPrecision(config.funcs[setting].precision);
                slider.setRange(sliderRanges.low, sliderRanges.high);
                slider.scaledMinWidth = 60;
                edit.scaledMinWidth = 60;
                setValue(config.prefs[setting]);
                bindings = function () {
                    this.setValue(config.prefs[setting]);
                }
                onValueUpdated = function (value) {
                    if (value < range.low || value > range.high) {
                        ctrl.setValue(config.prefs[setting]);
                    }
                    else {
                        config.prefs[setting] = value;
                    }
                }
                slider.onMousePress = function () {
                    parent.isSliding = true;
                }
                slider.onMouseRelease = function () {
                    parent.isSliding = false;
                }
            }

            config.funcs[setting].reset = function () {
                ctrl.setValue(config.prefs[setting]);
                ctrl.update();
            };

            return ctrl;
        },

        createBoundCheckbox: function (parent, setting, existingCheckbox) {
            const config = ds.getExecutionState().config;
            let checkbox = existingCheckbox || new CheckBox(parent);
            with (checkbox) {
                toolTip = config.funcs[setting].tooltip;
                text = config.funcs[setting].label;
                enabled = true;
                checked = config.prefs[setting];
                bindings = function () {
                    this.checked = config.prefs[setting];
                };
                onCheck = function (value) {
                    config.prefs[setting] = value;
                };
            }
            config.funcs[setting].reset = function () {
                checkbox.checked = config.prefs[setting];
                checkbox.update();
            }
            return checkbox;
        },

        createProgressBar: function (blocks) {
            let progress = {
                pct: 0,
                blocks: blocks,
                bar: '[' + ' '.repeat(blocks) + ']'
            };
            progress.refresh = function (pct) {
                progress.pct = pct;
                let completedBlocks = Math.floor(pct * progress.blocks);
                let remainingBlocks = progress.blocks - completedBlocks;
                if (remainingBlocks >= 0) {
                    progress.bar = '[' + '#'.repeat(completedBlocks) +
                        ' '.repeat(remainingBlocks) + ']';
                }
            };
            return progress;
        },

        createProgressLabel: function () {
            const dlg = ds.getDialog();
            let progress = new Label(dlg);
            progress.text = '0% Not started.';
            let progressArea = ds.ui.createHorizontalGroupBox(dlg, 'Progress', progress);
            dlg.updateProgress = function (msg) {
                progress.text = msg;
            }
            return progressArea;
        },

        createNewInstanceIcon: function () {
            const dlg = ds.getDialog();
            const config = ds.getExecutionState().config;
            let newInstanceButton = new ToolButton(dlg);
            with (newInstanceButton) {
                icon = dlg.scaledResource(":/process-interface/new-instance.png");
                setScaledFixedSize(20, 20);
                toolTip = "New Instance";
                onMousePress = function () {
                    this.hasFocus = true;
                    this.pushed = false;
                    with (this.dialog) {
                        config.saveParameters();
                        newInstance();
                    }
                };
            }
            return newInstanceButton;
        },

        createPushButton: function (btnconfig) {
            const dlg = ds.getDialog();
            let pushButton = new PushButton(dlg);
            pushButton.icon = dlg.scaledResource(btnconfig.icon);
            if (btnconfig.tooltip) {
                pushButton.toolTip = btnconfig.tooltip;
            }
            pushButton.text = btnconfig.text;
            pushButton.onMousePress = btnconfig.fn;
            return pushButton;
        },

        createApplyIcon: function (fn) {
            const dlg = ds.getDialog();
            const config = ds.getExecutionState().config;
            let okButton = new ToolButton(dlg);
            okButton.icon = dlg.scaledResource(":/process-interface/apply.png");
            okButton.setScaledFixedSize(20, 20);
            okButton.toolTip = "<p>Apply current settings to target and close.</p>"
            okButton.onMousePress = function () {
                if (dlg.runProcess) {
                    dlg.runProcess(fn);
                }
                else {
                    fn();
                }
                if (config.closeOnExit) {
                    dlg.ok();
                }
            };
            return okButton;
        },

        createResetIcon: function () {
            const dlg = ds.getDialog();
            const config = ds.getExecutionState().config;
            let resetButton = new ToolButton(dlg);
            with (resetButton) {
                icon = dlg.scaledResource(":/process-interface/reset.png");
                setScaledFixedSize(20, 20);
                toolTip = "Reset";
                onMousePress = function () {
                    this.hasFocus = true;
                    this.pushed = false;
                    config.reset();
                };
            }
            return resetButton;
        },

        createToolbar: function (toolbarSettings) {
            const dlg = ds.getDialog();
            const config = ds.getExecutionState().config;
            let settings = toolbarSettings || {};
            let buttonSizer = new HorizontalSizer(dlg);
            buttonSizer.spacing = 4;

            if (settings.newInstanceIcon === true) {
                buttonSizer.add(ds.ui.createNewInstanceIcon());
            }

            if (settings.applyIcon === true) {
                buttonSizer.add(ds.ui.createApplyIcon(settings.applyFn));
            }

            buttonSizer.addStretch();

            if (settings.resetIcon === true) {
                buttonSizer.add(ds.ui.createResetIcon());
            }

            return buttonSizer;
        },

        createDialog: function (dlgFn) {

            ds.debug.ui.debugLn(
                "createDialogInvoked for", 
                ds.activeFeature.title, 
                "version", 
                ds.version);

            let template = function () {
                this.__base__ = Dialog;
                this.__base__();
                this.ds = ds;
                ds.ui.prepareDialog(this);                
                (function (dialog) {
                    ds.getDialog = function () {
                        return dialog;
                    };
                })(this);
                dlgFn.apply(this);
            };

            template.prototype = new Dialog;            
            const dialog = new template;
            
            dialog.windowTitle = ds.utilities.concatenateStr(
                ds.activeFeature.title, 
                ' v', 
                ds.version);
            dialog.adjustToContents(); 
            
            return dialog;
        },

        prepareDialog: function (dlg) {
                        
            dlg.runProcess = function (fn) {
            
                ds.debug.utilities.debugLn('runProcess invoked.');

                let ctrls = [];
            
                for (let prop in dlg) {
                    if (dlg.hasOwnProperty(prop)) {
                        let ctrl = dlg[prop];
                        if (ctrl.enabled && ctrl.enabled === true) {
                            ctrls.push({ ctrl: ctrl, enabled: ctrl.enabled });
                            ctrl.enabled = false;
                            ctrl.update();
                        }
                    }
                }

                ds.debug.utilities.debugLn('Disabled', ctrls.length, 'controls for execution.')
            
                fn();
            
                ds.debug.utilities.debugLn('Restoring control states.');

                for (let idx = 0; idx < ctrls.length; idx++) {
                    let ctrlData = ctrls[idx];
                    ctrlData.ctrl.enabled = ctrlData.enabled;
                    ctrlData.ctrl.update();
                }
            }
        }
    };

})(deepSky);
