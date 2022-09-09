/*

ui.js: Star Trail Magic.
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

#script-id StarTrailsUI

function starTrailsDialog() {
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

    this.progressiveCheckbox = ds.ui.createBoundCheckbox(
        this,
        "progressive");

    this.stepSizeSlider =
        ds.ui.createBoundNumericControl(
            this,
            'stepSize');

    this.stepSizeSlider.enabled = executionState.config.prefs.progressive ||
        executionState.config.prefs.arcs;

    this.arcsCheckbox = ds.ui.createBoundCheckbox(
            this,
            "arcs");
    
    this.arcSizeSlider =
        ds.ui.createBoundNumericControl(
            this,
            'arcSize');
    this.arcSizeSlider.enabled = executionState.config.prefs.arcs;

    this.progressiveCheckbox.onCheck = util.chainFn(
        dialog.progressiveCheckbox,
        "onCheck",
        function (val) {
            dialog.stepSizeSlider.enabled = val || !!dialog.arcSizeSlider.checked;
            if (val) {
                dialog.arcSizeSlider.enabled = false;
                dialog.arcsCheckbox.checked = false;
            }
        }
    );
    
    this.arcsCheckbox.onCheck = util.chainFn(
        dialog.arcsCheckbox,
        "onCheck",
        function (val) {
            dialog.arcSizeSlider.enabled = val;
            if (val) {
                dialog.progressiveCheckbox.checked = false;               
            }
            dialog.stepSizeSlider.enabled = val || !!dialog.progressiveCheckbox.checked;                        
        });

    this.trailSettings = ds.ui.createVerticalGroupBox(
        this,
        "Trail settings",
        dialog.progressiveCheckbox,
        dialog.stepSizeSlider,
        dialog.arcsCheckbox,
        dialog.arcSizeSlider);

    this.run_Button = new PushButton( this );
    this.run_Button.text = "Start";
    this.run_Button.toolTip = "<p>Start generating star trails.</p>";
    this.run_Button.onClick = function() {
        if (ds.features[FEATURE].engine.validate()) {
            dialog.run_Button.enabled = false;
            executionState.config.closeOnExit = true;
            executionState.updateProgress = dialog.updateProgress;
            ds.features[FEATURE].engine.doStarTrails(executionState);
            executionState.config.saveSettings();
        }
        else {
            executionState.config.closeOnExit = false;
        }
    };
    
    // main settings
    this.buttonSizer = ds.ui.createToolbar({
        newInstanceIcon: true,
        applyIcon: false,
        resetIcon: true
    });

    this.target_List = new TreeBox( this );
    this.target_List.alternateRowColor = true;
    this.target_List.setScaledMinSize( 500, 200 );
    this.target_List.numberOfColumns = 1;
    this.target_List.headerVisible = false;

    for ( var i = 0; i < executionState.targetImages.length; ++i )
    {
        var node = new TreeBoxNode( this.target_List );
        node.checkable = true;
        node.checked = true;
        node.setText( 0, executionState.targetImages[i] );
    }

    this.targetAdd_Button = new PushButton( this );
    this.targetAdd_Button.text = "Add";
    this.targetAdd_Button.toolTip = "<p>Add timelapse images.</p>";
    this.targetAdd_Button.onClick = function()
    {
        var ofd = new OpenFileDialog;
        ofd.multipleSelections = true;
        ofd.caption = "Select timelapse images";
        ofd.loadImageFilters();

        if ( ofd.execute() )
            for ( var i = 0; i < ofd.fileNames.length; ++i )
            {
                var node = new TreeBoxNode( dialog.target_List );
                node.checkable = true;
                node.checked = true;
                node.setText( 0, ofd.fileNames[i] );
                executionState.targetImages.push( ofd.fileNames[i] );
            }
    };

    this.targetClear_Button = new PushButton( this );
    this.targetClear_Button.text = "Clear";
    this.targetClear_Button.toolTip = "<p>Clear the list of timelapse images.</p>";
    this.targetClear_Button.onClick = function()
    {
        dialog.target_List.clear();
        executionState.targetImages.length = 0;
    };

    this.targetDisableAll_Button = new PushButton( this );
    this.targetDisableAll_Button.text = "Disable All";
    this.targetDisableAll_Button.toolTip = "<p>Disable all timelapse images.</p>";
    this.targetDisableAll_Button.onClick = function()
    {
        for ( var i = 0; i < dialog.target_List.numberOfChildren; ++i )
            dialog.target_List.child( i ).checked = false;
    };

    this.targetEnableAll_Button = new PushButton( this );
    this.targetEnableAll_Button.text = "Enable All";
    this.targetEnableAll_Button.toolTip = "<p>Enable all timelapse images.</p>";
    this.targetEnableAll_Button.onClick = function()
    {
        for ( var i = 0; i < dialog.target_List.numberOfChildren; ++i )
            dialog.target_List.child( i ).checked = true;
    };

    this.targetRemoveDisabled_Button = new PushButton( this );
    this.targetRemoveDisabled_Button.text = "Remove Disabled";
    this.targetRemoveDisabled_Button.toolTip = "<p>Remove all disabled timelapse images.</p>";
    this.targetRemoveDisabled_Button.onClick = function()
    {
        executionState.targetImages.length = 0;
        for ( var i = 0; i < dialog.target_List.numberOfChildren; ++i )
            if ( dialog.target_List.child( i ).checked )
                executionState.targetImages.push( dialog.target_List.child( i ).text( 0 ) );
        for ( var i = dialog.target_List.numberOfChildren; --i >= 0; )
            if ( !dialog.target_List.child( i ).checked )
                dialog.target_List.remove( i );
    };

    this.parseFiles =  function() {
        executionState.targetImages.length = 0;
        for ( var i = 0; i < dialog.target_List.numberOfChildren; ++i ) {
            if ( dialog.target_List.child( i ).checked ) {
                executionState.targetImages.push( dialog.target_List.child( i ).text( 0 ) );
            }
        }        
    };

    this.targetButtons_Sizer = new HorizontalSizer;
    this.targetButtons_Sizer.spacing = 4;
    this.targetButtons_Sizer.add( this.targetAdd_Button );
    this.targetButtons_Sizer.addStretch();
    this.targetButtons_Sizer.add( this.targetClear_Button );
    this.targetButtons_Sizer.addStretch();
    this.targetButtons_Sizer.add( this.targetDisableAll_Button );
    this.targetButtons_Sizer.add( this.targetEnableAll_Button );
    this.targetButtons_Sizer.add( this.targetRemoveDisabled_Button );

    this.target_GroupBox = new GroupBox( this );
    this.target_GroupBox.title = "Timelapse Images";
    this.target_GroupBox.sizer = new VerticalSizer;
    this.target_GroupBox.sizer.margin = 4;
    this.target_GroupBox.sizer.spacing = 4;
    this.target_GroupBox.sizer.add( this.target_List, 100 );
    this.target_GroupBox.sizer.add( this.targetButtons_Sizer );
    
    this.output_Edit = new Edit( this );
    this.output_Edit.readOnly = true;
    this.output_Edit.text = executionState.outputDirectory || "";
    this.output_Edit.toolTip = "<p>If specified, all star trail images will be written to the output directory.</p>";

    this.outputSelect_Button = new PushButton( this );
    this.outputSelect_Button.text = "Select";
    this.outputSelect_Button.toolTip = "<p>Select the output directory.</p>";
    this.outputSelect_Button.onClick = function()
    {
        var gdd = new GetDirectoryDialog;
        gdd.initialPath = executionState.outputDirectory || "";
        gdd.caption = "Select Output Directory";

        if ( gdd.execute() )
        {
            executionState.outputDirectory = gdd.directory;
            dialog.output_Edit.text = executionState.outputDirectory;
        }
    };

    this.outputClear_Button = new PushButton( this );
    this.outputClear_Button.text = "Clear";
    this.outputClear_Button.toolTip = "<p>Clear the output directory.</p>";
    this.outputClear_Button.onClick = function()
    {
        executionState.outputDirectory = "";
        dialog.output_Edit.text = "";        
    };

    this.output_GroupBox = new GroupBox( this );
    this.output_GroupBox.title = "Output Directory";
    this.output_GroupBox.sizer = new HorizontalSizer;
    this.output_GroupBox.sizer.margin = 4;
    this.output_GroupBox.sizer.spacing = 4;
    this.output_GroupBox.sizer.add( this.output_Edit, 100 );
    this.output_GroupBox.sizer.add( this.outputSelect_Button );
    this.output_GroupBox.sizer.add( this.outputClear_Button );
    
    this.sizer = new VerticalSizer(this);
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(this.lblHeadLine);
    this.sizer.add(this.lblCopyright);
    this.sizer.add(this.target_GroupBox);
    this.sizer.add(this.trailSettings);
    this.sizer.add(this.output_GroupBox);
    this.sizer.add(this.progressArea); 
    this.sizer.add(this.run_Button);   
    this.sizer.add(this.buttonSizer);

    executionState.config.prefs.progressive = this.progressiveCheckbox.checked;
    executionState.config.prefs.arcs = this.arcsCheckbox.checked;
}
