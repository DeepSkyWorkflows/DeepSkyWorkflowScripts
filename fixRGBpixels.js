/*

fixRGBpixels.js: Clean up noisy red, green, and blue pixels.
================================================================================

Sometimes DSLR generates random noise in the form of red, green, and blue pixels. This script cleans
them up by finding pixels that deviate from the other two channels and normalizing them.
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

#feature-id    DeepSkyWorkflows > FixRGBPixels

#define TITLE "Fix RGB Pixels"
#define FEATURE "fixRGBPixels"
#define DEBUG_FRP false

#include "deepSkyCommon.js"

let fixRGBEngine = (function (ds) {

   return {
      doFix: function () {

         const executionState = ds.getExecutionState();
         const util = ds.utilities;
         let sourceViewId = executionState.view.id;

         util.writeLines(util.concatenateStr('processing view ', sourceViewId));

         let strength = (executionState.config.prefs.strength - 1.0) / 9.0;
         strength = 1.0 - strength;
         let ratio = 2.0 + (strength * 8.0);
         console.writeln(util.concatenateStr('Using ratio of ', ratio));

         var P = new PixelMath;
         P.expression = "iif(($T[0]/$T[1])>=ratio&&($T[0]/$T[2])>=ratio,mean($T[1],$T[2]),$T[0]);";
         P.expression1 = "iif(($T[1]/$T[0])>=ratio&&($T[1]/$T[2])>=ratio,mean($T[0],$T[2]),$T[1]);";
         P.expression2 = "iif(($T[2]/$T[0])>=ratio&&($T[2]/$T[1])>=ratio,mean($T[0],$T[1]),$T[2]);";
         P.expression3 = "";
         P.useSingleExpression = false;
         P.symbols = "ratio = " + ratio + ";";
         P.clearImageCacheAndExit = false;
         P.cacheGeneratedImages = false;
         P.generateOutput = true;
         P.singleThreaded = false;
         P.optimization = true;
         P.use64BitWorkingImage = false;
         P.rescale = false;
         P.rescaleLower = 0;
         P.rescaleUpper = 1;
         P.truncate = true;
         P.truncateLower = 0;
         P.truncateUpper = 1;
         P.createNewImage = executionState.config.prefs.createNewInstance;
         P.showNewImage = true;
         P.newImageId = executionState.config.prefs.createNewInstance ? util.getNewName(executionState.view.id, '_fixed') : "";
         P.newImageWidth = 0;
         P.newImageHeight = 0;
         P.newImageAlpha = false;
         P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
         P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
         P.executeOn(executionState.view);

         util.writeLines('Done');
      }
   };
})(deepSky);

function frpDialog() {

   let dialog = this;
   let ds = dialog.ds;
   let util = ds.utilities;
   let executionState = ds.getExecutionState();
  
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

   this.createNewInstance = ds.ui.align(ds.ui.createBoundCheckbox(dialog, 'createNewInstance'),
      ds.ui.ALIGN_RIGHT);

   // main settings
   this.strengthSlider = ds.ui.createBoundNumericControl(dialog, 'strength',
      { low: 1, high: 10 });

   this.strengthSlider.minWidth = 400;

   this.settings = ds.ui.createVerticalGroupBox(
      dialog,
      "Settings",
      dialog.strengthSlider,
      dialog.createNewInstance);

   this.buttonSizer = ds.ui.createToolbar({
      newInstanceIcon: true,
      applyIcon: true,
      applyFn: function () {
         ds.features[FEATURE].engine.doFix();
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
      add(dialog.buttonSizer);
   }
}

(function (ds) {

   ds.debug.register(FEATURE, DEBUG_FRP);
   ds.debug[FEATURE].debugLn(TITLE, 'debugging is on.');

   ds.features.register(FEATURE, TITLE, fixRGBEngine);

   ds.debug[FEATURE].debugLn(
      'Registered feature: ',
      JSON.stringify(ds.features[FEATURE]));

   let bootstrap = ds.engine.bootstrap([
      {
         setting: "strength",
         dataType: DataType_Int16,
         defaultValue: 10,
         label: "Strength:",
         precision: 0,
         tooltip: "Scale from 1 to 10 for how aggressive. 1 translates to a 10:1 ratio, 10 is a 2:1 ratio",
         range: { low: 1, high: 10 }
      },
      {
         setting: "createNewInstance",
         dataType: DataType_Boolean,
         defaultValue: false,
         label: "Create new instance",
         tooltip: "Create a new instance or apply to existing image"
      }
   ],
      ds.features[FEATURE].engine.doFix,
      function () {
         ds.debug[FEATURE].debugLn('New dialog requested.');
         return ds.ui.createDialog(frpDialog);
      },
      FEATURE,
      false);
   bootstrap();
})(deepSky);